// @ts-check
const assert = require('chai').assert;

const { assertRange } = require("../../_assert");
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';


describe('Formatting', () => {
    it('should format template string', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'test`abcd`');
        server.send({
            command: 'format',
            arguments: {
                file: mockFileName,
                startLine: 1,
                startOffset: 1,
                endLine: 1,
                endOffset: 13
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('format', server);
            assert.strictEqual(response.body.length, 3);

            assertRange(response.body[0], 1, 7, 1, 7);
            assert.strictEqual(response.body[0].newText, '\n');
        });
    });

});
