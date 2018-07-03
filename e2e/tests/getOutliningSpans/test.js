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

describe('OutliningSpans', () => {
    it('should return spans on single line', async () => {
        const spans = await getSpansInMockFile(
            'const q = test`a{bcd}e{f}g`'
        );
        assert.strictEqual(spans.length, 2);

        const [span1, span2] = spans;
        assertPosition(span1.textSpan.start, 1, 17);
        assertPosition(span1.textSpan.end, 1, 22);
        assertPosition(span1.hintSpan.start, 1, 18);
        assertPosition(span1.hintSpan.end, 1, 21);

        assertPosition(span2.textSpan.start, 1, 23);
        assertPosition(span2.textSpan.end, 1, 26);
        assertPosition(span2.hintSpan.start, 1, 24);
        assertPosition(span2.hintSpan.end, 1, 25);
    });

    it('should return spans on multiple lines line', async () => {
        const spans = await getSpansInMockFile([
            'const q = test`',
            'a{bcd}e',
            '{f}g',
            '`'
        ].join('\n'));
        assert.strictEqual(spans.length, 2);

        const [span1, span2] = spans;
        assertPosition(span1.textSpan.start, 2, 2);
        assertPosition(span1.textSpan.end, 2, 7);
        assertPosition(span1.hintSpan.start, 2, 3);
        assertPosition(span1.hintSpan.end, 2, 6);

        assertPosition(span2.textSpan.start, 3, 1);
        assertPosition(span2.textSpan.end, 3, 4);
        assertPosition(span2.hintSpan.start, 3, 2);
        assertPosition(span2.hintSpan.end, 3, 3);
    });
});

function getSpansInMockFile(contents) {
    const server = createServerWithMockFile(contents);
    server.send({ command: 'getOutliningSpans', arguments: { file: mockFileName } });
    return server.close().then(() => getFirstResponseOfType('getOutliningSpans', server).body);
}

function assertPosition(pos, line, offset) {
    assert.strictEqual(pos.line, line);
    assert.strictEqual(pos.offset, offset);
}