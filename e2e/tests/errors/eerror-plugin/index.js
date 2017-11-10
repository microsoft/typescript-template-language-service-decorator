// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

const createPlugin = require('../../../_plugin');
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');
const template = require('../../../../lib/index');

/**
 * @extends {template.TemplateStringLanguageService}
 */
class TestStringLanguageService {
    /**
     * @return {ts.Diagnostic[]}
     */
    getSemanticDiagnostics({ text, fileName }) {
        /** @type {ts.Diagnostic[]} */
        const diagnostics = [];
        const re = /e/g
        let match;
        while (match = re.exec(text)) {
            diagnostics.push({
                category: ts.DiagnosticCategory.Warning,
                code: 1010,
                file: fileName,
                length: 1,
                start: match.index,
                source: 'e-error',
                messageText: 'e is error'
            })
        }
        return diagnostics;
    }
}

module.exports = createPlugin(
    (_typescript, _log) => {
        return new TestStringLanguageService();
    }, {
        tags: ['test'],
        enableForStringWithSubstitutions: true,
        getSubstitution(text, start, end) {
            return 'x'.repeat(end - start);
        }
    });
