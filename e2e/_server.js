// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// @ts-check


const { fork } = require('child_process');
const path = require('path');
const readline = require('readline');

class TSServer {
    constructor(project, pluginName) {
        const logfile = path.join(__dirname, 'log.txt');
        const tsserverPath = path.join(__dirname, 'node_modules', 'typescript', 'lib', 'tsserver');
        const server = fork(tsserverPath, [
            '--logVerbosity', 'verbose',
            '--logFile', logfile,
            '--pluginProbeLocations', project,
            '--globalPlugins', pluginName
        ], {
                cwd: project,
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            });
        this._exitPromise = new Promise((resolve, reject) => {
            server.on('exit', code => resolve(code));
            server.on('error', reason => reject(reason));
        });
        server.stdout.setEncoding('utf-8');
        readline.createInterface({
            input: server.stdout
        }).on('line', line => {
            if (line[0] === '{') {
                try {
                    this.responses.push(JSON.parse(line));
                } catch (e) {
                    // console.log(line);
                }
            }
        });

        this._isClosed = false;
        this._server = server;
        this._seq = 0;
        this.responses = [];
    }

    send(command) {
        if (this._isClosed) {
            throw new Error('Server closed');
        }
        const seq = ++this._seq;
        const req = JSON.stringify(Object.assign({ seq: seq, type: 'request' }, command)) + '\n';
        this._server.stdin.write(req);
    }

    close() {
        if (!this._isClosed) {
            this._isClosed = true;
            setTimeout(() => this._server.stdin.end(), 200);
        }
        return this._exitPromise;
    }
}

function createServer(cwd, pluginName) {
    return new TSServer(cwd, pluginName);
}

module.exports = createServer;
