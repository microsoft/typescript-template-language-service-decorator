
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from 'typescript/lib/tsserverlibrary';
import ScriptSourceHelper from './script-source-helper';
import { findAllNodes, findNode } from './nodes';

export default class StandardScriptSourceHelper implements ScriptSourceHelper {
    constructor(
        private readonly typescript: typeof ts,
        private readonly languageService: ts.LanguageService
    ) { }

    public getNode(fileName: string, position: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return s && findNode(this.typescript, s, position);
    }

    public getAllNodes(fileName: string, cond: (n: ts.Node) => boolean) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return s ? findAllNodes(this.typescript, s, cond) : [];
    }

    public getLineAndChar(fileName: string, position: number): ts.LineAndCharacter {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return this.typescript.getLineAndCharacterOfPosition(s!, position);
    }

    public getOffset(fileName: string, line: number, character: number) {
        const s = this.languageService.getProgram().getSourceFile(fileName);
        return this.typescript.getPositionOfLineAndCharacter(s!, line, character);
    }
}