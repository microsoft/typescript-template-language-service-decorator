// @ts-check
const assert = require('chai').assert;
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('SignatureHelp', () => {
    it('should not return signature help of outer template function', () => {
        return getSigHelpInMockFile(
            'const q = test`abcdefg`',
            { offset: 17, line: 1 }
        ).then(sigHelpResponse => {
            assert.strictEqual(sigHelpResponse, undefined);
        });
    });

    it('should return basic signature', () => {
        return getSigHelpInMockFile(
            'const q = test`a(b`',
            { offset: 18, line: 1 }
        ).then(sigHelpResponse => {
            assert.strictEqual(sigHelpResponse.items.length, 1);

            const firstItem = sigHelpResponse.items[0];
            assert.strictEqual(firstItem.prefixDisplayParts[0].text, 'b');
        });
    });

    it('should return basic signature', () => {
        return getSigHelpInMockFile(
            'const q = test`a(b`',
            { offset: 18, line: 1 }
        ).then(sigHelpResponse => {
            assert.strictEqual(sigHelpResponse.items.length, 1);

            const firstItem = sigHelpResponse.items[0];
            assert.strictEqual(firstItem.prefixDisplayParts[0].text, 'b');
        });
    });

    it('should correctly update applicableSpan', () => {
        return getSigHelpInMockFile(
            'const q = test`a(b`',
            { offset: 18, line: 1 }
        ).then(sigHelpResponse => {
            assert.strictEqual(sigHelpResponse.items.length, 1);

            assert.strictEqual(sigHelpResponse.applicableSpan.start.line, 1);
            assert.strictEqual(sigHelpResponse.applicableSpan.start.offset, 17);
        });
    });
});


function getSigHelpInMockFile(fileContents, position) {
    const server = createServer(__dirname, 'echo-plugin');
    openMockFile(server, mockFileName, fileContents);
    server.send({ command: 'signatureHelp', arguments: { file: mockFileName, ...position } });

    return server.close().then(() => {
        return getFirstResponseOfType('signatureHelp', server).body;
    });
}