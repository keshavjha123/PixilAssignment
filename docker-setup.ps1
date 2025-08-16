# Docker Quick Setup Script for DockerHub MCP Server (PowerShell)
# This script automates the Docker deployment process

param(
    [switch]$SkipTests
)

Write-Host "🐳 DockerHub MCP Server - Docker Quick Setup" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue

# Function definitions
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

# Check prerequisites
Write-Info "Checking prerequisites..."

try {
    docker --version | Out-Null
    Write-Success "Docker is available"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop first."
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Success "docker-compose is available"
} catch {
    Write-Error "docker-compose is not available. Please install Docker Desktop with Compose."
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found. Creating from template..."
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Info "Please edit .env file with your DockerHub credentials:"
        Write-Info "notepad .env"
        Write-Warning "You need to add your DOCKERHUB_TOKEN before continuing"
        
        Read-Host "Press Enter after you've configured .env file"
    } else {
        Write-Error ".env.example not found. Please create .env file manually."
        exit 1
    }
}

# Validate environment variables
Write-Info "Validating environment configuration..."

$envContent = Get-Content ".env" -Raw
if ($envContent -match "your-dockerhub-username|your_token_here|dckr_pat_XXXXXXX") {
    Write-Warning "Default values found in .env file. Please update with real credentials."
    Write-Info "Required variables:"
    Write-Info "- DOCKERHUB_USERNAME=your-actual-username"
    Write-Info "- DOCKERHUB_TOKEN=dckr_pat_your_actual_token"
    
    Read-Host "Press Enter after updating .env file"
}

# Build the Docker image
Write-Info "Building Docker image..."
try {
    $buildOutput = docker-compose build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker image built successfully"
    } else {
        Write-Error "Failed to build Docker image"
        Write-Host $buildOutput
        exit 1
    }
} catch {
    Write-Error "Failed to build Docker image: $_"
    exit 1
}

# Start the container
Write-Info "Starting MCP server container..."
try {
    $startOutput = docker-compose up -d 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Container started successfully"
    } else {
        Write-Error "Failed to start container"
        Write-Host $startOutput
        exit 1
    }
} catch {
    Write-Error "Failed to start container: $_"
    exit 1
}

# Wait for container to be ready
Write-Info "Waiting for container to be ready..."
Start-Sleep -Seconds 5

# Check container status
try {
    $containerId = docker-compose ps -q mcp-server
    if (-not $containerId) {
        Write-Error "Container not found"
        exit 1
    }

    $containerStatus = docker inspect -f '{{.State.Status}}' $containerId
    if ($containerStatus -eq "running") {
        Write-Success "Container is running"
    } else {
        Write-Error "Container is not running (Status: $containerStatus)"
        Write-Info "Checking logs..."
        docker-compose logs mcp-server
        exit 1
    }
} catch {
    Write-Error "Failed to check container status: $_"
    exit 1
}

# Test MCP functionality (optional)
if (-not $SkipTests) {
    Write-Info "Testing MCP functionality..."
    try {
        $testResult = node test-docker-mcp.mjs 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "MCP functionality test passed"
        } else {
            Write-Warning "MCP test failed or test script not found"
            Write-Info "Container is running, you can test manually"
        }
    } catch {
        Write-Warning "MCP test could not be executed"
        Write-Info "Container is running, you can test manually"
    }
}

# Show container information
Write-Info "Container information:"
docker-compose ps
Write-Host ""
docker stats --no-stream $containerId

# Show final instructions
Write-Host ""
Write-Success "🎉 Docker setup completed successfully!"
Write-Host ""
Write-Info "📋 Next Steps:"
Write-Info "1. Configure Claude Desktop with the MCP server"
Write-Info "2. Test with commands like 'Search for nginx images'"
Write-Info "3. Monitor logs with: docker-compose logs -f mcp-server"
Write-Host ""
Write-Info "🔧 Management Commands:"
Write-Info "- Stop container: docker-compose down"
Write-Info "- Restart container: docker-compose restart mcp-server"
Write-Info "- View logs: docker-compose logs -f mcp-server"
Write-Info "- Check status: docker-compose ps"
Write-Host ""
Write-Info "📖 For more details, see docs/DOCKER_DEPLOYMENT.md"

# Claude Desktop configuration hint
Write-Host ""
Write-Warning "🔌 Claude Desktop Configuration:"
Write-Info "Add this to your claude_desktop_config.json:"
$currentPath = (Get-Location).Path.Replace('\', '\\')
$configExample = @"
{
  "mcpServers": {
    "dockerhub-mcp": {
      "command": "docker-compose",
      "args": ["exec", "-T", "mcp-server", "node", "dist/index.js"],
      "cwd": "$currentPath",
      "env": {
        "DOCKERHUB_TOKEN": "your_token_here"
      }
    }
  }
}
"@

Write-Host $configExample -ForegroundColor Gray

Write-Host ""
Write-Info "Configuration file location:"
Write-Info "Windows: %APPDATA%\Claude\claude_desktop_config.json"
