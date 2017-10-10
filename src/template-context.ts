// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Node, LineAndCharacter } from 'typescript/lib/tsserverlibrary';

/**
 * 
 */
export default interface TemplateContext {
    /**
     * Name of the file the template is in.
     */
    fileName: string;

    /**
     * Contents of the template.
     * 
     * Has substitutions already replaced.
     */
    text: string;

    /**
     * AST node.
     */
    node: ts.TemplateLiteral;

    /**
     * Map a location from within the template string to an offset within the template string
     */
    toOffset(location: LineAndCharacter): number;

    /**
     * Map an offset within the template string to a location within the template string
     */
    toPosition(offset: number): LineAndCharacter;
}