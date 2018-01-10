// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TemplateContext from './template-context';

/**
 * Augments TypeScript with language support for a language embedded in a template string.
 */
export default interface TemplateLanguageService {
    getCompletionsAtPosition?(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.CompletionInfo;

    getCompletionEntryDetails?(
        context: TemplateContext,
        position: ts.LineAndCharacter,
        name: string
    ): ts.CompletionEntryDetails;

    getQuickInfoAtPosition?(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.QuickInfo | undefined;

    getSyntacticDiagnostics?(
        context: TemplateContext
    ): ts.Diagnostic[];

    getSemanticDiagnostics?(
        context: TemplateContext
    ): ts.Diagnostic[];

    getFormattingEditsForRange?(
        context: TemplateContext,
        start: number,
        end: number,
        settings: ts.EditorSettings
    ): ts.TextChange[];
}
