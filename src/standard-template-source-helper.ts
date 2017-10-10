// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from 'typescript/lib/tsserverlibrary';
import TemplateSourceHelper from './template-source-helper';
import ScriptSourceHelper from './script-source-helper';
import { isTaggedLiteral, isTagged, relative } from './nodes';
import TemplateContext from './template-context';
import TemplateStringSettings from './template-string-settings';

class StandardTemplateContext implements TemplateContext {
    constructor(
        public readonly fileName: string,
        public readonly node: ts.TemplateLiteral,
        private readonly helper: ScriptSourceHelper,
        private readonly templateStringSettings: TemplateStringSettings
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

    private get stringBodyOffset(): number {
        return this.node.getStart() + 1;
    }

    private get stringBodyPosition(): ts.LineAndCharacter {
        return this.helper.getLineAndChar(this.fileName, this.stringBodyOffset);
    }

    public get text(): string {
        const literalContents = this.node.getText().slice(1, -1);
        if (this.node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
            return literalContents;
        }

        const stringStart = this.node.getStart() + 1;
        let contents = literalContents;
        let nodeStart = this.node.head.end - stringStart - 2;
        for (const child of this.node.templateSpans.map(x => x.literal)) {
            const start = child.getStart() - stringStart + 1;
            contents = contents.substr(0, nodeStart) + this.getSubstitution(literalContents, nodeStart, start) + contents.substr(start);
            nodeStart = child.getEnd() - stringStart - 2;
        }
        return contents;
    }

    private getSubstitution(
        templateString: string,
        start: number,
        end: number
    ): string {
        return this.templateStringSettings.getSubstitution
            ? this.templateStringSettings.getSubstitution(templateString, start, end)
            : 'x'.repeat(end - start);
    }
}

export default class StandardTemplateSourceHelper implements TemplateSourceHelper {
    constructor(
        private readonly templateStringSettings: TemplateStringSettings,
        private readonly helper: ScriptSourceHelper
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
        if (node.kind === ts.SyntaxKind.TemplateExpression) {
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
            fileName,
            node,
            this.helper,
            this.templateStringSettings);
    }

    public getAllTemplates(
        fileName: string
    ): TemplateContext[] {
        const out: TemplateContext[] = [];
        for (const node of this.helper.getAllNodes(fileName, n => this.getValidTemplateNode(this.templateStringSettings, n) !== undefined)) {
            const validNode = this.getValidTemplateNode(this.templateStringSettings, node);
            if (validNode) {
                out.push(new StandardTemplateContext(fileName, validNode, this.helper, this.templateStringSettings));
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
        templateStringSettings: TemplateStringSettings,
        node: ts.Node | undefined
    ): ts.TemplateLiteral | undefined {
        if (!node) {
            return undefined;
        }
        switch (node.kind) {
            case ts.SyntaxKind.TaggedTemplateExpression:
                if (isTagged(node as ts.TaggedTemplateExpression, templateStringSettings.tags)) {
                    return (node as ts.TaggedTemplateExpression).template;
                }
                return undefined;

            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                if (isTaggedLiteral(node as ts.NoSubstitutionTemplateLiteral, templateStringSettings.tags)) {
                    return node as ts.NoSubstitutionTemplateLiteral;
                }
                return undefined;

            case ts.SyntaxKind.TemplateHead:
                if (!templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(templateStringSettings, node.parent.parent);

            case ts.SyntaxKind.TemplateMiddle:
            case ts.SyntaxKind.TemplateTail:
                if (!templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(templateStringSettings, node.parent.parent.parent);

            default:
                return undefined;
        }
    }
}