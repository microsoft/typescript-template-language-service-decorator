// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');

const { createTemplateStringLanguageServiceProxy } = require('../../../../lib/index');

/**
 * @augments {TemplateStringLanguageService}
 */
class TestStringLanguageService {
    /**
     * @param {string} body
     * @returns {ts.CompletionInfo}
     */
    getCompletionsAtPosition(body, position, context) {
        let line= body.split(/\n/g)[position.line];
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
    const adapter = new TestStringLanguageService();
    info.project.projectService.logger.info('loaded plugin')
    return createTemplateStringLanguageServiceProxy(info.languageService, adapter, {
        tags: ['test'],
        enableForStringWithSubstitutions: true
    }, undefined);
}

module.exports = (mod) => {
    return { create };
};
