// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const assert = require('chai').assert;

module.exports.assertRange = (range, startLine, startOffset, endLine, endOffset) => {
    assert.strictEqual(range.start.line, startLine);
    assert.strictEqual(range.start.offset, startOffset);
    assert.strictEqual(range.end.line, endLine);
    assert.strictEqual(range.end.offset, endOffset);
}