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
};

describe('GetDefinitionAtPosition', () => {
    it('aaa should return blank definition at template literal position', async () => {
        return getDefinitionAtPositionInMockFile([
            '',
            'const q = test`abcdefg`',
        ].join('\n'),
            { offset: 16, line: 2 },
        ).then(server => {
            const definitions = getFirstResponseOfType('definition', server).body;
            assert.strictEqual(definitions.length, 1);

            const [def] = definitions;
            assert.deepEqual(def, { "file": mockFileName, "start": { "line": 2, "offset": 16 }, "end": { "line": 2, "offset": 17 } });
        });
    });

    it('should still return js/ts definitions at position', async () => {
        return getDefinitionAtPositionInMockFile(
            `const abc = 'test';
console.log(abc);`,
            { offset: 13, line: 2 },
        ).then(server => {
            const definitions = getFirstResponseOfType('definition', server).body;
            assert.strictEqual(definitions.length, 1);

            const [def] = definitions;
            assert.deepEqual(def, { "file": mockFileName, "start": { "line": 1, "offset": 7 }, "end": { "line": 1, "offset": 10 } });
        });
    });
});

function getDefinitionAtPositionInMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: 'definition', arguments: { file: mockFileName, ...location } });
    }

    return server.close().then(() => server);
}
