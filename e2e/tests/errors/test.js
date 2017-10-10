//@ts-check
const assert = require('chai').assert;
const createServer = require('../../server-fixture');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';


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
                assert.strictEqual(error.text, 'e is error');
            }

            assert.strictEqual(response.body[0].start.line, 1);
            assert.strictEqual(response.body[0].start.offset, 48);
            assert.strictEqual(response.body[0].end.line, 1);
            assert.strictEqual(response.body[0].end.offset, 49);
        });
    });
})
