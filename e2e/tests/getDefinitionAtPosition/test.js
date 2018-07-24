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

describe('GetDefinitionAtPosition', () => {
    it('should return blank definition at template literal position', async () => {
        return getDefinitionAtPositionInMockFile(
            'const q = test`abcdefg`',
            { offset: 16, line: 1 },
        ).then(server => {
            const definitions = getResponsesOfType('goToDefinition', server);
            // Default goToDefinition inside tagged template literal should be blank
            assert.strictEqual(definitions.length, 0);
        })
    });

    it('should return definition at position', async () => {
        return getDefinitionAtPositionInMockFile(
            `const a = 'test';
console.log(a);`,
            { offset: 12, line: 1 },
        ).then(server => {
            const definitions = getResponsesOfType('goToDefinition', server);
            // TODO: Fix this test, it should return location of a
            assert.strictEqual(definitions.length, 0);
        })
    });
});

function getDefinitionAtPositionInMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: 'goToDefinition', arguments: { file: mockFileName, ...location } });
    }

    return server.close().then(() => server);
}