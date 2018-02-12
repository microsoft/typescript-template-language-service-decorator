// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import TemplateLanguageService from './template-language-service';
import TemplateContext from './template-context';
import TemplateSourceHelper from './template-source-helper';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class TemplateLanguageServiceProxy {

    private readonly _wrappers: any[] = [];

    constructor(
        private readonly sourceHelper: TemplateSourceHelper,
        private readonly templateStringService: TemplateLanguageService,
        private readonly logger: Logger
    ) {
        this.tryAdaptGetCompletionsAtPosition();
        this.tryAdaptGetCompletionEntryDetails();
        this.tryAdaptGetQuickInfoAtPosition();
        this.tryAdaptGetSemanticDiagnostics();
        this.tryAdaptGetSyntaxDiagnostics();
        this.tryAdaptGetFormattingEditsForRange();
        this.tryAdaptGetCodeFixesAtPosition();
    }

    public decorate(languageService: ts.LanguageService) {
        const ret: any = languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((languageService as any) [name]);
        });
        return ret;
    }

    private tryAdaptGetSyntaxDiagnostics() {
        if (!this.templateStringService.getSyntacticDiagnostics) {
            return;
        }

        const call = this.templateStringService.getSyntacticDiagnostics.bind(this.templateStringService);
        this.wrap('getSyntacticDiagnostics', delegate => (fileName: string) => {
            return this.adaptDiagnosticsCall(delegate, call, fileName);
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

        this.wrap('getQuickInfoAtPosition', delegate => (fileName: string, position: number): ts.QuickInfo => {
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

            return this.templateStringService.getCompletionsAtPosition!(
                context,
                this.sourceHelper.getRelativePosition(context, position));
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

        this.wrap('getCodeFixesAtPosition', delegate => (fileName: string, start: number, end: number, errorCodes: number[], options: ts.FormatCodeSettings) => {
            const templateActions: ts.CodeAction[] = [];
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
                ...delegate(fileName, start, end, errorCodes, options),
                ...templateActions,
            ];
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
            const diagnostics: ts.Diagnostic[] = implementation(context);

            for (const diagnostic of diagnostics) {
                templateDiagnostics.push(Object.assign({}, diagnostic, {
                    start: context.node.getStart() + 1 + (diagnostic.start || 0),
                }));
            }
        }
        return [...baseDiagnostics, ...templateDiagnostics];
    }

    private translateTextChange(
        context: TemplateContext,
        textChangeInTemplate: ts.TextChange
    ): ts.TextChange {
        textChangeInTemplate.span.start += context.node.getStart() + 1;
        return textChangeInTemplate;
    }

    private translateFileTextChange(
        context: TemplateContext,
        changes: ts.FileTextChanges
    ): ts.FileTextChanges {
        return {
            fileName: changes.fileName,
            textChanges: changes.textChanges.map(textChange => this.translateTextChange(context, textChange))
        }
    }

    private translateCodeAction(
        context: TemplateContext,
        action: ts.CodeAction
    ): ts.CodeAction {
        return {
            description: action.description,
            changes: action.changes.map(change => this.translateFileTextChange(context, change))
        }
    }
}
