# DockerHub MCP Server

A production-ready Model Context Protocol (MCP) server that provides comprehensive DockerHub integration for AI assistants. This server enables AI assistants to search, analyze, and manage Docker images through standardized MCP tools.

## 🚀 Features

### Core Docker Hub Tools
- **docker_search_images** - Search Docker Hub for images
- **docker_get_image_details** - Get detailed information about an image
- **docker_list_tags** - List all tags for a repository
- **docker_get_manifest** - Retrieve image manifest
- **docker_analyze_layers** - Analyze image layers and sizes
- **docker_compare_images** - Compare two images (layers, sizes, base images)
- **docker_get_dockerfile** - Attempt to retrieve Dockerfile (when available)
- **docker_get_stats** - Get download statistics and star count

### Advanced Tools
- **docker_get_vulnerabilities** - Fetch security scan results
- **docker_get_image_history** - Get image build history
- **docker_track_base_updates** - Check if base images have updates
- **docker_estimate_pull_size** - Calculate download size for an image
- **docker_delete_tag** - Delete a tag from your private repository
- **docker_cache_info** - Monitor cache performance and statistics

### Key Capabilities
- ✅ **MCP Client Compatible** - Works with Claude Desktop, Cursor, Cline, and other MCP clients
- ✅ **Private Registry Support** - Access private DockerHub repositories with JWT authentication
- ✅ **Smart Caching System** - Intelligent TTL-based caching with LRU eviction for optimal performance
- ✅ **Rate Limit Handling** - Intelligent request management for DockerHub's API limits
- ✅ **Comprehensive Error Handling** - Graceful fallbacks and clear error messages
- ✅ **TypeScript Implementation** - Full type safety and excellent developer experience
- ✅ **Extensive Testing** - 26 tests covering all functionality and edge cases

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- DockerHub account (for private repositories)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/keshavjha123/PixilAssignment.git
   cd PixilAssignment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your DockerHub credentials
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# DockerHub Authentication (for private repositories)
DOCKERHUB_USERNAME=your-username
DOCKERHUB_PASSWORD=your-password
# OR use a personal access token instead of password
DOCKERHUB_TOKEN=your-personal-access-token

# Optional: Custom API endpoints
DOCKERHUB_API_BASE=https://hub.docker.com/v2
DOCKER_REGISTRY_BASE=https://registry-1.docker.io
```

### Authentication Methods

1. **Username/Password**: Traditional login credentials
2. **Personal Access Token**: Recommended for better security
3. **No Authentication**: For public repositories only

## 🐳 Docker Deployment

### Quick Start with Docker
```bash
# One-command setup (Linux/macOS)
./docker-setup.sh

# One-command setup (Windows PowerShell)
.\docker-setup.ps1
```

### Manual Docker Setup

**Prerequisites:** Make sure you're logged into Docker Hub to avoid rate limiting:
```bash
docker login
```

**For Linux/macOS:**
```bash
# 1. Configure environment (only if .env doesn't exist)
cp .env.example .env
# Edit .env with your DockerHub credentials

# 2. Build and run
docker-compose build
docker-compose up -d

# 3. Verify running
docker-compose ps
```

**For Windows PowerShell:**
```powershell
# 1. Configure environment (only if .env doesn't exist)
Copy-Item .env.example .env
# Edit .env with your DockerHub credentials

# 2. Build and run
docker-compose build
docker-compose up -d

