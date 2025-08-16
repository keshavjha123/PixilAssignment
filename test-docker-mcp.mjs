// Docker MCP Test Client
// This script tests the MCP server running in Docker by connecting to it

import { spawn } from 'child_process';

console.log('🐳 Testing MCP Server in Docker Container');
console.log('=========================================');

class DockerMCPTester {
    constructor() {
        this.requestId = 0;
        this.responses = [];
    }

    getNextId() {
        return ++this.requestId;
    }

    async testMCPInDocker() {
        console.log('📡 Starting MCP server test in Docker...');
        
        try {
            // Start docker-compose exec to communicate with the server
            const child = spawn('docker-compose', [
                'exec', '-T', 'mcp-server', 
                'node', 'dist/index.js'
            ], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let output = '';
            let toolsTested = 0;

            // Handle stdout
            child.stdout.on('data', (data) => {
                output += data.toString();
                this.processOutput(output);
            });

            // Handle stderr
            child.stderr.on('data', (data) => {
                console.error('❌ Server Error:', data.toString());
            });

            // Initialize the MCP connection
            console.log('🔄 Initializing MCP connection...');
            const initRequest = {
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {}
                    },
                    clientInfo: {
                        name: 'docker-test-client',
                        version: '1.0.0'
                    }
                }
            };

            child.stdin.write(JSON.stringify(initRequest) + '\n');

            // Wait for initialization
            await this.waitForResponse('initialize', 5000);
            console.log('✅ MCP server initialized successfully');

            // Get list of available tools
            console.log('🔄 Getting list of tools...');
            const toolsRequest = {
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'tools/list',
                params: {}
            };

            child.stdin.write(JSON.stringify(toolsRequest) + '\n');
            const toolsResponse = await this.waitForResponse('tools/list', 5000);
            
            if (toolsResponse && toolsResponse.result && toolsResponse.result.tools) {
                console.log(`✅ Found ${toolsResponse.result.tools.length} tools`);
                console.log('📋 Available tools:');
                toolsResponse.result.tools.forEach(tool => {
                    console.log(`   - ${tool.name}: ${tool.description}`);
                });
            }

            // Test docker_search_images
            console.log('🔄 Testing docker_search_images...');
            const searchRequest = {
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'tools/call',
                params: {
                    name: 'docker_search_images',
                    arguments: {
                        query: 'alpine',
                        limit: 3
                    }
                }
            };

            child.stdin.write(JSON.stringify(searchRequest) + '\n');
            const searchResponse = await this.waitForResponse('tools/call', 10000);
            
            if (searchResponse && searchResponse.result) {
                console.log('✅ docker_search_images test passed');
                toolsTested++;
            } else {
                console.log('❌ docker_search_images test failed');
            }

            // Test docker_get_image_details
            console.log('🔄 Testing docker_get_image_details...');
            const detailsRequest = {
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'tools/call',
                params: {
                    name: 'docker_get_image_details',
                    arguments: {
                        repository: 'library/alpine'
                    }
                }
            };

            child.stdin.write(JSON.stringify(detailsRequest) + '\n');
            const detailsResponse = await this.waitForResponse('tools/call', 10000);
            
            if (detailsResponse && detailsResponse.result) {
                console.log('✅ docker_get_image_details test passed');
                toolsTested++;
            } else {
                console.log('❌ docker_get_image_details test failed');
            }

            // Test docker_list_tags
            console.log('🔄 Testing docker_list_tags...');
            const tagsRequest = {
                jsonrpc: '2.0',
                id: this.getNextId(),
                method: 'tools/call',
                params: {
                    name: 'docker_list_tags',
                    arguments: {
                        repository: 'library/alpine'
                    }
                }
            };

            child.stdin.write(JSON.stringify(tagsRequest) + '\n');
            const tagsResponse = await this.waitForResponse('tools/call', 10000);
            
            if (tagsResponse && tagsResponse.result) {
                console.log('✅ docker_list_tags test passed');
                toolsTested++;
            } else {
                console.log('❌ docker_list_tags test failed');
            }

            // Clean up
            child.kill();

            // Summary
            console.log('\n📊 Test Summary:');
            console.log(`✅ Tools tested successfully: ${toolsTested}/3`);
            
            if (toolsTested === 3) {
                console.log('🎉 All tests passed! MCP server is working correctly in Docker.');
                return true;
            } else {
                console.log('⚠️  Some tests failed. Check the logs above for details.');
                return false;
            }

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            return false;
        }
    }

    processOutput(output) {
        // Split by lines and process each JSON response
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.trim() && line.includes('"jsonrpc"')) {
                try {
                    const response = JSON.parse(line.trim());
                    this.responses.push(response);
                } catch (e) {
                    // Ignore non-JSON lines
                }
            }
        }
    }

    async waitForResponse(method, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            
            const check = () => {
                // Look for response with matching method or id
                const response = this.responses.find(r => {
                    if (method === 'initialize' && r.id === 1) return true;
                    if (method === 'tools/list' && r.result && r.result.tools) return true;
                    if (method === 'tools/call' && r.result && (r.result.content || r.result.structuredContent)) return true;
                    return false;
                });

                if (response) {
                    resolve(response);
                    return;
                }

                if (Date.now() - start > timeout) {
                    reject(new Error(`Timeout waiting for ${method} response`));
                    return;
                }

                setTimeout(check, 100);
            };

            check();
        });
    }
}

// Run the test
async function runTest() {
    console.log('🚀 Starting Docker MCP test...\n');
    
    const tester = new DockerMCPTester();
    const success = await tester.testMCPInDocker();
    
    if (success) {
        console.log('\n🎉 Docker MCP test completed successfully!');
        process.exit(0);
    } else {
        console.log('\n❌ Docker MCP test failed!');
        process.exit(1);
    }
}

// Check if docker-compose is available
import { execSync } from 'child_process';

try {
    execSync('docker-compose --version', { stdio: 'ignore' });
    console.log('✅ docker-compose is available');
} catch {
    console.error('❌ docker-compose is not available. Please install docker-compose first.');
    process.exit(1);
}

try {
    execSync('docker-compose ps mcp-server', { stdio: 'ignore' });
    console.log('✅ MCP server container is running');
    runTest();
} catch {
    console.log('⚠️  MCP server container is not running. Starting it now...');
    try {
        execSync('docker-compose up -d', { stdio: 'inherit' });
        console.log('✅ MCP server container started');
        
        // Wait a bit for the container to be ready
        console.log('⏳ Waiting for container to be ready...');
        setTimeout(runTest, 5000);
    } catch {
        console.error('❌ Failed to start MCP server container');
        process.exit(1);
    }
}
