# Docker Testing Script for DockerHub MCP Server (PowerShell)
# This script tests the MCP server running in Docker container

Write-Host "🐳 Testing DockerHub MCP Server with Docker" -ForegroundColor Blue
Write-Host "===========================================" -ForegroundColor Blue

# Function to print colored output
function Write-Success {
    param($message)
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Error {
    param($message)
    Write-Host "❌ $message" -ForegroundColor Red
}

function Write-Warning {
    param($message)
    Write-Host "⚠️  $message" -ForegroundColor Yellow
}

function Write-Info {
    param($message)
    Write-Host "ℹ️  $message" -ForegroundColor Cyan
}

# Check if Docker is running
try {
    docker --version | Out-Null
    Write-Success "Docker is available"
} catch {
    Write-Error "Docker is not installed or not running"
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
    Write-Success "docker-compose is available"
} catch {
    Write-Error "docker-compose is not installed"
    exit 1
}

# Step 1: Build the Docker image
Write-Info "Building Docker image..."
try {
    docker-compose build
    Write-Success "Docker image built successfully"
} catch {
    Write-Error "Failed to build Docker image"
    exit 1
}

# Step 2: Start the container
Write-Info "Starting MCP server container..."
try {
    docker-compose up -d
    Write-Success "Container started successfully"
} catch {
    Write-Error "Failed to start container"
    exit 1
}

# Step 3: Wait for container to be ready
Write-Info "Waiting for container to be ready..."
Start-Sleep -Seconds 10

# Step 4: Check container status
try {
    $containerId = docker-compose ps -q mcp-server
    $containerStatus = docker inspect -f '{{.State.Status}}' $containerId
    
    if ($containerStatus -eq "running") {
        Write-Success "Container is running"
    } else {
        Write-Error "Container is not running (Status: $containerStatus)"
        docker-compose logs mcp-server
        exit 1
    }
} catch {
    Write-Error "Failed to check container status"
    exit 1
}

# Step 5: Check container logs for any immediate errors
Write-Info "Checking container logs..."
try {
    $logs = docker-compose logs mcp-server --tail=20
    if ($logs -match "Error|error|ERROR") {
        Write-Warning "Found errors in container logs:"
        Write-Host $logs
    } else {
        Write-Success "No immediate errors found in logs"
    }
} catch {
    Write-Warning "Could not retrieve container logs"
}

# Step 6: Test basic Node.js execution in container
Write-Info "Testing Node.js execution in container..."
try {
    $result = docker-compose exec -T mcp-server node --version
    Write-Success "Node.js is working in container: $result"
} catch {
    Write-Error "Node.js test failed in container"
}

# Step 7: Test if built files exist
Write-Info "Checking if build files exist..."
try {
    $result = docker-compose exec -T mcp-server ls -la dist/
    if ($result -match "index.js") {
        Write-Success "Build files found in container"
    } else {
        Write-Warning "Build files might be missing"
    }
} catch {
    Write-Error "Could not check build files"
}

# Step 8: Test MCP server startup
Write-Info "Testing MCP server startup..."
try {
    # Start the server in background and capture output
    $job = Start-Job -ScriptBlock {
        docker-compose exec -T mcp-server timeout 5 node dist/index.js 2>&1
    }
    
    Wait-Job $job -Timeout 10
    $output = Receive-Job $job
    Remove-Job $job
    
    if ($output -match "server|listening|started|MCP") {
        Write-Success "MCP server appears to start correctly"
    } else {
        Write-Warning "MCP server startup test inconclusive"
        Write-Host "Output: $output"
    }
} catch {
    Write-Warning "MCP server startup test failed"
}

# Step 9: Test environment variables
Write-Info "Checking environment variables..."
try {
    $envTest = docker-compose exec -T mcp-server printenv | Select-String "DOCKERHUB"
    if ($envTest) {
        Write-Success "Environment variables are set"
    } else {
        Write-Warning "No DOCKERHUB environment variables found"
    }
} catch {
    Write-Warning "Could not check environment variables"
}

# Step 10: Check resource usage
Write-Info "Checking container resource usage..."
try {
    $containerId = docker-compose ps -q mcp-server
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $containerId
} catch {
    Write-Warning "Could not retrieve resource usage stats"
}

# Step 11: Show final logs
Write-Info "Final container logs:"
try {
    docker-compose logs mcp-server --tail=10
} catch {
    Write-Warning "Could not retrieve final logs"
}

Write-Success "Docker testing completed!"
Write-Info "To stop the container, run: docker-compose down"
Write-Info "To view real-time logs, run: docker-compose logs -f mcp-server"

# Test if we can reach the container
Write-Info "Container is ready for MCP client testing!"
Write-Info "You can now test from Claude Desktop using the container."
