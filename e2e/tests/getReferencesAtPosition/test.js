// @ts-check
const path = require('path');
const assert = require('chai').assert;

const createServer = require('../../_server');
const { openMockFile, getFirstResponseOfType, getResponsesOfType } = require('../../_helpers');

const mockFileName = 'main.ts';
const command = 'references';

const createServerWithMockFile = (fileContents) => {
    const server = createServer(__dirname, 'echo-plugin');
    openMockFile(server, mockFileName, fileContents);
    return server;
};

describe('GetReferencesAtPosition', () => {
    it('aaa should return blank definition at template literal position', async () => {
        const server = await getReferencesAtPositionInMockFile([
            '',
            'const q = test`abcdefg`',
        ].join('\n'), { offset: 16, line: 2 });

        const response = getFirstResponseOfType(command, server).body;
        assert.deepEqual(response, { "refs": [{ "file": mockFileName, "start": { "line": 2, "offset": 16 }, "lineText": "const q = test`abcdefg`", "end": { "line": 2, "offset": 17 } }], "symbolName": "a", "symbolStartOffset": 16, "symbolDisplayString": "" });
    });
});

function getReferencesAtPositionInMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: command, arguments: { file: mockFileName, ...location } });
    }

    return server.close().then(() => server);
}
