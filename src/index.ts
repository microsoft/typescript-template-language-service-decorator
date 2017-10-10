// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { LanguageService } from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import StandardScriptSourceHelper from './standard-script-source-helper';
import TemplateLanguageService from './template-language-service';
import TemplateSettings from './template-settings';
import TemplateLanguageServiceProxy from './template-language-service-proxy';
import TemplateContext from './template-context';
import StandardTemplateSourceHelper from './standard-template-source-helper';

export {
    Logger,
    TemplateLanguageService,
    TemplateSettings,
    TemplateContext
};

export function createTemplateStringLanguageServiceProxy(
    languageService: LanguageService,
    templateStringService: TemplateLanguageService,
    settings: TemplateSettings,
    logger: Logger
): ts.LanguageService {
    return new TemplateLanguageServiceProxy(
        new StandardTemplateSourceHelper(
            settings,
            new StandardScriptSourceHelper(languageService)),
        templateStringService,
        logger
    ).build(languageService);
}
