// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type * as ts from 'typescript/lib/tsserverlibrary';
import TemplateContext from './template-context';

export default interface TemplateSourceHelper {
    getTemplate(
        fileName: string,
        position: number
    ): TemplateContext | undefined;

    getAllTemplates(
        fileName: string
    ): ReadonlyArray<TemplateContext>;

    getRelativePosition(
        context: TemplateContext,
        offset: number
    ): ts.LineAndCharacter;
}
