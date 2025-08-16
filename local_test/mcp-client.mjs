#!/usr/bin/env node
// Minimal MCP client for local testing (Node.js, ES module compatible)
// Usage: node local_test/mcp-client.js

import { spawn } from 'child_process';
import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';

// Path to your MCP server entry point (relative to this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SERVER_PATH = path.join(__dirname, '../dist/index.js');


// Requests for the tools that passed in the private repo bulk test
const PRIVATE_NAMESPACE = 'keshavmadhav12';
const PRIVATE_REPO = 'keshavprivaterepo';

const requests = [
    {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "docker_search_images",
            arguments: { query: PRIVATE_REPO }
        }
    },
    {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
            name: "docker_list_tags",
            arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO }
        }
    },
    {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
            name: "docker_list_repositories",
            arguments: { username: PRIVATE_NAMESPACE }
        }
    }
];

console.log('Starting MCP server as subprocess...');
const server = spawn('node', [MCP_SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'inherit']
});


// Buffer for partial lines
let buffer = '';
server.stdout.on('data', (data) => {
    buffer += data.toString();
    let lines = buffer.split('\n');
    buffer = lines.pop(); // Save incomplete line
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const json = JSON.parse(trimmed);
            console.log('\nTool response:', JSON.stringify(json, null, 2));
        } catch {
            // Print all non-JSON output for debugging
            console.log('Server log:', trimmed);
        }
    }
});

server.on('error', (err) => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
});

// Give the server a moment to start, then send each request
setTimeout(() => {
    for (const req of requests) {
        console.log('Sending tool request:', JSON.stringify(req));
        server.stdin.write(JSON.stringify(req) + '\n');
    }
}, 1000);

// Optionally, exit after more time (20 seconds)
setTimeout(() => {
    server.kill();
    console.log('MCP client finished.');
}, 20000);
