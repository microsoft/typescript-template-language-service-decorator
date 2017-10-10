// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const assert = require('chai').assert;

exports.openMockFile = (server, mockFileName, fileContent) => {
    server.send({
        command: 'open',
        arguments: {
            file: mockFileName,
            fileContent,
            scriptKindName: 'TS'
        }
    });
    return server;
};

exports.getResponsesOfType = (command, server) => {
    return server.responses.filter(response => response.command === command);
};

exports.getFirstResponseOfType = (command, server) => {
    const [response] = exports.getResponsesOfType(command, server)
    assert.isTrue(response !== undefined);
    return response;
};