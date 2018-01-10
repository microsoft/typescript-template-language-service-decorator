// @ts-check
const path = require('path');
const assert = require('chai').assert;

const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

describe('CompletionEntryDetails', () => {
    it('should return details inside tagged, single line template', () => {
        const server = createServer(__dirname);
        openMockFile(server, mockFileName, 'const q = test`abcdefg`');
        server.send({ command: 'completionEntryDetails', arguments: { file: mockFileName, offset: 17, line: 1, entryNames: ['a'] } });
        server.send({ command: 'completionEntryDetails', arguments: { file: mockFileName, offset: 18, line: 1, entryNames: ['b'] } });
        server.send({ command: 'completionEntryDetails', arguments: { file: mockFileName, offset: 23, line: 1, entryNames: ['c'] } });

        return server.close().then(() => {
            const completionsResponses = getResponsesOfType('completionEntryDetails', server);
            assert.strictEqual(completionsResponses.length, 3);

            assert.strictEqual(completionsResponses[0].body.length, 1);
            assert.strictEqual(completionsResponses[0].body[0].name, 'a');
            assert.strictEqual(completionsResponses[0].body[0].kindModifiers, 'echo');
            assert.strictEqual(completionsResponses[0].body[0].documentation[0].text, 'a');

            assert.strictEqual(completionsResponses[1].body.length, 1);
            assert.strictEqual(completionsResponses[1].body[0].name, 'b');
            assert.strictEqual(completionsResponses[1].body[0].kindModifiers, 'echo');
            assert.strictEqual(completionsResponses[1].body[0].documentation[0].text, 'ab');

            assert.strictEqual(completionsResponses[2].body.length, 1);
            assert.strictEqual(completionsResponses[2].body[0].name, 'c');
            assert.strictEqual(completionsResponses[2].body[0].kindModifiers, 'echo');
            assert.strictEqual(completionsResponses[2].body[0].documentation[0].text, 'abcdefg');
        });
    });
});
