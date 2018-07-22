// @ts-check
const path = require('path');
const assert = require('chai').assert;

const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';

const createServerWithMockFile = (fileContents) => {
    const server = createServer(__dirname, 'echo-plugin');
    openMockFile(server, mockFileName, fileContents);
    return server;
}

describe('getSubstitutions', () => {
    it('should call getSubstitutions with all placeholders', () => {
        return getCompletionsInMockFile(
            'const q = test`a${1}b${2}c${3}`',
            { offset: 31, line: 1 }
        ).then(server => {
            const completionsResponses = getResponsesOfType('completions', server);
            assert.strictEqual(completionsResponses.length, 1);

            for (const response of completionsResponses) {
                assert.isTrue(response.success);
                assert.strictEqual(response.body.length, 1);
            }

            assert.strictEqual(completionsResponses[0].body.length, 1);
            assert.strictEqual(completionsResponses[0].body[0].name, 'axxxxbxxxxcxxxx');
            assert.strictEqual(completionsResponses[0].body[0].kindModifiers, 'echo');
        });
    });
});

function getCompletionsInMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: 'completions', arguments: { file: mockFileName, ...location } });
    }

    return server.close().then(() => server);
}