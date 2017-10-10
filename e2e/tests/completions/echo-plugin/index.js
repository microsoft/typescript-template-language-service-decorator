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
     * @returns {ts.CompletionInfo}
     */
    getCompletionsAtPosition({ text }, position) {
        let line = text.split(/\n/g)[position.line];
        return {
            isGlobalCompletion: false,
            isMemberCompletion: false,
            isNewIdentifierLocation: false,
            entries: [
                {
                    name: line.slice(0, position.character),
                    kind: ts.ScriptElementKind.unknown,
                    kindModifiers: 'echo',
                    sortText: 'echo'
                }
            ]
        }
    }
}

module.exports = createPlugin(
    (_log) => {
        return new TestStringLanguageService()
    }, {
        tags: ['test'],
        enableForStringWithSubstitutions: true,
        getSubstitution(text, start, end) {
            return 'x'.repeat(end - start);
        }
    })
