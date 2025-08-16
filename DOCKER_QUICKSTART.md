# 🚀 Docker Quick Start

## One-Command Setup

### Linux/macOS
```bash
chmod +x docker-setup.sh
./docker-setup.sh
```

### Windows (PowerShell)
```powershell
.\docker-setup.ps1
```

## Manual Setup (3 Steps)

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your DockerHub credentials
nano .env  # Linux/macOS
notepad .env  # Windows
```

### 2. Build and Run
```bash
# Build and start container
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Configure Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "dockerhub-mcp": {
      "command": "docker-compose",
      "args": ["exec", "-T", "mcp-server", "node", "dist/index.js"],
      "cwd": "/absolute/path/to/PixilAssignment",
      "env": {
        "DOCKERHUB_TOKEN": "dckr_pat_your_token_here"
      }
    }
  }
}
```

**⚠️ Important**: 
- Replace `/absolute/path/to/PixilAssignment` with your actual project path
- Windows: Use `D:\\\\path\\\\to\\\\PixilAssignment` (double backslashes)
- macOS/Linux: Use `/home/user/path/to/PixilAssignment`

## Configuration File Locations

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Testing

### Test with Claude Desktop
Try these commands:
- "Search for nginx images on DockerHub"
- "List tags for redis repository"
- "Compare ubuntu:20.04 and ubuntu:22.04 images"

### Manual Testing
```bash
# Test MCP functionality
node test-docker-mcp.mjs

# Check container logs
docker-compose logs -f mcp-server
```

## Management Commands

```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f mcp-server

# Stop container
docker-compose down

# Restart container
docker-compose restart mcp-server

# Update and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Container Won't Start
```bash
docker-compose logs mcp-server
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Environment Issues
```bash
# Check environment variables
docker-compose exec mcp-server printenv | grep DOCKERHUB

# Recreate .env file
cp .env.example .env
# Edit with real credentials
```

### Permission Issues (Linux/macOS)
```bash
sudo chown -R $USER:$USER .
chmod +x docker-setup.sh
```

## Full Documentation

For comprehensive deployment instructions, see:
- [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Authentication Setup](docs/AUTHENTICATION.md)
