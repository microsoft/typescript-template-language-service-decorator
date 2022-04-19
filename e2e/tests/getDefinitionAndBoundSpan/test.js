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

describe('getDefinitionAndBoundSpan', () => {
    it('should return blank definition at template literal position', async () => {
        const server = await getDefinitionAndBoundSpanMockFile(
            'test`no_definition`',
            { offset: 6, line: 1 }
        );

        const { definitions } = getFirstResponseOfType('definitionAndBoundSpan', server).body;
        assert.strictEqual(definitions.length, 0);
    });

    it('should still return js/ts definitions at template literal position', async () => {
        const server = await getDefinitionAndBoundSpanMockFile(
            'test`foo`',
            { offset: 6, line: 1 }
        );

        const { definitions, textSpan } = getFirstResponseOfType('definitionAndBoundSpan', server).body;
        assert.strictEqual(definitions.length, 1);
        const [def] = definitions;
        assert.deepEqual(def, { "file": mockFileName, "start": { "line": 1, "offset": 6 }, "end": { "line": 1, "offset": 11 } });
        assert.deepEqual(textSpan, { "start": { "line": 1, "offset": 6 }, "end": { "line": 1, "offset": 10 } });
    });
});

function getDefinitionAndBoundSpanMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: 'definitionAndBoundSpan', arguments: { file: mockFileName, ...location } });
    }

    return server.close().then(() => server);
}
