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
                line: 1,
                offset: 1,
                endLine: 1,
                endOffset: 13
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('format', server);
            assert.strictEqual(response.body.length, 3);

            assertRange(response.body[0], 1, 7, 1, 7);
            assert.strictEqual(response.body[0].newText, '\n');

            assertRange(response.body[1], 1, 8, 1, 8);
            assert.strictEqual(response.body[1].newText, '\n');

            assertRange(response.body[2], 1, 9, 1, 9);
            assert.strictEqual(response.body[2].newText, '\n');
        });
    });

    it('should format range within template string', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'test`abcdefg`');
        server.send({
            command: 'format',
            arguments: {
                file: mockFileName,
                line: 1,
                offset: 8,
                endLine: 1,
                endOffset: 11
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('format', server);
            assert.strictEqual(response.body.length, 2);

            assertRange(response.body[0], 1, 9, 1, 9);
            assert.strictEqual(response.body[0].newText, '\n');

            assertRange(response.body[1], 1, 10, 1, 10);
            assert.strictEqual(response.body[1].newText, '\n');
        });
    });


    it('should format both javascript and template string contents', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, ' test`abc`+""\n');
        server.send({
            command: 'format',
            arguments: {
                file: mockFileName,
                line: 1,
                offset: 1,
                endLine: 2,
                endOffset: 1
            }
        });

        return server.close().then(() => {
            const response = getFirstResponseOfType('format', server);
            assert.strictEqual(response.body.length, 5);

            assertRange(response.body[0], 1, 1, 1, 2);
            assert.strictEqual(response.body[0].newText, '');

            assertRange(response.body[1], 1, 11, 1, 11);
            assert.strictEqual(response.body[1].newText, ' ');

            assertRange(response.body[2], 1, 12, 1, 12);
            assert.strictEqual(response.body[2].newText, ' ');

            assertRange(response.body[3], 1, 8, 1, 8);
            assert.strictEqual(response.body[3].newText, '\n');

            assertRange(response.body[4], 1, 9, 1, 9);
            assert.strictEqual(response.body[4].newText, '\n');
        });
    });

});
