// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TemplateStringSettings from './template-string-settings';
import TemplateContext from './template-context';

export default interface TemplateSourceHelper {
    getTemplate(
        templateStringSettings: TemplateStringSettings,
        fileName: string,
        position: number
    ): TemplateContext | undefined;

    getAllTemplates(
        templateStringSettings: TemplateStringSettings,
        fileName: string
    ): TemplateContext[];
}
