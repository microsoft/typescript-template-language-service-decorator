// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}