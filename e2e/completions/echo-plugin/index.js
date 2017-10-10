// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');

const { createTemplateStringLanguageServiceProxy } = require('../../../../lib/index');

/**
 * @augments {TemplateStringLanguageService}
 */
class TestStringLanguageService {
    constructor(log) {
        this.log = log;
    }
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

/**
 * @param {ts.server.PluginCreateInfo} info 
 * @returns {ts.LanguageService} 
 */
function create(info) {
    const log = (msg) => info.project.projectService.logger.info('!!!!! ' + msg);
    const adapter = new TestStringLanguageService(log);
    log('loaded plugin');
    return createTemplateStringLanguageServiceProxy(info.languageService, adapter, {
        tags: ['test'],
        enableForStringWithSubstitutions: true,
        getSubstitution(text, start, end) {
            return 'x'.repeat(end - start);
        }
    }, { log });
}

module.exports = (mod) => {
    return { create };
};
