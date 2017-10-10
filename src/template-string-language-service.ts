import TemplateContext from './template-context';

export default interface TemplateStringLanguageService {
    getCompletionsAtPosition?(
        body: string,
        position: ts.LineAndCharacter,
        context: TemplateContext
    ): ts.CompletionInfo;

    getQuickInfoAtPosition?(
        body: string,
        position: ts.LineAndCharacter,
        context: TemplateContext
    ): ts.QuickInfo | undefined;

    getSyntacticDiagnostics?(
        body: string,
        context: TemplateContext
    ): ts.Diagnostic[];

    getSemanticDiagnostics?(
        body: string,
        context: TemplateContext
    ): ts.Diagnostic[];
}
