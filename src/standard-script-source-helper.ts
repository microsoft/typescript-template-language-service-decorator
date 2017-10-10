
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LanguageService, getLineAndCharacterOfPosition, getPositionOfLineAndCharacter, Node } from 'typescript/lib/tsserverlibrary';
import ScriptSourceHelper from './script-source-helper';
import { findAllNodes, findNode } from './nodes';

export default class StandardScriptSourceHelper implements ScriptSourceHelper {
    constructor(
        private readonly languageService: LanguageService
    ) { }

    public getNode(fileName: string, position: number) {
        return findNode(this.languageService.getProgram().getSourceFile(fileName), position);
    }
    public getAllNodes(fileName: string, cond: (n: Node) => boolean) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return findAllNodes(s, cond);
    }
    public getLineAndChar(fileName: string, position: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return getLineAndCharacterOfPosition(s, position);
    }

    public getOffset(fileName: string, line: number, character: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return getPositionOfLineAndCharacter(s, line, character);
    }
}