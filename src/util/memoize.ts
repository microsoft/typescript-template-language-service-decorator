// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

export function memoize(_target: any, key: string, descriptor: any) {
    let fnKey: string | undefined;
    let fn: any | undefined;

    if (typeof descriptor.value === 'function') {
        fnKey = 'value';
        fn = descriptor.value;
    } else if (typeof descriptor.get === 'function') {
        fnKey = 'get';
        fn = descriptor.get;
    } else {
        throw new Error('not supported');
    }

    const memoizeKey = `$memoize$${key}`;

    descriptor[fnKey] = function(...args: any[]) {
        // eslint-disable-next-line no-prototype-builtins
        if (!this.hasOwnProperty(memoizeKey)) {
            Object.defineProperty(this, memoizeKey, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: fn!.apply(this, args),
            });
        }

        return this[memoizeKey];
    };
}
