// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TemplateSourceHelper from './template-source-helper';
import ScriptSourceHelper from './script-source-helper';
import { TemplateStringSettings } from './index';
import * as ts from 'typescript/lib/tsserverlibrary';
import { isTaggedLiteral, isTagged } from './nodes';

export default class StandardTemplateSourceHelper implements TemplateSourceHelper {
    constructor(
        private readonly helper: ScriptSourceHelper
    ) { }

    public getTemplateNode(
        templateStringSettings: TemplateStringSettings,
        fileName: string,
        position: number
    ): ts.TemplateLiteral | undefined {
        const node = this.getValidTemplateNode(templateStringSettings, this.helper.getNode(fileName, position));
        if (!node) {
            return undefined;
        }

        // Make sure we are inside the template string
        if (position <= node.pos) {
            return undefined;
        }

        // Make sure we are not inside of a placeholder
        if (node.kind === ts.SyntaxKind.TemplateExpression) {
            let start = node.head.end;
            for (const child of node.templateSpans.map(x => x.literal)) {
                const nextStart = child.getStart();
                if (position >= start && position <= nextStart) {
                    return undefined;
                }
                start = child.getEnd();
            }
        }

        return node;
    }

    public getAllTemplateNodes(
        templateStringSettings: TemplateStringSettings,
        fileName: string
    ): ts.TemplateLiteral[] {
        const out: ts.TemplateLiteral[] = [];
        for (const node of this.helper.getAllNodes(fileName, n => this.getValidTemplateNode(templateStringSettings, n) !== undefined)) {
            const validNode = this.getValidTemplateNode(templateStringSettings, node);
            if (validNode) {
                out.push(validNode);
            }
        }
        return out;
    }

    private getValidTemplateNode(
        templateStringSettings: TemplateStringSettings,
        node: ts.Node | undefined
    ): ts.TemplateLiteral | undefined {
        if (!node) {
            return undefined;
        }
        switch (node.kind) {
            case ts.SyntaxKind.TaggedTemplateExpression:
                if (isTagged(node as ts.TaggedTemplateExpression, templateStringSettings.tags)) {
                    return (node as ts.TaggedTemplateExpression).template;
                }
                return undefined;

            case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
                if (isTaggedLiteral(node as ts.NoSubstitutionTemplateLiteral, templateStringSettings.tags)) {
                    return node as ts.NoSubstitutionTemplateLiteral;
                }
                return undefined;

            case ts.SyntaxKind.TemplateHead:
                if (!templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(templateStringSettings, node.parent.parent);

            case ts.SyntaxKind.TemplateMiddle:
            case ts.SyntaxKind.TemplateTail:
                if (!templateStringSettings.enableForStringWithSubstitutions || !node.parent || !node.parent.parent) {
                    return undefined;
                }
                return this.getValidTemplateNode(templateStringSettings, node.parent.parent.parent);

            default:
                return undefined;
        }
    }
}