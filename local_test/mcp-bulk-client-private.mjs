#!/usr/bin/env node
// Bulk MCP client for testing all tools against a private DockerHub repo
import { spawn } from 'child_process';
import process from 'process';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the parent directory
config({ path: path.join(__dirname, '../.env') });

const MCP_SERVER_PATH = path.join(__dirname, '../dist/index.js');

const PRIVATE_NAMESPACE = 'keshavmadhav12';
const PRIVATE_REPO = 'keshavprivaterepo';
const PRIVATE_TAG = 'latest';

const toolRequests = [
  { name: 'docker_get_stats', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO } },
  { name: 'docker_get_image_details', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO } },
  { name: 'docker_search_images', arguments: { query: PRIVATE_REPO } },
  { name: 'docker_list_tags', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO } },
  { name: 'docker_get_tag_details', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_list_repositories', arguments: { username: PRIVATE_NAMESPACE } },
  { name: 'docker_get_manifest', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_analyze_layers', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_compare_images', arguments: { image1: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG }, image2: { namespace: 'library', repository: 'alpine', tag: 'latest' } } },
  { name: 'docker_get_dockerfile', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_get_vulnerabilities', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_estimate_pull_size', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_get_image_history', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_track_base_updates', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: PRIVATE_TAG } },
  { name: 'docker_delete_tag', arguments: { namespace: PRIVATE_NAMESPACE, repository: PRIVATE_REPO, tag: "nonexistenttag" } },

];

console.log('Starting MCP server as subprocess...');
const server = spawn('node', [MCP_SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env } // Pass environment variables including DOCKERHUB_TOKEN
});

let buffer = '';
let current = 0;
let failures = [];
let responses = [];
let errorDetails = [];

server.stdout.on('data', (data) => {
  buffer += data.toString();
  let lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const json = JSON.parse(trimmed);
      if (json.result) {
        responses.push({ tool: toolRequests[current - 1].name, result: json.result });
        if (json.result.error || (json.result.content && json.result.content[0] && /fail|error/i.test(json.result.content[0].text))) {
          failures.push(toolRequests[current - 1].name);
          errorDetails.push({
            tool: toolRequests[current - 1].name,
            error: json.result.error || (json.result.content && json.result.content[0] && json.result.content[0].text) || 'Unknown error'
          });
        }
      } else if (json.error) {
        failures.push(toolRequests[current - 1].name);
        errorDetails.push({
          tool: toolRequests[current - 1].name,
          error: json.error.message || JSON.stringify(json.error)
        });
      }
      if (current < toolRequests.length) {
        sendNext();
      } else {
        server.kill();
        printSummary();
      }
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

function sendNext() {
  if (current >= toolRequests.length) return;
  const req = {
    jsonrpc: '2.0',
    id: current + 1,
    method: 'tools/call',
    params: toolRequests[current]
  };
  console.log(`\nSending tool request [${req.params.name}]...`);
  server.stdin.write(JSON.stringify(req) + '\n');
  current++;
}

function printSummary() {
  console.log('\n--- MCP Bulk Tool Test Summary (Private Repo) ---');
  const allTools = toolRequests.map(t => t.name);
  const passed = allTools.filter(t => !failures.includes(t));
  if (failures.length === 0) {
    console.log('All tools responded successfully!');
  } else {
    if (passed.length > 0) {
      console.log('The following tools passed successfully:');
      for (const tool of passed) {
        console.log(' +', tool);
      }
    }
    console.log('\nThe following tools failed or returned errors:');
    for (const detail of errorDetails) {
      console.log(' -', detail.tool);
      console.log('   Error:', detail.error);
    }
  }
  process.exit(0);
}

// Give the server a moment to start, then begin
setTimeout(() => sendNext(), 1000);
