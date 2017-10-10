// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LanguageService } from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import StandardScriptSourceHelper from './standard-script-source-helper';
import TemplateStringLanguageService from './template-string-language-service';
import TemplateStringSettings from './template-string-settings';
import TemplateLanguageServiceProxy from './template-language-service-proxy';
import TemplateContext from './template-context';

export {
    Logger,
    TemplateStringLanguageService,
    TemplateStringSettings,
    TemplateContext
};

export function createTemplateStringLanguageServiceProxy(
    languageService: LanguageService,
    templateStringService: TemplateStringLanguageService,
    settings: TemplateStringSettings,
    logger: Logger
): ts.LanguageService {
    return new TemplateLanguageServiceProxy(
        new StandardScriptSourceHelper(languageService),
        templateStringService,
        logger,
        settings
    ).build(languageService);
}
