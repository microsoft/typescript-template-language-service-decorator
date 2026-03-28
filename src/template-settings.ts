// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from "typescript/lib/tsserverlibrary";

/**
 * Define which tagged templates to process and how to parse them.
 */
export default interface TemplateSettings {
    /**
     * Set of tags that identify which tagged templates to process.
     *
     * The tag string may be matched at either the start or the end of the template's tag.
     */
    readonly tags: ReadonlyArray<string>;

    /**
     * Determine whether to provide language services for the Node
     */
    isValidTemplate?(node: ts.NoSubstitutionTemplateLiteral | ts.TaggedTemplateExpression | ts.TemplateExpression): boolean;

    /**
     * Should templates with substitutions be processed?
     *
     * Defaults to false.
     */
    readonly enableForStringWithSubstitutions?: boolean;

    /**
     * Retrieve a string that is used internally in place of the substitution expression.
     *
     * @param templateString The raw template string with all `${substitution}` in place.
     * @param start Start index of the range in `templateString` to replace.
     * @param end End index of the range in `templateString` to replace.
     *
     * @return Replacement string. Must be the of length `end - start`.
     */
    getSubstitution?(
        templateString: string,
        start: number,
        end: number
    ): string;

    /**
     * Retrieve a string that is used internally in place of the substitution expression.
     *
     * If this is implemented, `getSubstitution` will not be called.
     *
     * @param templateString The raw template string with all `${substitution}` in place.
     * @param spans List of placeholder spans.
     *
     * @return Replacement string. Must be the exact same length as the input string
     */
    getSubstitutions?(
        templateString: string,
        spans: ReadonlyArray<{ start: number, end: number }>
    ): string;
}