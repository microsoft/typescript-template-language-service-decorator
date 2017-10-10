// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import { relative } from './nodes';
import Logger from './logger';
import TemplateStringLanguageService from './template-string-language-service';
import TemplateStringSettings from './template-string-settings';
import TemplateContext from './template-context';
import TemplateSourceHelper from './template-source-helper';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService>
    = (delegate: ts.LanguageService[K], info?: ts.server.PluginCreateInfo) => ts.LanguageService[K];

export default class TemplateLanguageServiceProxy {

    private _wrappers: any[] = [];

    constructor(
        private readonly templateHelper: TemplateSourceHelper,
        private readonly templateStringService: TemplateStringLanguageService,
        private readonly logger: Logger
    ) {
        if (templateStringService.getCompletionsAtPosition) {
            const call = templateStringService.getCompletionsAtPosition;
            this.wrap('getCompletionsAtPosition', delegate =>
                (fileName: string, position: number) => {
                    const context = this.templateHelper.getTemplate(fileName, position);
                    if (!context) {
                        return delegate(fileName, position);
                    }

                    return call.call(templateStringService,
                        context,
                        this.templateHelper.getRelativePosition(context, position));
                });
        }

        if (templateStringService.getQuickInfoAtPosition) {
            const call = templateStringService.getQuickInfoAtPosition;
            this.wrap('getQuickInfoAtPosition', delegate =>
                (fileName: string, position: number): ts.QuickInfo => {
                    const context = this.templateHelper.getTemplate(fileName, position);
                    if (!context) {
                        return delegate(fileName, position);
                    }
                    const quickInfo: ts.QuickInfo | undefined = call.call(templateStringService,
                        context,
                        this.templateHelper.getRelativePosition(context, position));
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

    private adapterDiagnosticsCall(
        delegate: (fileName: string) => ts.Diagnostic[],
        implementation: (context: TemplateContext) => ts.Diagnostic[],
        fileName: string
    ) {
        const baseDiagnostics = delegate(fileName);
        const templateDiagnostics: ts.Diagnostic[] = [];
        for (const context of this.templateHelper.getAllTemplates(fileName)) {
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
