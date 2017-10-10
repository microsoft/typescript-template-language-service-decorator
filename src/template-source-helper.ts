// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import TemplateSettings from './template-settings';
import TemplateContext from './template-context';

export default interface TemplateSourceHelper {
    getTemplate(
        fileName: string,
        position: number
    ): TemplateContext | undefined;

    getAllTemplates(
        fileName: string
    ): TemplateContext[];

    getRelativePosition(
        context: TemplateContext,
        offset: number
    ): ts.LineAndCharacter;
}