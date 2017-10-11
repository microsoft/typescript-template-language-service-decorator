// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check
const createPlugin = require('../../../_plugin');
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');
const { decorateWithTemplateLanguageService } = require('../../../../lib/index');

/**
 * @augments {TemplateStringLanguageService}
 */
class TestStringLanguageService {
    /**
     * @return {ts.TextChange[]}
     */
    getFormattingEditsForRange(context, start, end) {
        /** @type {ts.TextChange[]} */
        const changes = [];
        const re = /\w(?=\w)/g;
        re.lastIndex = start
        let match;
        while ((match = re.exec(context.text))) {
            if (match.index >= end - 1) {
                break;
            }
            changes.push({
                span: {
                    start: match.index + 1,
                    length: 0
                },
                newText: '\n'
            });
        }
        return changes;
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
