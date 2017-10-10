// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import { isTagged, isTaggedLiteral } from './nodes';
import Logger from './logger';
import ScriptSourceHelper from './script-source-helper';
import StandardScriptSourceHelper from './standard-script-source-helper';
import TemplateStringLanguageService from './template-string-language-service';
import TemplateStringSettings from './template-string-settings';
import TemplateContext from './template-context';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

class StandardTemplateContext implements TemplateContext {
    constructor(
        public readonly fileName: string,
        private readonly node: ts.TemplateLiteral,
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

function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter): ts.LineAndCharacter {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

export default class TemplateLanguageServiceProxy {

    private _wrappers: any[] = [];

    constructor(
        private readonly helper: ScriptSourceHelper,
        private readonly templateStringService: TemplateStringLanguageService,
        private readonly logger: Logger,
        private readonly templateStringSettings: TemplateStringSettings
    ) {
        if (templateStringService.getCompletionsAtPosition) {
            const call = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate =>
                (fileName: string, position: number) => {
                    const node = this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }

                    return call.call(templateStringService,
                        new StandardTemplateContext(fileName, node, this.helper, this.templateStringSettings),
                        this.getRelativePositionWithinNode(fileName, node, position));
                });
        }

        if (templateStringService.getQuickInfoAtPosition) {
            const call = templateStringService.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', delegate =>
                (fileName: string, position: number): ts.QuickInfo => {
                    const node = this.getTemplateNode(fileName, position);
                    if (!node) {
                        return delegate(fileName, position);
                    }
                    const quickInfo: ts.QuickInfo | undefined = call.call(templateStringService,
                        new StandardTemplateContext(fileName, node, this.helper, this.templateStringSettings),
                        this.getRelativePositionWithinNode(fileName, node, position));
                    if (quickInfo) {
                        return Object.assign({}, quickInfo, {
                            textSpan: {
                                start: quickInfo.textSpan.start + node.getStart() + 1,
                                length: quickInfo.textSpan.length,
                            },
                        });
                    }
                    return delegate(fileName, position);
                });
        }

        if (templateStringService.getSemanticDiagnostics) {
            const call = templateStringService.getSemanticDiagnostics.bind(templateStringService);
            this.wrap('getSemanticDiagnostics', delegate =>
                (fileName: string) => {
                    return this.adapterDiagnosticsCall(delegate, call, fileName);
                });
        }

        if (templateStringService.getSyntacticDiagnostics) {
            const call = templateStringService.getSyntacticDiagnostics.bind(templateStringService);
            this.wrap('getSyntacticDiagnostics', delegate =>
                (fileName: string) => {
                    return this.adapterDiagnosticsCall(delegate, call, fileName);
                });
        }
    }

    public build(languageService: ts.LanguageService) {
        const ret: any = languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((languageService as any)[name]);
        });
        return ret;
    }

    private wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }

    private getRelativePositionWithinNode(
        fileName: string,
        node: ts.Node,
        offset: number
    ): ts.LineAndCharacter {
        const baseLC = this.helper.getLineAndChar(fileName, node.getStart() + 1);
        const cursorLC = this.helper.getLineAndChar(fileName, offset);
        return relative(baseLC, cursorLC);
    }

    private getTemplateNode(fileName: string, position: number): ts.TemplateLiteral | undefined {
        const node = this.getValidTemplateNode(this.helper.getNode(fileName, position));
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

        return node;
    }

    private getAllValidTemplateNodes(fileName: string): ts.TemplateLiteral[] {
        const out: ts.TemplateLiteral[] = [];
        for (const node of this.helper.getAllNodes(fileName, n => this.getValidTemplateNode(n) !== undefined)) {
            const validNode = this.getValidTemplateNode(node);
            if (validNode) {
                out.push(validNode);
            }
        }
        return out;
    }

    private getValidTemplateNode(node: ts.Node | undefined): ts.TemplateLiteral | undefined {
        if (!node) {
            return undefined;
        }
        switch (node.kind) {
            case ts.SyntaxKind.TaggedTemplateExpression:
                if (isTagged(node as ts.TaggedTemplateExpression, this.templateStringSettings.tags)) {
                    return (node as ts.TaggedTemplateExpression).template;
                }
                return undefined;

            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                if (isTaggedLiteral(node as ts.NoSubstitutionTemplateLiteral, this.templateStringSettings.tags)) {
                    return node as ts.NoSubstitutionTemplateLiteral;
                }
                return undefined;

            case ts.SyntaxKind.TemplateHead:
                if (!this.templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(node.parent.parent);

            case ts.SyntaxKind.TemplateMiddle:
            case ts.SyntaxKind.TemplateTail:
                if (!this.templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(node.parent.parent.parent);

            default:
                return undefined;
        }
    }

    private adapterDiagnosticsCall(
        delegate: (fileName: string) => ts.Diagnostic[],
        implementation: (context: TemplateContext) => ts.Diagnostic[],
        fileName: string
    ) {
        const baseDiagnostics = delegate(fileName);
        const templateDiagnostics: ts.Diagnostic[] = [];
        for (const templateNode of this.getAllValidTemplateNodes(fileName)) {
            const diagnostics: ts.Diagnostic[] = implementation(
                new StandardTemplateContext(fileName, templateNode, this.helper, this.templateStringSettings));

            for (const diagnostic of diagnostics) {
                templateDiagnostics.push(Object.assign({}, diagnostic, {
                    start: templateNode.getStart() + 1 + (diagnostic.start || 0),
                }));
            }
        }
        return [...baseDiagnostics, ...templateDiagnostics];
    }
}
