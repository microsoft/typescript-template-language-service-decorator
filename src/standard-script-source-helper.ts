
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from 'typescript/lib/tsserverlibrary';
import ScriptSourceHelper from './script-source-helper';
import { findAllNodes, findNode } from './nodes';

export default class StandardScriptSourceHelper implements ScriptSourceHelper {
    constructor(
        private readonly typescript: typeof ts,
        private readonly project: ts.server.Project
    ) { }

    public getNode(fileName: string, position: number) {
        const s = this.getProgram().getSourceFile(fileName);
        return s && findNode(this.typescript, s, position);
    }

    public getAllNodes(fileName: string, cond: (n: ts.Node) => boolean): ReadonlyArray<ts.Node> {
        const s = this.getProgram().getSourceFile(fileName);
        return s ? findAllNodes(this.typescript, s, cond) : [];
    }

    public getLineAndChar(fileName: string, position: number): ts.LineAndCharacter {
        const s = this.project.getScriptInfo(fileName);
        const location = s.positionToLineOffset(position);
        return { line: location.line - 1, character: location.offset - 1 };
    }

    public getOffset(fileName: string, line: number, character: number) {
        const s = this.project.getScriptInfo(fileName);
        return s.lineOffsetToPosition(line + 1, character + 1);
    }

    private getProgram() {
        return this.project.getLanguageService().getProgram();
    }
}