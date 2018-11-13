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

describe('Completions', () => {
    it('should return completions inside tagged, single line template', async () => {
        const server = await getCompletionsInMockFile('const q = test`abcdefg`',
            { offset: 16, line: 1 },
            { offset: 18, line: 1 },
            { offset: 23, line: 1 });
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

    it('should not return completions before tagged template', async () => {
        const server = await getCompletionsInMockFile('const q = test`abcdefg`',
            { offset: 1, line: 1 },
            { offset: 15, line: 1 });
        const completionsResponses = getResponsesOfType('completions', server);
        for (const response of completionsResponses) {
            assert.isTrue(response.success);
            assert.isFalse(response.body.some(item => item.kindModifiers === 'echo'));
        }
    });

    it('should return completions for template tag ending with tag name', async () => {
        const server = await getCompletionsInMockFile('const q = this.is().a.test`abcdefg`',
            { offset: 30, line: 1 });
        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
    });

    it('should not return completions for non-tagged template', async () => {
        const server = await getCompletionsInMockFile('const q = `abcdefg`', { offset: 12, line: 1 });
        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 0);
    });

    it('should return completions for multiline strings', async () => {
        const server = await getCompletionsInMockFile([
            'const q = test`abc',
            'cdefg`'
        ].join('\n'), { offset: 1, line: 2 }, { offset: 3, line: 2 });
        const completionsResponses = getResponsesOfType('completions', server);
        assert.strictEqual(completionsResponses.length, 2);
        assert.strictEqual(completionsResponses[0].body.length, 1);
        assert.strictEqual(completionsResponses[0].body[0].name, '');
        assert.strictEqual(completionsResponses[1].body.length, 1);
        assert.strictEqual(completionsResponses[1].body[0].name, 'cd');
    });

    it('should ignore placeholders in string', async () => {
        const server = await getCompletionsInMockFile('test`abc${123}e${4}${5}fg`', { offset: 8, line: 1 }, { offset: 16, line: 1 }, { offset: 25, line: 1 });
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

    it('should allow tag to have space after it', async () => {
        const server = await getCompletionsInMockFile(
            'const q = test            `abcdefg`',
            { offset: 30, line: 1 }
        );

        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
    });

    it('should allow tag to be a function call', async () => {
        const server = await getCompletionsInMockFile(
            'const q = test("bla")`abcdefg`',
            { offset: 25, line: 1 }
        );

        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
    });

    it('should allow tag to have template parameters', async () => {
        const server = await getCompletionsInMockFile(
            'const q = test<number>`abcdefg`',
            { offset: 26, line: 1 }
        );
        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
    });

    it('should allow call tag to have template parameters', async () => {
        const server = await getCompletionsInMockFile(
            "const q = test<number>('')`abcdefg`",
            { offset: 30, line: 1 }
        );
        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
    });

    it('should translate replacementSpan', async () => {
        const server = await getCompletionsInMockFile(
            [
                "",
                "const q = test`abcdefg`"
            ].join('\n'),
            { offset: 18, line: 2 }
        );
        const response = getFirstResponseOfType('completions', server);
        assert.isTrue(response.success);
        assert.strictEqual(response.body.length, 1);
        assert.strictEqual(response.body[0].name, 'ab');
        assert.strictEqual(response.body[0].kindModifiers, 'echo');
        assert.strictEqual(response.body[0].replacementSpan.start.line, 2);
        assert.strictEqual(response.body[0].replacementSpan.start.offset, 16);
    });
});

async function getCompletionsInMockFile(contents, ...locations) {
    const server = createServerWithMockFile(contents);

    for (const location of locations) {
        server.send({ command: 'completions', arguments: { file: mockFileName, ...location } });
    }

    await server.close();
    return server;
}