// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as ts from 'typescript/lib/tsserverlibrary';
import Logger from './logger';
import StandardScriptSourceHelper from './standard-script-source-helper';
import TemplateLanguageService from './template-language-service';
import TemplateSettings from './template-settings';
import TemplateLanguageServiceDecorator from './template-language-service-decorator';
import TemplateContext from './template-context';
import StandardTemplateSourceHelper from './standard-template-source-helper';

export {
    Logger,
    TemplateLanguageService,
    TemplateSettings,
    TemplateContext
};

/**
 * Configuration of the decorated language service.
 */
export interface AdditionalConfiguration {
    /**
     * Logger to use for printing debug messages to the TS Server log.
     */
    readonly logger?: Logger;
}

const nullLogger = new class NullLogger implements Logger {
    public log(_msg: string): void { }
}();

/**
 * Augments a TypeScript language service with language support for the contents
 * of template strings.
 *
 * @param typescript Instance of typescript to use.
 * @param languageService Base language service to augment.
 * @param templateService Language service for contents of template strings.
 * @param project Language service for contents of template strings.
 * @param templateSettings Determines how template strings are processed.
 * @param additionalConfig Additional configuration for the service.
 *
 * @return A copy of the language service with the template language applied. Does not mutate the
 * input language service.
 */
export function decorateWithTemplateLanguageService(
    typescript: typeof ts,
    languageService: ts.LanguageService,
    project: ts.server.Project,
    templateService: TemplateLanguageService,
    templateSettings: TemplateSettings,
    additionalConfig?: AdditionalConfiguration
): ts.LanguageService {
    const logger = (additionalConfig && additionalConfig.logger) || nullLogger;
    return new TemplateLanguageServiceDecorator(
        typescript,
        new StandardTemplateSourceHelper(
            typescript,
            templateSettings,
            new StandardScriptSourceHelper(typescript, project),
            logger),
        templateService,
        logger
    ).decorate(languageService);
}
