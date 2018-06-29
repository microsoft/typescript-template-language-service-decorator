// @ts-check
const assert = require('chai').assert;
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('SignatureHelp', () => {
    it('should not return signature help of outer template function', () => {
        const server = createServer(__dirname, 'echo-plugin');
        openMockFile(server, mockFileName, 'const q = test`abcdefg`');
        server.send({ command: 'signatureHelp', arguments: { file: mockFileName, offset: 17, line: 1, entryNames: ['a'] } });

        return server.close().then(() => {
            const sigHelpResponse = getFirstResponseOfType('signatureHelp', server).body;
            assert.strictEqual(sigHelpResponse.items.length, 0);
        });
    });
});

