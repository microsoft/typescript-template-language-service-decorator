import TemplateContext from './template-context';

/**
 * 
 */
export default interface TemplateStringLanguageService {
    getCompletionsAtPosition?(
        context: TemplateContext,
        position: ts.LineAndCharacter
    ): ts.CompletionInfo;

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
}
