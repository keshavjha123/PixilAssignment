npm install
npm run build
npm start

# Pixil MCP Server

Welcome! This project is a Model Context Protocol (MCP) server for DockerHub integration. It lets AI assistants and MCP clients search, analyze, and manage Docker images using a standardized set of tools.

---

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Copy the example environment file and fill in your DockerHub credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and set your DockerHub username/password or token
   ```
3. **Build the project:**
   ```bash
   npm run build
   ```
4. **Start the server:**
   ```bash
   npm start
   ```

---

## 🛠 Development

- Use `npm run dev` for hot-reloading during development.
- Run all tests with `npm test`.
- Lint and format your code with `npm run lint` and `npm run format`.

---

## ⚙️ Configuration

- All configuration is via environment variables. See `.env.example` for what you need to set (DockerHub credentials, etc).

---

## 🐳 Docker Compose

- For local testing, you can use the provided `docker-compose.yml` (if present) to spin up the server and a local registry.

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

## 📚 Further Reading

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Docker Hub API Docs](https://docs.docker.com/docker-hub/api/latest/)
- [MCP Specification](https://modelcontextprotocol.org/spec)

---

## 📝 License

MIT

## License
MIT
