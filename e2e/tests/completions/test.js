// @ts-check
const path = require('path');
const assert = require('chai').assert;

const createServer = require('../../server-fixture');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('Echo', () => {
    it('should return completions inside string on single line', () => {
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

    it('should not return string completions before string', () => {
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

    it('should return completions for multiline strings', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, [
            'const q = test`',
            'abcdefg`'
        ].join('\n'));
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 1, line: 2, prefix: '' } });
        server.send({ command: 'completions', arguments: { file: mockFileName, offset: 3, line: 2, prefix: '' } });

        return server.close().then(() => {
            const completionsResponses = getResponsesOfType('completions', server);

            assert.strictEqual(completionsResponses.length, 2);

            assert.strictEqual(completionsResponses[0].body.length, 1);
            assert.strictEqual(completionsResponses[0].body[0].name, '');

            assert.strictEqual(completionsResponses[1].body.length, 1);
            assert.strictEqual(completionsResponses[1].body[0].name, 'ab');
        });
    });
})
