// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import type * as ts from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import TemplateLanguageService from './template-language-service';
import TemplateContext from './template-context';
import TemplateSourceHelper from './template-source-helper';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class TemplateLanguageServiceProxy {

    private readonly _wrappers: Array<{ name: keyof ts.LanguageService, wrapper: LanguageServiceMethodWrapper<any> }> = [];

    constructor(
        private readonly typescript: typeof ts,
        private readonly sourceHelper: TemplateSourceHelper,
        private readonly templateStringService: TemplateLanguageService,
        _logger: Logger
    ) {
        this.tryAdaptGetCompletionsAtPosition();
        this.tryAdaptGetCompletionEntryDetails();
        this.tryAdaptGetQuickInfoAtPosition();
        this.tryAdaptGetSemanticDiagnostics();
        this.tryAdaptGetSyntaxDiagnostics();
        this.tryAdaptGetFormattingEditsForRange();
        this.tryAdaptGetCodeFixesAtPosition();
        this.tryAdaptGetSupportedCodeFixes();
        this.tryAdaptGetDefinitionAtPosition();
        this.tryAdaptGetDefinitionAndBoundSpan();
        this.tryAdaptGetSignatureHelpItemsAtPosition();
        this.tryAdaptGetOutliningSpans();
        this.tryAdaptGetReferencesAtPosition();
        this.tryAdaptGetJsxClosingTagAtPosition();
    }

    public decorate(languageService: ts.LanguageService) {
        for (const { name, wrapper } of this._wrappers) {
            languageService[name] = wrapper(languageService[name]?.bind(languageService));
        }

        return languageService
    }

    private tryAdaptGetSyntaxDiagnostics() {
        if (!this.templateStringService.getSyntacticDiagnostics) {
            return;
        }

        const call = this.templateStringService.getSyntacticDiagnostics.bind(this.templateStringService);
        this.wrap('getSyntacticDiagnostics', delegate => (fileName: string) => {
            return this.adaptDiagnosticsCall(delegate, call, fileName) as ts.DiagnosticWithLocation[];
        });
    }

    private tryAdaptGetSemanticDiagnostics() {
        if (!this.templateStringService.getSemanticDiagnostics) {
            return;
        }

        const call = this.templateStringService.getSemanticDiagnostics.bind(this.templateStringService);
        this.wrap('getSemanticDiagnostics', delegate => (fileName: string) => {
            return this.adaptDiagnosticsCall(delegate, call, fileName);
        });
    }

    private tryAdaptGetQuickInfoAtPosition() {
        if (!this.templateStringService.getQuickInfoAtPosition) {
            return;
        }

        this.wrap('getQuickInfoAtPosition', delegate => (fileName: string, position: number): ts.QuickInfo | undefined => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return delegate(fileName, position);
            }

            const quickInfo: ts.QuickInfo | undefined = this.templateStringService.getQuickInfoAtPosition!(context, this.sourceHelper.getRelativePosition(context, position));
            if (quickInfo) {
                return Object.assign({}, quickInfo, {
                    textSpan: {
                        start: quickInfo.textSpan.start + context.node.getStart() + 1,
                        length: quickInfo.textSpan.length,
                    },
                });
            }
            return delegate(fileName, position);
        });
    }

    private tryAdaptGetCompletionsAtPosition() {
        if (!this.templateStringService.getCompletionsAtPosition) {
            return;
        }

        this.wrap('getCompletionsAtPosition', delegate => (fileName: string, position: number, ...rest: any[]) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return (delegate as any)(fileName, position, ...rest);
            }

            return this.translateCompletionInfo(
                context,
                this.templateStringService.getCompletionsAtPosition!(
                    context,
                    this.sourceHelper.getRelativePosition(context, position)));
        });
    }

    private tryAdaptGetCompletionEntryDetails() {
        if (!this.templateStringService.getCompletionEntryDetails) {
            return;
        }

        this.wrap('getCompletionEntryDetails', delegate => (fileName: string, position: number, name: string, ...rest: any[]) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return (delegate as any)(fileName, position, name, ...rest);
            }

            return this.templateStringService.getCompletionEntryDetails!(
                context,
                this.sourceHelper.getRelativePosition(context, position),
                name);
        });
    }

    private tryAdaptGetFormattingEditsForRange() {
        if (!this.templateStringService.getFormattingEditsForRange) {
            return;
        }

        this.wrap('getFormattingEditsForRange', delegate => (fileName: string, start: number, end: number, options: ts.FormatCodeSettings) => {
            const templateEdits: ts.TextChange[] = [];
            for (const template of this.sourceHelper.getAllTemplates(fileName)) {
                const nodeStart = template.node.getStart() + 1;
                const nodeEnd = template.node.getEnd() - 1;
                if (end < nodeStart || start > nodeEnd) {
                    continue;
                }

                const templateStart = Math.max(0, start - nodeStart);
                const templateEnd = Math.min(nodeEnd - nodeStart, end - nodeStart);
                for (const change of this.templateStringService.getFormattingEditsForRange!(template, templateStart, templateEnd, options)) {
                    templateEdits.push(this.translateTextChange(template, change));
                }
            }

            return [
                ...delegate(fileName, start, end, options),
                ...templateEdits,
            ];
        });
    }

    private tryAdaptGetCodeFixesAtPosition() {
        if (!this.templateStringService.getCodeFixesAtPosition) {
            return;
        }

        this.wrap('getCodeFixesAtPosition', delegate => (fileName: string, start: number, end: number, errorCodes: ReadonlyArray<number>, options: ts.FormatCodeSettings, preferences: ts.UserPreferences) => {
            const templateActions: ts.CodeFixAction[] = [];
            for (const template of this.sourceHelper.getAllTemplates(fileName)) {
                const nodeStart = template.node.getStart() + 1;
                const nodeEnd = template.node.getEnd() - 1;
                if (end < nodeStart || start > nodeEnd) {
                    continue;
                }

                const templateStart = Math.max(0, start - nodeStart);
                const templateEnd = Math.min(nodeEnd - nodeStart, end - nodeStart);
                for (const codeAction of this.templateStringService.getCodeFixesAtPosition!(template, templateStart, templateEnd, errorCodes, options)) {
                    templateActions.push(this.translateCodeAction(template, codeAction));
                }
            }

            return [
                ...delegate(fileName, start, end, errorCodes, options, preferences),
                ...templateActions,
            ];
        });
    }

    private tryAdaptGetSupportedCodeFixes() {
        if (!this.templateStringService.getSupportedCodeFixes) {
            return;
        }

        this.wrap('getSupportedCodeFixes', delegate => (_fileName: string) => {
            return [
                ...delegate(),
                ...this.templateStringService.getSupportedCodeFixes!().map(x => '' + x),
            ];
        })

        const [major] = this.typescript.version.split('.');
        if (+major < 5) {
            // Try also supporting old style override using property assignment
            try {
                this.typescript.version

                const delegate = this.typescript.getSupportedCodeFixes.bind(this.typescript);
                this.typescript.getSupportedCodeFixes = () => {
                    return [
                        ...delegate(),
                        ...this.templateStringService.getSupportedCodeFixes!().map(x => '' + x),
                    ];
                };
            } catch {
                // Noop
            }
        }
    }

    private tryAdaptGetDefinitionAtPosition() {
        if (!this.templateStringService.getDefinitionAtPosition) {
            return;
        }

        this.wrap('getDefinitionAtPosition', delegate => (fileName: string, position: number, ...rest: any[]) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (context) {
                const definition = this.templateStringService.getDefinitionAtPosition!(
                    context,
                    this.sourceHelper.getRelativePosition(context, position));

                return definition
                    ? definition.map(def => this.translateDefinitionInfo(context, def))
                    : undefined;
            }

            return (delegate as any)(fileName, position, ...rest);
        });
    }

    private tryAdaptGetDefinitionAndBoundSpan() {
        if (!this.templateStringService.getDefinitionAndBoundSpan) {
            return;
        }

        this.wrap('getDefinitionAndBoundSpan', delegate => (fileName: string, position: number, ...rest: any[]) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (context) {
                const definitionAndBoundSpan = this.templateStringService.getDefinitionAndBoundSpan!(
                    context,
                    this.sourceHelper.getRelativePosition(context, position));

                return definitionAndBoundSpan.definitions
                    ? {
                        definitions: definitionAndBoundSpan.definitions.map(def => this.translateDefinitionInfo(context, def)),
                        textSpan: this.translateTextSpan(context, definitionAndBoundSpan.textSpan)
                    }
                    : undefined;
            }

            return (delegate as any)(fileName, position, ...rest);
        });
    }

    private tryAdaptGetSignatureHelpItemsAtPosition() {
        if (!this.templateStringService.getSignatureHelpItemsAtPosition) {
            return;
        }

        this.wrap('getSignatureHelpItems', delegate => (fileName: string, position: number, ...rest: any[]) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return (delegate as any)(fileName, position, ...rest);
            }

            const signatureHelp = this.templateStringService.getSignatureHelpItemsAtPosition!(
                context,
                this.sourceHelper.getRelativePosition(context, position));
            return signatureHelp ? this.translateSignatureHelpItems(context, signatureHelp) : undefined;
        });
    }

    private tryAdaptGetOutliningSpans() {
        if (!this.templateStringService.getOutliningSpans) {
            return;
        }

        this.wrap('getOutliningSpans', delegate => (fileName: string) => {
            const templateSpans: ts.OutliningSpan[] = [];
            for (const template of this.sourceHelper.getAllTemplates(fileName)) {
                for (const span of this.templateStringService.getOutliningSpans!(template)) {
                    templateSpans.push(this.translateOutliningSpan(template, span));
                }
            }

            return [
                ...delegate(fileName),
                ...templateSpans,
            ];
        });
    }

    private tryAdaptGetReferencesAtPosition() {
        if (!this.templateStringService.getReferencesAtPosition) {
            return;
        }

        this.wrap('findReferences', delegate => (fileName: string, position: number, ...rest: any[]): ts.ReferencedSymbol[] | undefined => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (context) {
                const references = this.templateStringService.getReferencesAtPosition!(
                    context,
                    this.sourceHelper.getRelativePosition(context, position));

                if (references) {
                    return [{
                        definition: {
                            containerKind: this.typescript.ScriptElementKind.string,
                            containerName: '',
                            displayParts: [],
                            fileName,
                            kind: this.typescript.ScriptElementKind.string,
                            name: '',
                            textSpan: { start: position, length: 0 },
                        },
                        references: references.map(ref => this.translateReferenceEntry(context, ref)),
                    }];
                }

                return undefined;
            }

            return (delegate as any)(fileName, position, ...rest);
        });
    }

    private tryAdaptGetJsxClosingTagAtPosition() {
        if (!this.templateStringService.getJsxClosingTagAtPosition) {
            return;
        }

        this.wrap('getJsxClosingTagAtPosition', delegate => (fileName: string, position: number, ...rest: any[]): ts.JsxClosingTagInfo | undefined => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (context) {
                const closing = this.templateStringService.getJsxClosingTagAtPosition!(
                    context,
                    this.sourceHelper.getRelativePosition(context, position));

                if (closing) {
                    return closing;
                }
            }

            return (delegate as any)(fileName, position, ...rest);
        });
    }

    private wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }

    private adaptDiagnosticsCall(
        delegate: (fileName: string) => ts.Diagnostic[],
        implementation: (context: TemplateContext) => ts.Diagnostic[],
        fileName: string
    ) {
        const baseDiagnostics = delegate(fileName);
        const templateDiagnostics: ts.Diagnostic[] = [];
        for (const context of this.sourceHelper.getAllTemplates(fileName)) {
            for (const diagnostic of implementation(context)) {
                templateDiagnostics.push({
                    ...diagnostic,
                    start: context.node.getStart() + 1 + (diagnostic.start || 0),
                });
            }
        }
        return [...baseDiagnostics, ...templateDiagnostics];
    }

    private translateCompletionInfo(
        context: TemplateContext,
        info: ts.CompletionInfo
    ): ts.CompletionInfo {
        return {
            ...info,
            entries: info.entries.map(entry => this.translateCompletionEntry(context, entry)),
        };
    }

    private translateCompletionEntry(
        context: TemplateContext,
        entry: ts.CompletionEntry
    ): ts.CompletionEntry {
        return {
            ...entry,
            replacementSpan: entry.replacementSpan ? this.translateTextSpan(context, entry.replacementSpan) : undefined,
        };
    }

    private translateTextChange(
        context: TemplateContext,
        textChange: ts.TextChange
    ): ts.TextChange {
        return {
            ...textChange,
            span: this.translateTextSpan(context, textChange.span),
        };
    }

    private translateFileTextChange(
        context: TemplateContext,
        changes: ts.FileTextChanges
    ): ts.FileTextChanges {
        return {
            fileName: changes.fileName,
            textChanges: changes.textChanges.map(textChange => this.translateTextChange(context, textChange)),
        };
    }

    private translateCodeAction(
        context: TemplateContext,
        action: ts.CodeFixAction | ts.CodeAction
    ): ts.CodeFixAction {
        return {
            ...action,
            fixName: (action as ts.CodeFixAction).fixName || '',
            changes: action.changes.map(change => this.translateFileTextChange(context, change)),
        };
    }

    private translateSignatureHelpItems(
        context: TemplateContext,
        signatureHelp: ts.SignatureHelpItems
    ): ts.SignatureHelpItems {
        return {
            ...signatureHelp,
            applicableSpan: this.translateTextSpan(context, signatureHelp.applicableSpan),
        };
    }

    private translateOutliningSpan(
        context: TemplateContext,
        span: ts.OutliningSpan
    ): ts.OutliningSpan {
        return {
            ...span,
            textSpan: this.translateTextSpan(context, span.textSpan),
            hintSpan: this.translateTextSpan(context, span.hintSpan),
        };
    }

    private translateTextSpan(
        context: TemplateContext,
        span: ts.TextSpan
    ): ts.TextSpan {
        return {
            start: context.node.getStart() + 1 + span.start,
            length: span.length,
        };
    }

    private translateDefinitionInfo(
        context: TemplateContext,
        definition: ts.DefinitionInfo
    ): ts.DefinitionInfo {
        return {
            ...definition,
            fileName: definition.fileName || context.fileName,
            textSpan: this.translateTextSpan(context, definition.textSpan),
        };
    }

    private translateReferenceEntry(
        context: TemplateContext,
        entry: ts.ReferenceEntry
    ): ts.ReferenceEntry {
        return {
            ...entry,
            fileName: context.fileName,
            textSpan: this.translateTextSpan(context, entry.textSpan),
        };
    }
}
