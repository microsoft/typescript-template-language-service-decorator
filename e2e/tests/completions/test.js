// @ts-check
const path = require('path');
const assert = require('chai').assert;

const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('Echo', () => {
    it('should return completions inside tagged, single line template', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'const q = test`abcdefg`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 16, line: 1, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 18, line: 1, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 23, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponses = getResponsesOfType('completions', server);
            assert.strictEqual(completionsResponses.length, 3);

            for (const response of completionsResponses) {
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 1);
            }

            assert.strictEqual(completionsResponses[0].body.length, 1);
            assert.strictEqual(completionsResponses[0].body[0].name, '');
            assert.strictEqual(completionsResponses[0].body[0].kindModifiers, 'echo');

            assert.strictEqual(completionsResponses[1].body.length, 1);
            assert.strictEqual(completionsResponses[1].body[0].name, 'ab');

            assert.strictEqual(completionsResponses[2].body.length, 1);
            assert.strictEqual(completionsResponses[2].body[0].name, 'abcdefg');
        });
    });

    it('should not return completions before tagged template', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'const q = test`abcdefg`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 1, line: 1, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 15, line: 1, prefix: '' } });

        return server.close().then(() => {
            const completionsResponses = getResponsesOfType('completions', server);

            for (const response of completionsResponses) {
                assert.isTrue(response.success);
                assert.isFalse(response.body.some(item => item.kindModifiers === 'echo'));
            }
        });
    });

    it('should return completions for template tag ending with tag name', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'const q = this.is().a.test`abcdefg`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 30, line: 1, prefix: '' } });

        return server.close().then(() => {
            const response = getFirstResponseOfType('completions', server);
            assert.isTrue(response.success);
            assert.strictEqual(response.body.length, 1);
            assert.strictEqual(response.body[0].name, 'ab');
            assert.strictEqual(response.body[0].kindModifiers, 'echo');
        });
    });

    it('should not return completions for non-tagged template', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'const q = `abcdefg`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 12, line: 1, prefix: '' } });

        return server.close().then(() => {
            const response = getFirstResponseOfType('completions', server);
            assert.isFalse(response.success);
        });
    });

    it('should return completions for multiline strings', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, [
            'const q = test`abc',
            'cdefg`'
        ].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 1, line: 2, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 3, line: 2, prefix: '' } });

        return server.close().then(() => {
            const completionsResponses = getResponsesOfType('completions', server);

            assert.strictEqual(completionsResponses.length, 2);

            assert.strictEqual(completionsResponses[0].body.length, 1);
            assert.strictEqual(completionsResponses[0].body[0].name, '');

            assert.strictEqual(completionsResponses[1].body.length, 1);
            assert.strictEqual(completionsResponses[1].body[0].name, 'cd');
        });
    });

    it('should ignore placeholders in string', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'test`abc${123}e${4}${5}fg`');
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 8, line: 1, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 16, line: 1, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 25, line: 1, prefix: '' } });
        
        return server.close().then(() => {
            const responses = getResponsesOfType('completions', server);
            assert.strictEqual(responses.length, 3);

            assert.isTrue(responses[0].success);
            assert.strictEqual(responses[0].body.length, 1);
            assert.strictEqual(responses[0].body[0].name, 'ab');
            assert.strictEqual(responses[0].body[0].kindModifiers, 'echo');

            assert.isTrue(responses[1].success);
            assert.strictEqual(responses[1].body.length, 1);
            assert.strictEqual(responses[1].body[0].name, 'abcxxxxxxe');
            assert.strictEqual(responses[1].body[0].kindModifiers, 'echo');

            assert.isTrue(responses[2].success);
            assert.strictEqual(responses[2].body.length, 1);
            assert.strictEqual(responses[2].body[0].name, 'abcxxxxxxexxxxxxxxf');
            assert.strictEqual(responses[2].body[0].kindModifiers, 'echo');
        });
    });
});
