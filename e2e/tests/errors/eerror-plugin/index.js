// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check
const ts = require('../../../../node_modules/typescript/lib/tsserverlibrary');

const template = require('../../../../lib/index');

/**
 * @extends {template.TemplateStringLanguageService}
 */
class TestStringLanguageService {
    constructor(log) {
        this.log = log;
    }

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

/**
 * @param {ts.server.PluginCreateInfo} info 
 * @returns {ts.LanguageService} 
 */
function create(info) {
    const log = (msg) => info.project.projectService.logger.info('!!!!! ' + msg);
    const adapter = new TestStringLanguageService(log);
    log('loaded plugin');
    return template.createTemplateStringLanguageServiceProxy(info.languageService, adapter, {
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
