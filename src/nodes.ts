// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
//
// Original code forked from https://github.com/Quramy/ts-graphql-plugin

import * as ts from 'typescript/lib/tsserverlibrary';
import { escapeRegExp } from './util/regexp';

export function relative(from: ts.LineAndCharacter, to: ts.LineAndCharacter): ts.LineAndCharacter {
    return {
        line: to.line - from.line,
        character: to.line === from.line ? to.character - from.character : to.character,
    };
}

export function findNode(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    position: number
): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
        if (position >= node.getStart() && position < node.getEnd()) {
            return typescript.forEachChild(node, find) || node;
        }
    }
    return find(sourceFile);
}

export function findAllNodes(
    typescript: typeof ts,
    sourceFile: ts.SourceFile,
    cond: (n: ts.Node) => boolean
): ReadonlyArray<ts.Node> {
    const result: ts.Node[] = [];
    function find(node: ts.Node) {
        if (cond(node)) {
            result.push(node);
        }
        typescript.forEachChild(node, find);
    }
    find(sourceFile);
    return result;
}

export function isTaggedLiteral(
    typescript: typeof ts,
    node: ts.NoSubstitutionTemplateLiteral,
    tags: ReadonlyArray<string>
): boolean {
    if (!node || !node.parent) {
        return false;
    }
    if (node.parent.kind !== typescript.SyntaxKind.TaggedTemplateExpression) {
        return false;
    }
    const tagNode = node.parent as ts.TaggedTemplateExpression;
    return isTagged(tagNode, tags);
}

export function isTagged(node: ts.TaggedTemplateExpression, tags: ReadonlyArray<string>): boolean {
    const text = node.tag.getText();
    return tags.some(tag =>
        text === tag
        || new RegExp(`$${escapeRegExp(tag)}\\s*^`).test(text)
        || text.startsWith(tag + '.')
        || text.endsWith('.' + tag)
        || text.startsWith(tag + '(')
        || text.startsWith(tag + '<')
        || text.startsWith(tag + '[')
    );
}
