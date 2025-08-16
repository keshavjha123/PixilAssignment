#!/bin/bash

# Docker Quick Setup Script for DockerHub MCP Server
# This script automates the Docker deployment process

set -e  # Exit on any error

echo "🐳 DockerHub MCP Server - Docker Quick Setup"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

print_success "Docker and docker-compose are available"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Please edit .env file with your DockerHub credentials:"
        print_info "nano .env"
        print_warning "You need to add your DOCKERHUB_TOKEN before continuing"
        
        read -p "Press Enter after you've configured .env file..."
    else
        print_error ".env.example not found. Please create .env file manually."
        exit 1
    fi
fi

# Validate environment variables
print_info "Validating environment configuration..."

if grep -q "your-dockerhub-username\|your_token_here\|dckr_pat_XXXXXXX" .env; then
    print_warning "Default values found in .env file. Please update with real credentials."
    print_info "Required variables:"
    print_info "- DOCKERHUB_USERNAME=your-actual-username"
    print_info "- DOCKERHUB_TOKEN=dckr_pat_your_actual_token"
    
    read -p "Press Enter after updating .env file..."
fi

# Build the Docker image
print_info "Building Docker image..."
if docker-compose build; then
    print_success "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Start the container
print_info "Starting MCP server container..."
if docker-compose up -d; then
    print_success "Container started successfully"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait for container to be ready
print_info "Waiting for container to be ready..."
sleep 5

# Check container status
CONTAINER_ID=$(docker-compose ps -q mcp-server)
if [ -z "$CONTAINER_ID" ]; then
    print_error "Container not found"
    exit 1
fi

CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' $CONTAINER_ID)
if [ "$CONTAINER_STATUS" = "running" ]; then
    print_success "Container is running"
else
    print_error "Container is not running (Status: $CONTAINER_STATUS)"
    print_info "Checking logs..."
    docker-compose logs mcp-server
    exit 1
fi

# Test MCP functionality
print_info "Testing MCP functionality..."
if node test-docker-mcp.mjs 2>/dev/null; then
    print_success "MCP functionality test passed"
else
    print_warning "MCP test failed or test script not found"
    print_info "Container is running, you can test manually"
fi

# Show container information
print_info "Container information:"
docker-compose ps
echo
docker stats --no-stream $CONTAINER_ID

# Show final instructions
echo
print_success "🎉 Docker setup completed successfully!"
echo
print_info "📋 Next Steps:"
print_info "1. Configure Claude Desktop with the MCP server"
print_info "2. Test with commands like 'Search for nginx images'"
print_info "3. Monitor logs with: docker-compose logs -f mcp-server"
echo
print_info "🔧 Management Commands:"
print_info "- Stop container: docker-compose down"
print_info "- Restart container: docker-compose restart mcp-server"
print_info "- View logs: docker-compose logs -f mcp-server"
print_info "- Check status: docker-compose ps"
echo
print_info "📖 For more details, see docs/DOCKER_DEPLOYMENT.md"

# Claude Desktop configuration hint
echo
print_warning "🔌 Claude Desktop Configuration:"
print_info "Add this to your claude_desktop_config.json:"
echo '{
  "mcpServers": {
    "dockerhub-mcp": {
      "command": "docker-compose",
      "args": ["exec", "-T", "mcp-server", "node", "dist/index.js"],
      "cwd": "'$(pwd)'",
      "env": {
        "DOCKERHUB_TOKEN": "your_token_here"
      }
    }
  }
}'
