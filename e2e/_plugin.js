// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check

const template = require('../lib/index');

/**
 * @param {function(any, any): template.TemplateLanguageService} createTemplateLanguageService
 * @param {template.TemplateStringSettings} settings
 */
module.exports = (createTemplateLanguageService, settings) => {
    return (mod) => ({
        create(info) { 
            const log = (msg) => info.project.projectService.logger.info('!!!!! ' + msg);
            const adapter = createTemplateLanguageService(mod.typescript, log);
            log('loaded plugin');
            return template.decorateWithTemplateLanguageService(
                mod.typescript,
                info.languageService,
                info.project,
                adapter,
                settings,
                { logger: { log }  });
        }
    });
}