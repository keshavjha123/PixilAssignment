# Configuration Examples

## Claude Desktop Configuration

Add this to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dockerhub": {
      "command": "node",
      "args": ["D:\\pdfReader\\PixilAssignment\\PixilAssignment\\dist\\index.js"],
      "cwd": "D:\\pdfReader\\PixilAssignment\\PixilAssignment",
      "env": {
        "DOCKERHUB_USERNAME": "keshavmadhav12",
        "DOCKERHUB_TOKEN": "dckr_pat_BL28kKjXplXFx7uoAraKF_V70ac"
      }
    }
  }
}
```

**Important**: The `cwd` (working directory) must point to the project root where the `.env` file is located.

## Troubleshooting Authentication Issues

If tools like `docker_compare_images` and `docker_analyze_layers` fail in Claude Desktop but work locally:

1. **Check Working Directory**: The `cwd` field ensures `.env` file is found
2. **Set Environment Variables**: Use the `env` field to set credentials explicitly (shown above)
3. **Debug Output**: Check Claude Desktop logs for credential loading messages

Common Error Patterns:
- `500 error` → Usually serialization issues (should be fixed)
- `Bearer token auth error` → Missing or incorrect DOCKERHUB_TOKEN
- `Request failed` → Network/rate limiting issues

### Windows Configuration Path
```
%APPDATA%\Claude\claude_desktop_config.json
```

### macOS Configuration Path
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Linux Configuration Path
```
~/.config/Claude/claude_desktop_config.json
```

## Environment Variables

### .env File Example
```env
# DockerHub Authentication
DOCKERHUB_USERNAME=your-username
DOCKERHUB_PASSWORD=your-password
# OR use a personal access token (recommended)
DOCKERHUB_TOKEN=dckr_pat_1234567890abcdef

# Optional: API Configuration
DOCKERHUB_API_BASE=https://hub.docker.com/v2
DOCKER_REGISTRY_BASE=https://registry-1.docker.io

# Optional: Caching Configuration
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300

# Optional: Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST=20

# Optional: Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Production Environment Variables
```bash
# For Docker containers
export DOCKERHUB_TOKEN="dckr_pat_1234567890abcdef"
export NODE_ENV="production"
export LOG_LEVEL="warn"

# For systemd services
Environment=DOCKERHUB_TOKEN=dckr_pat_1234567890abcdef
Environment=NODE_ENV=production
Environment=LOG_LEVEL=warn
```

## Docker Compose Configuration

### Basic Setup
```yaml
version: '3.8'

services:
  dockerhub-mcp:
    build: .
    environment:
      - DOCKERHUB_TOKEN=${DOCKERHUB_TOKEN}
      - NODE_ENV=production
    restart: unless-stopped
    
  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

### Advanced Setup with Redis
```yaml
version: '3.8'

services:
  dockerhub-mcp:
    build: .
    environment:
      - DOCKERHUB_TOKEN=${DOCKERHUB_TOKEN}
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - redis
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

## Kubernetes Deployment

### Secret Configuration
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-mcp-secrets
type: Opaque
stringData:
  DOCKERHUB_TOKEN: "dckr_pat_1234567890abcdef"
```

### Deployment Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dockerhub-mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dockerhub-mcp-server
  template:
    metadata:
      labels:
        app: dockerhub-mcp-server
    spec:
      containers:
      - name: dockerhub-mcp
        image: dockerhub-mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: DOCKERHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: dockerhub-mcp-secrets
              key: DOCKERHUB_TOKEN
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Monitoring Configuration

### Prometheus Metrics (Future)
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dockerhub-mcp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Health Check Configuration
```bash
# Health check endpoint
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "uptime": 12345,
  "cache_stats": {
    "size": 42,
    "expired": 3
  }
}
```

## Security Best Practices

### Token Management
```bash
# Generate a personal access token at:
# https://hub.docker.com/settings/security

# Token should have minimal scopes:
# - repo:read (for private repositories)
# - repo:write (only if using delete operations)
```

### Network Security
```yaml
# docker-compose.yml with network isolation
version: '3.8'

services:
  dockerhub-mcp:
    build: .
    networks:
      - internal
    environment:
      - DOCKERHUB_TOKEN=${DOCKERHUB_TOKEN}
    ports:
      - "127.0.0.1:3000:3000"  # Bind to localhost only

networks:
  internal:
    driver: bridge
    internal: true
```

## Development Configuration

### VS Code Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Git Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run validate
```

## Testing Configuration

### Jest Configuration (jest.config.js)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### Test Environment
```env
# .env.test
DOCKERHUB_TOKEN=test-token
NODE_ENV=test
LOG_LEVEL=silent
```
