// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Node, LineAndCharacter } from 'typescript/lib/tsserverlibrary';

export default interface ScriptSourceHelper {
    getAllNodes(
        fileName: string,
        condition: (n: Node) => boolean
    ): ReadonlyArray<ts.Node>;

    getNode(
        fileName: string,
        position: number
    ): Node | undefined;

    getLineAndChar(
        fileName: string,
        position: number
    ): LineAndCharacter;

    getOffset(
        fileName: string,
        line: number,
        character: number
    ): number;
}
