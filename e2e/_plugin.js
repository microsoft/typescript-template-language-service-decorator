// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

const template = require('../lib/index');

/**
 * @param {function(): void} createTemplateLanguageService
 * @param {template.TemplateStringSettings} settings
 */
module.exports = (createTemplateLanguageService, settings) => {
    return (mod) => ({
        create(info) {
            const log = (msg) => info.project.projectService.logger.info('!!!!! ' + msg);
            const adapter = createTemplateLanguageService(log);
            log('loaded plugin');
            return template.createTemplateStringLanguageServiceProxy(
                info.languageService,
                adapter,
                settings,
                { log });
        }
    });
}