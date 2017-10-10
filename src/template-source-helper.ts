// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TemplateStringSettings from './template-string-settings';

export default interface TemplateSourceHelper {
    getTemplateNode(
        templateStringSettings: TemplateStringSettings,
        fileName: string,
        position: number
    ): ts.TemplateLiteral | undefined;

    getAllTemplateNodes(
        templateStringSettings: TemplateStringSettings,
        fileName: string
    ): ts.TemplateLiteral[];
}