# 3. Verify running
docker-compose ps
```

**⚠️ Note:** Only run the first step if you don't already have a `.env` file with your credentials. The copy command will overwrite existing files.

### ✅ **Docker Mode - TESTED & VERIFIED**

The Docker deployment has been fully tested with:
- ✅ All 16 MCP tools functioning
- ✅ Private repository access working
- ✅ Smart caching and rate limiting active
- ✅ 25/26 tests passing

For detailed Docker deployment instructions, see [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md).

## 🔌 MCP Client Integration

### Claude Desktop

**Standard Installation:**
```json
{
  "mcpServers": {
    "dockerhub": {
      "command": "node",
      "args": ["/path/to/pixil-mcp-server/dist/index.js"],
      "env": {
        "DOCKERHUB_USERNAME": "your-user-name",
        "DOCKERHUB_PASSWORD": "your-token-here",
        "DOCKERHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```


### To access a private repository, specify the full repository name in your Claude Desktop in your conversation (e.g., `keshavmadhav12/keshavprivaterepo`). 
### Alternatively, you can simply mention your DockerHub username to access your private repositories. Use the `docker_list_repositories` tool to retrieve the exact names of your private repositories.


### Cursor/Cline

Configure the MCP server in your IDE settings to enable Docker image analysis capabilities.

## 📚 Usage Examples

### Search for Images
```
Find the most popular Python images
```

### Analyze Image Layers
```
Analyze the layers of nginx:latest and show optimization opportunities
```

### Compare Images
```
Compare ubuntu:20.04 and ubuntu:22.04 and show the differences
```

### Security Analysis
```
Check if my-org/my-app:latest has any critical vulnerabilities
```

### Private Repository Management
```
List all tags for my-private-repo and delete outdated ones
```

## 🧪 Development & Testing

### Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## Linting

ESLint is configured to handle JavaScript files. TypeScript files are checked by the TypeScript compiler during `npm run build`.

To run linting:
```bash
npm run build  # TypeScript checking




### Test with Private Repositories
```bash
# Configure your credentials in .env first
node local_test/mcp-bulk-client-private.mjs
```

## 📖 API Documentation

### Tool Schemas

All tools use Zod schemas for validation:

```typescript
// Example: docker_search_images
inputSchema: z.object({
  query: z.string(),
  limit: z.number().optional()
})

outputSchema: z.object({
  images: z.array(z.object({
    name: z.string(),
    description: z.string(),
    stars: z.number(),
    pulls: z.number()
  }))
})
```

### Error Handling

All errors are returned in MCP-compliant format:

```json
{
  "error": {
    "code": "DOCKER_API_ERROR",
    "message": "Failed to fetch image details: 404 Not Found"
  }
}
```

## 🔒 Security Considerations

- **Never commit credentials** to version control
- **Use personal access tokens** instead of passwords
- **Implement proper secret management** in production
- **Monitor API usage** to prevent rate limit abuse
- **Validate all inputs** using Zod schemas

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DOCKERHUB_TOKEN=production-token
LOG_LEVEL=info
```

### Process Management
```bash
# Using PM2
pm2 start dist/index.js --name dockerhub-mcp

# Using systemd
sudo systemctl enable dockerhub-mcp
sudo systemctl start dockerhub-mcp
```

### Monitoring
- Monitor API rate limits
- Track response times
- Log authentication failures
- Alert on service disruptions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📋 Roadmap

### Immediate Priorities
- [ ] Persistent caching with Redis (in-memory caching implemented)
- [ ] Rate limit visualization
- [ ] Batch operations
- [ ] Enhanced error recovery

### Future Enhancements
- [ ] StreamableHTTP transport
- [ ] Multi-registry support
- [ ] Web dashboard
- [ ] Prometheus metrics
- [ ] Vulnerability severity filtering
- [ ] License compliance checking

## � Troubleshooting

### Common Issues

**Authentication Failures:**
- Verify your DockerHub credentials
- Check token permissions and scopes
- Ensure 2FA is properly configured

**Rate Limiting:**
- Use authenticated requests when possible
- Built-in smart caching reduces API calls automatically
- Intelligent request queuing handles high-volume usage

**Connection Issues:**
- Verify network connectivity to DockerHub
- Check firewall and proxy settings
- Validate API endpoint URLs

### Debug Mode
```bash
DEBUG=* npm start
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [DockerHub API Documentation](https://docs.docker.com/docker-hub/api/latest/)
- [Docker Registry API](https://docs.docker.com/registry/spec/api/)

## 💬 Support

- Create an issue for bug reports
- Start a discussion for feature requests
- Check the documentation for common questions

---

**Made with ❤️ for the Docker and AI community**

---


## 🧰 MCP Tools Implemented

This server implements the following MCP tools:

- **docker_search_images**: Search Docker Hub for images
- **docker_get_image_details**: Get detailed information about an image
- **docker_list_tags**: List all tags for a repository
- **docker_get_manifest**: Retrieve image manifest
- **docker_analyze_layers**: Analyze image layers and sizes
- **docker_compare_images**: Compare two images (layers, sizes, base images)
- **docker_get_dockerfile**: Attempt to retrieve Dockerfile (when available)
- **docker_get_stats**: Get download statistics and star count

### Bonus Tools

- **docker_get_vulnerabilities**: Fetch security scan results (if available)
- **docker_get_image_history**: Get image build history
- **docker_track_base_updates**: Check if base images have updates
- **docker_estimate_pull_size**: Estimate the total download size for a DockerHub image tag (shows total bytes and layer breakdown).

---

## 📖 Tool API Reference

Each tool is available via the MCP protocol. Here’s a quick summary of what each tool expects and returns:

### docker_search_images
**Input:** `{ query: string }`
**Output:** `{ results: any }`

### docker_get_image_details
**Input:** `{ namespace: string, repository: string }`
**Output:** `{ details: any }`

### docker_list_tags
**Input:** `{ namespace: string, repository: string }`
**Output:** `{ tags: string[] }`

### docker_get_manifest
**Input:** `{ namespace: string, repository: string, tag: string }`
**Output:** `{ manifest: any }`

### docker_analyze_layers
**Input:** `{ namespace: string, repository: string, tag: string }`
**Output:** `{ layers: any[], totalSize: number }`

### docker_compare_images
**Input:** `{ image1: { namespace, repository, tag }, image2: { namespace, repository, tag } }`
**Output:** `{ comparison: any }`

### docker_get_dockerfile
**Input:** `{ namespace: string, repository: string, tag: string }`
**Output:** `{ dockerfile: string | null }`

### docker_get_stats
**Input:** `{ namespace: string, repository: string }`
**Output:** `{ pull_count: number, star_count: number }`

---

## 🧑‍💻 Usage Examples

This server is designed to be used by MCP-compatible clients (like Claude Desktop, Cursor, Cline, etc). You can also write your own script to send MCP requests, or use the provided tests as examples.

---

## 🛠 Troubleshooting

- **Authentication errors?** Double-check your `.env` file and DockerHub credentials.
- **Rate limits?** DockerHub enforces strict rate limits. If you hit them, try again later or use authenticated requests.
- **Tool not working as expected?** Run `npm test` to check for issues, and see the logs for error messages.

---

## 📚 Documentation

### Setup and Configuration
- **[Quick Setup Guide](docs/CLAUDE_SETUP.md)** - Step-by-step setup for Claude Desktop
- **[Authentication Guide](docs/AUTHENTICATION.md)** - Complete authentication setup for private repositories
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### API Reference
- **[API Documentation](docs/API.md)** - Complete API reference for all 15 tools
- **[MCP Schema Explanation](docs/MCP_SCHEMA_EXPLANATION.md)** - Understanding MCP tool schemas

### Technical Documentation
- **[Implementation Details](docs/IMPLEMENTATION.md)** - Architecture decisions and technical details
- **[Assignment Checklist](docs/ASSIGNMENT_CHECKLIST.md)** - Development completion tracking

## 🔗 Additional Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Docker Hub API Docs](https://docs.docker.com/docker-hub/api/latest/)
- [MCP Specification](https://modelcontextprotocol.org/spec)

---

## 📝 License

MIT
