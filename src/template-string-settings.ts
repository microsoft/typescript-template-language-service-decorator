export default interface TemplateStringSettings {
    readonly tags: string[];
    readonly enableForStringWithSubstitutions?: boolean;

    getSubstitution?(templateString: string, start: number, end: number): string;
}
