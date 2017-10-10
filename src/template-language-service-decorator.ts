// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import TemplateStringLanguageService from './template-language-service';
import TemplateContext from './template-context';
import TemplateSourceHelper from './template-source-helper';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class TemplateLanguageServiceProxy {

    private _wrappers: any[] = [];

    constructor(
        private readonly sourceHelper: TemplateSourceHelper,
        private readonly templateStringService: TemplateStringLanguageService,
        private readonly logger: Logger
    ) {
        this.tryAdaptGetCompletionsAtPosition();
        this.tryAdaptGetQuickInfoAtPosition();
        this.tryAdaptGetSemanticDiagnostics();
        this.tryAdaptGetSyntaxDiagnostics();
    }

    public decorate(languageService: ts.LanguageService) {
        const ret: any = languageService;
        this._wrappers.forEach(({ name, wrapper }) => {
            ret[name] = wrapper((languageService as any)[name]);
        });
        return ret;
    }

    private tryAdaptGetSyntaxDiagnostics() {
        if (!this.templateStringService.getSyntacticDiagnostics) {
            return;
        }

        const call = this.templateStringService.getSyntacticDiagnostics.bind(this.templateStringService);
        this.wrap('getSyntacticDiagnostics', delegate => (fileName: string) => {
            return this.adapterDiagnosticsCall(delegate, call, fileName);
        });
    }

    private tryAdaptGetSemanticDiagnostics() {
        if (!this.templateStringService.getSemanticDiagnostics) {
            return;
        }

        const call = this.templateStringService.getSemanticDiagnostics.bind(this.templateStringService);
        this.wrap('getSemanticDiagnostics', delegate => (fileName: string) => {
            return this.adapterDiagnosticsCall(delegate, call, fileName);
        });
    }

    private tryAdaptGetQuickInfoAtPosition() {
        if (!this.templateStringService.getQuickInfoAtPosition) {
            return;
        }

        const call = this.templateStringService.getQuickInfoAtPosition;
        this.wrap('getQuickInfoAtPosition', delegate => (fileName: string, position: number): ts.QuickInfo => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return delegate(fileName, position);
            }
            const quickInfo: ts.QuickInfo | undefined = call.call(this.templateStringService, context, this.sourceHelper.getRelativePosition(context, position));
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

        const call = this.templateStringService.getCompletionsAtPosition;
        this.wrap('getCompletionsAtPosition', delegate => (fileName: string, position: number) => {
            const context = this.sourceHelper.getTemplate(fileName, position);
            if (!context) {
                return delegate(fileName, position);
            }

            return call.call(this.templateStringService,
                context,
                this.sourceHelper.getRelativePosition(context, position));
        });
    }

    private wrap<K extends keyof ts.LanguageService>(name: K, wrapper: LanguageServiceMethodWrapper<K>) {
        this._wrappers.push({ name, wrapper });
        return this;
    }

    private adapterDiagnosticsCall(
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
}
