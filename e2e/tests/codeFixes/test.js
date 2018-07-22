// @ts-check
const assert = require('chai').assert;

const { assertRange } = require("../../_assert");
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('CodeFixes', () => {
    it('should provide quick fixes for template string', () => {
        const server = createServer(__dirname, 'duplicate-fix');
        openMockFile(server, mockFileName, 'test`aexe`');
        server.send({
            command: 'getCodeFixes',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 5,
                endLine: 1,
                endOffset: 10,
                errorCodes: [1010]
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('getCodeFixes', server);
            assert.strictEqual(response.body.length, 1);
            
            assert.strictEqual(response.body[0].description, 'duplicate');
            assert.strictEqual(response.body[0].changes.length, 1);
            
            const change = response.body[0].changes[0];
            assert.strictEqual(change.fileName, mockFileName);
            assert.strictEqual(change.textChanges.length, 1);
            assert.strictEqual(change.textChanges[0].newText, 'aexeaexe');
            assertRange(change.textChanges[0], 1, 6, 1, 10);
        });
    });
});
