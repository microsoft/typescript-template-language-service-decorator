// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {Node, LineAndCharacter} from 'typescript/lib/tsserverlibrary';

export default interface TemplateContext {
    fileName: string;
    node: Node;

    /**
     * Map a location from within the template string to an offset within the template string
     */
    toOffset(location: LineAndCharacter): number;

    /**
     * Map an offset within the template string to a location within the template string
     */
    toPosition(offset: number): LineAndCharacter;
}