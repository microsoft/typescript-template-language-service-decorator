//@ts-check
const assert = require('chai').assert;
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';


function assertRange(range, startLine, startOffset, endLine, endOffset) {
    assert.strictEqual(range.start.line, startLine);
    assert.strictEqual(range.start.offset, startOffset);
    assert.strictEqual(range.end.line, endLine);
    assert.strictEqual(range.end.offset, endOffset);
}

describe('Errors', () => {
    it('should return errors for single line template string ', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'function test(x) { return x; }; const q = test`eXeeXe`');
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
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'function test(x, y) { return x; }; const q = test`e${1}e`');
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

