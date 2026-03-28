// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from 'typescript/lib/tsserverlibrary';
import TemplateSourceHelper from './template-source-helper';
import ScriptSourceHelper from './script-source-helper';
import { isTagged, relative } from './nodes';
import TemplateContext from './template-context';
import TemplateSettings from './template-settings';
import Logger from './logger';
import { memoize } from './util/memoize';

class PlaceholderSubstituter {
    public static replacePlaceholders(
        typescript: typeof ts,
        settings: TemplateSettings,
        node: ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral
    ): string {
        const literalContents = node.getText().slice(1, -1);
        if (node.kind === typescript.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return literalContents;
        }

        return PlaceholderSubstituter.getSubstitutions(
            settings,
            literalContents,
            PlaceholderSubstituter.getPlaceholderSpans(node));
    }

    private static getPlaceholderSpans(node: ts.TemplateExpression) {
        const spans: Array<{ start: number, end: number }> = [];
        const stringStart = node.getStart() + 1;

        let nodeStart = node.head.end - stringStart - 2;
        for (const child of node.templateSpans.map(x => x.literal)) {
            const start = child.getStart() - stringStart + 1;
            spans.push({ start: nodeStart, end: start });
            nodeStart = child.getEnd() - stringStart - 2;
        }
        return spans;
    }

    private static getSubstitutions(
        settings: TemplateSettings,
        contents: string,
        locations: ReadonlyArray<{ start: number, end: number }>
    ): string {
        if (settings.getSubstitutions) {
            return settings.getSubstitutions(contents, locations);
        }

        const parts: string[] = [];
        let lastIndex = 0;
        for (const span of locations) {
            parts.push(contents.slice(lastIndex, span.start));
            parts.push(this.getSubstitution(settings, contents, span.start, span.end));
            lastIndex = span.end;
        }
        parts.push(contents.slice(lastIndex));
        return parts.join('');
    }

    private static getSubstitution(
        settings: TemplateSettings,
        templateString: string,
        start: number,
        end: number
    ): string {
        return settings.getSubstitution
            ? settings.getSubstitution(templateString, start, end)
            : 'x'.repeat(end - start);
    }
}

class StandardTemplateContext implements TemplateContext {
    constructor(
        public readonly typescript: typeof ts,
        public readonly fileName: string,
        public readonly node: ts.TemplateLiteral,
        private readonly helper: ScriptSourceHelper,
        private readonly templateSettings: TemplateSettings
    ) { }

    public toOffset(position: ts.LineAndCharacter): number {
        const docOffset = this.helper.getOffset(this.fileName,
            position.line + this.stringBodyPosition.line,
            position.line === 0 ? this.stringBodyPosition.character + position.character : position.character);
        return docOffset - this.stringBodyOffset;
    }

    public toPosition(offset: number): ts.LineAndCharacter {
        const docPosition = this.helper.getLineAndChar(this.fileName, this.stringBodyOffset + offset);
        return relative(this.stringBodyPosition, docPosition);
    }

    @memoize
    private get stringBodyOffset(): number {
        return this.node.getStart() + 1;
    }

    @memoize
    private get stringBodyPosition(): ts.LineAndCharacter {
        return this.helper.getLineAndChar(this.fileName, this.stringBodyOffset);
    }

    @memoize
    public get text(): string {
        return PlaceholderSubstituter.replacePlaceholders(
            this.typescript,
            this.templateSettings,
            this.node);
    }

    @memoize
    public get rawText() {
        return this.node.getText().slice(1, -1);
    }
}

export default class StandardTemplateSourceHelper implements TemplateSourceHelper {
    constructor(
        private readonly typescript: typeof ts,
        private readonly templateStringSettings: TemplateSettings,
        private readonly helper: ScriptSourceHelper,
        _logger: Logger
    ) { }

    public getTemplate(
        fileName: string,
        position: number
    ): TemplateContext | undefined {
        const node = this.getValidTemplateNode(
            this.templateStringSettings,
            this.helper.getNode(fileName, position));
        if (!node) {
            return undefined;
        }

        // Make sure we are inside the template string
        if (position <= node.pos) {
            return undefined;
        }

        // Make sure we are not inside of a placeholder
        if (node.kind === this.typescript.SyntaxKind.TemplateExpression) {
            let start = node.head.end;
            for (const child of node.templateSpans.map(x => x.literal)) {
                const nextStart = child.getStart();
                if (position >= start && position <= nextStart) {
                    return undefined;
                }
                start = child.getEnd();
            }
        }

        return new StandardTemplateContext(
            this.typescript,
            fileName,
            node,
            this.helper,
            this.templateStringSettings);
    }

    public getAllTemplates(
        fileName: string
    ): ReadonlyArray<TemplateContext> {
        const out: TemplateContext[] = [];
        for (const node of this.helper.getAllNodes(fileName, n => this.getValidTemplateNode(this.templateStringSettings, n, true) !== undefined)) {
            const validNode = this.getValidTemplateNode(this.templateStringSettings, node);
            if (validNode) {
                out.push(new StandardTemplateContext(this.typescript, fileName, validNode, this.helper, this.templateStringSettings));
            }
        }
        return out;
    }

    public getRelativePosition(
        context: TemplateContext,
        offset: number
    ): ts.LineAndCharacter {
        const baseLC = this.helper.getLineAndChar(context.fileName, context.node.getStart() + 1);
        const cursorLC = this.helper.getLineAndChar(context.fileName, offset);
        return relative(baseLC, cursorLC);
    }

    private getValidTemplateNode(
        templateStringSettings: TemplateSettings,
        node: ts.Node | undefined,
        isForEach = false,
    ): ts.TemplateLiteral | undefined {
        if (!node) {
            return undefined;
        }
        const isValidTemplate = templateStringSettings.isValidTemplate || (() => false);
        switch (node.kind) {
            case this.typescript.SyntaxKind.TemplateExpression:
                if (isValidTemplate(node as ts.TemplateExpression)) {
                    return node as ts.TemplateExpression;
                }
                return undefined;

            case this.typescript.SyntaxKind.TaggedTemplateExpression:
                if (
                    isValidTemplate(node as ts.TaggedTemplateExpression)
                    || isTagged(node as ts.TaggedTemplateExpression, templateStringSettings.tags)
                ) {
                    return (node as ts.TaggedTemplateExpression).template;
                }
                return undefined;

            case this.typescript.SyntaxKind.NoSubstitutionTemplateLiteral:
                if (isValidTemplate(node as ts.NoSubstitutionTemplateLiteral)) {
                    return node as ts.NoSubstitutionTemplateLiteral;
                }

                if (!isForEach && node.parent) {
                    return this.getValidTemplateNode(templateStringSettings, node.parent);
                }

                return undefined;
        }

        if (isForEach) return undefined;

        switch(node.kind) {
            case this.typescript.SyntaxKind.TemplateHead:
                if (templateStringSettings.enableForStringWithSubstitutions && node.parent && node.parent.parent) {
                    return this.getValidTemplateNode(templateStringSettings, node.parent) || this.getValidTemplateNode(templateStringSettings, node.parent.parent);
                }
                return undefined;

            case this.typescript.SyntaxKind.TemplateMiddle:
            case this.typescript.SyntaxKind.TemplateTail:
                if (templateStringSettings.enableForStringWithSubstitutions && node.parent && node.parent.parent) {
                    return this.getValidTemplateNode(templateStringSettings, node.parent.parent) || this.getValidTemplateNode(templateStringSettings, node.parent.parent.parent);
                }
                return undefined;

            default:
                return undefined;
        }
    }
}