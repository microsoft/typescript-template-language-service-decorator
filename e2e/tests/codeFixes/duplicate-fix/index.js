// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check
const createPlugin = require('../../../_plugin');
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');
const { decorateWithTemplateLanguageService } = require('../../../../lib/index');

const errorId = 1010

/**
 * @augments {TemplateStringLanguageService}
 */
class TestStringLanguageService {
    getSemanticDiagnostics({ text, fileName }) {
        /** @type {ts.Diagnostic[]} */
        const diagnostics = [];
        const re = /e/g
        let match;
        while (match = re.exec(text)) {
            diagnostics.push({
                category: ts.DiagnosticCategory.Warning,
                code: errorId,
                file: fileName,
                length: 1,
                start: match.index,
                source: 'e-error',
                messageText: 'e is error'
            })
        }
        return diagnostics;
    }

    /**
     * @return {ts.CodeAction[]}
     */
    getCodeFixesAtPosition(context, start, end) {
        /** @type {ts.CodeAction[]} */
        const codeActions = [];
        codeActions.push({
            description: 'duplicate',
            changes: [{
                fileName: context.fileName,
                textChanges: [{
                    span: {
                        start: start,
                        length: end - start
                    },
                    newText: context.text.slice(start, end) + context.text.slice(start, end)
                }],
            }]
        })
        return codeActions;
    }
}

module.exports = createPlugin(
    (log) => {
        return new TestStringLanguageService(log)
    }, {
        tags: ['test'],
        enableForStringWithSubstitutions: true,
        getSubstitution(text, start, end) {
            return 'x'.repeat(end - start);
        }
    })
