#!/bin/bash

# Docker Testing Script for DockerHub MCP Server
# This script tests the MCP server running in Docker container

echo "🐳 Testing DockerHub MCP Server with Docker"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if Docker is running
if ! docker --version > /dev/null 2>&1; then
    print_error "Docker is not installed or not running"
    exit 1
fi

print_success "Docker is available"

# Check if docker-compose is available
if ! docker-compose --version > /dev/null 2>&1; then
    print_error "docker-compose is not installed"
    exit 1
fi

print_success "docker-compose is available"

# Step 1: Build the Docker image
print_info "Building Docker image..."
if docker-compose build; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Step 2: Start the container
print_info "Starting MCP server container..."
if docker-compose up -d; then
    print_success "Container started successfully"
else
    print_error "Failed to start container"
    exit 1
fi

# Step 3: Wait for container to be ready
print_info "Waiting for container to be ready..."
sleep 10

# Step 4: Check container status
CONTAINER_STATUS=$(docker-compose ps -q mcp-server | xargs docker inspect -f '{{.State.Status}}')
if [ "$CONTAINER_STATUS" = "running" ]; then
    print_success "Container is running"
else
    print_error "Container is not running (Status: $CONTAINER_STATUS)"
    docker-compose logs mcp-server
    exit 1
fi

# Step 5: Check container logs for any immediate errors
print_info "Checking container logs..."
LOGS=$(docker-compose logs mcp-server --tail=20)
if echo "$LOGS" | grep -q "Error\|error\|ERROR"; then
    print_warning "Found errors in container logs:"
    echo "$LOGS"
else
    print_success "No immediate errors found in logs"
fi

# Step 6: Test if the server is responding (if it has an HTTP endpoint)
print_info "Testing server connectivity..."
CONTAINER_IP=$(docker-compose ps -q mcp-server | xargs docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "Container IP: $CONTAINER_IP"

# Step 7: Test MCP protocol directly
print_info "Testing MCP protocol..."
if docker-compose exec -T mcp-server node -e "
const { spawn } = require('child_process');
const child = spawn('node', ['dist/index.js'], { stdio: 'pipe' });

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

child.stdin.write(JSON.stringify(initRequest) + '\n');

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
  if (output.includes('initialized')) {
    console.log('✅ MCP server initialized successfully');
    process.exit(0);
  }
});

child.stderr.on('data', (data) => {
  console.error('❌ Error:', data.toString());
});

setTimeout(() => {
  console.log('❌ Timeout waiting for initialization');
  process.exit(1);
}, 5000);
"; then
    print_success "MCP protocol test passed"
else
    print_error "MCP protocol test failed"
fi

# Step 8: Test with a simple tool call
print_info "Testing docker_search_images tool..."
if docker-compose exec -T mcp-server node -e "
const { spawn } = require('child_process');
const child = spawn('node', ['dist/index.js'], { stdio: 'pipe' });

let initialized = false;

// Send initialization
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

child.stdin.write(JSON.stringify(initRequest) + '\n');

child.stdout.on('data', (data) => {
  const output = data.toString();
  
  if (output.includes('initialized') && !initialized) {
    initialized = true;
    
    // Test docker_search_images
    const toolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'docker_search_images',
        arguments: { query: 'alpine', limit: 1 }
      }
    };
    
    child.stdin.write(JSON.stringify(toolRequest) + '\n');
  }
  
  if (output.includes('docker_search_images') || output.includes('alpine')) {
    console.log('✅ Tool call test passed');
    process.exit(0);
  }
});

child.stderr.on('data', (data) => {
  console.error('❌ Error:', data.toString());
});

setTimeout(() => {
  console.log('❌ Timeout waiting for tool response');
  process.exit(1);
}, 10000);
"; then
    print_success "Tool call test passed"
else
    print_error "Tool call test failed"
fi

# Step 9: Check resource usage
print_info "Checking container resource usage..."
STATS=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose ps -q))
echo "$STATS"

# Step 10: Show final logs
print_info "Final container logs:"
docker-compose logs mcp-server --tail=10

print_success "Docker testing completed!"
print_info "To stop the container, run: docker-compose down"
print_info "To view real-time logs, run: docker-compose logs -f mcp-server"
