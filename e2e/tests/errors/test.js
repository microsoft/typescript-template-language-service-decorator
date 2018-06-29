//@ts-check
const assert = require('chai').assert;
const { assertRange } = require('../../_assert');
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

const createServerWithMockFile = (fileContents) => {
    const server = createServer(__dirname, 'eerror-plugin');
    openMockFile(server, mockFileName, fileContents);
    return server;
}

describe('Errors', () => {
    it('should return errors for single line template string ', () => {
        const server = createServerWithMockFile('function etag(x) { return x; }; const q = etag`eXeeXe`');
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const response = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(response.success);
            assert.strictEqual(response.body.length, 4);

            for (const error of response.body) {
                assert.strictEqual(error.code, 1010);
                assert.strictEqual(error.text, 'e is error');
            }
            const [error1, error2, error3, error4] = response.body;
            assertRange(error1, 1, 48, 1, 49);
            assertRange(error2, 1, 50, 1, 51);
            assertRange(error3, 1, 51, 1, 52);
            assertRange(error4, 1, 53, 1, 54);
        });
    });

    it('should not return errors in placeholders', () => {
        const server = createServerWithMockFile('function etag(x, y) { return x; }; const q = etag`e${1}e`');
        server.send({ command: 'semanticDiagnosticsSync', arguments: { file: mockFileName } });

        return server.close().then(() => {
            const response = getFirstResponseOfType('semanticDiagnosticsSync', server);
            assert.isTrue(response.success);
            assert.strictEqual(response.body.length, 2);

            for (const error of response.body) {
                assert.strictEqual(error.code, 1010);
                assert.strictEqual(error.text, 'e is error');
            }

            const [error1, error2] = response.body;
            assertRange(error1, 1, 51, 1, 52);
            assertRange(error2, 1, 56, 1, 57);
        });
    });
});

