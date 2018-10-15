// @ts-check
const assert = require('chai').assert;

const { assertRange } = require('../../_assert');
const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

const createServerWithMockFile = (fileContents) => {
    const server = createServer(__dirname, 'split-plugin');
    openMockFile(server, mockFileName, fileContents);
    return server;
}

describe('Formatting', () => {
    it('should format template string', () => {
        const server = createServerWithMockFile('test`abcd`');
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
        const server = createServerWithMockFile('test`abcdefg`');
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
        const server = createServerWithMockFile(' test`abc`+""\n');
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

    it('should not cause TS server to become out of sync', () => {
        const server = createServerWithMockFile('var token;class c { fileConfigManager:any;\r\n\tpublic execute() {\r\n\r\n\t\tconsole.log(\"in execute\");\r\n\t}\r\n}');
        server.send({
            command: 'change',
            arguments: {
                insertString: "\t\t\t\tthis.fileConfigManager.ensureConfigurationForDocument(document, token);\r\n",
                file: mockFileName,
                line: 3,
                offset: 1,
                endLine: 3,
                endOffset: 1
            }
        });
        server.send({
            command: "format",
            arguments: {
                file: mockFileName,
                line: 3,
                offset: 1,
                endLine: 4,
                endOffset: 1
            }
        });
        server.send({
            command: "change",
            arguments: {
                insertString: "",
                file: mockFileName,
                line: 3,
                offset: 3,
                endLine: 3,
                endOffset: 5
            }
        });
        server.send({
            command: 'syntacticDiagnosticsSync',
            arguments: {
                file: mockFileName
            }
        });
        server.send({
            command: 'semanticDiagnosticsSync',
            arguments: {
                file: mockFileName
            }
        });

        return server.close().then(() => {
            {
                const response = getFirstResponseOfType('syntacticDiagnosticsSync', server);
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 0);
            }
            {
                const response = getFirstResponseOfType('semanticDiagnosticsSync', server);
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 0);
            }
        });
    });
});
