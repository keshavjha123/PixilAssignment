# 🔐 Authentication Setup Guide

## Overview

The DockerHub MCP Server supports both public and private repository access. While public repositories work without authentication, private repositories require proper DockerHub authentication setup.

## Authentication Methods

### 1. Public Repository Access (No Authentication)
- **Use Case**: Accessing public Docker images like `nginx`, `redis`, `python`, etc.
- **Setup**: No additional configuration required
- **Limitations**: Rate limits apply (100 requests per 6 hours)

### 2. Private Repository Access (Authentication Required)
- **Use Case**: Accessing your private Docker repositories
- **Setup**: Requires DockerHub Personal Access Token
- **Benefits**: Higher rate limits, access to private repositories

---

## Setting Up DockerHub Personal Access Token

### Step 1: Create a Personal Access Token

1. **Login to DockerHub:**
   - Go to [hub.docker.com](https://hub.docker.com)
   - Sign in with your DockerHub account

2. **Navigate to Security Settings:**
   - Click on your username (top right)
   - Select "Account Settings"
   - Click on "Security" tab

3. **Generate New Token:**
   - Click "New Access Token"
   - Enter a description (e.g., "MCP Server Access")
   - **Set Permissions:**
     - ✅ **Public Repo Read** (required)
     - ✅ **Private Repo Read** (if you have private repos)
     - ❌ **Public Repo Write** (not needed)
     - ❌ **Private Repo Write** (not needed)
   - Click "Generate"

4. **Copy the Token:**
   - **Important**: Copy the token immediately
   - Format will be: `dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX`
   - Store it securely (you won't see it again)

### Step 2: Configure Environment Variables

#### Method A: Environment File (.env)
Create or update `.env` file in your project root:

```bash
# .env file
DOCKERHUB_TOKEN=dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX
```

#### Method B: System Environment Variables

**Windows (PowerShell):**
```powershell
$env:DOCKERHUB_TOKEN="dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX"
```

**Windows (Command Prompt):**
```cmd
set DOCKERHUB_TOKEN=dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX
```

**macOS/Linux:**
```bash
export DOCKERHUB_TOKEN="dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX"
```

### Step 3: Configure Claude Desktop

Update your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dockerhub-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\your\\PixilAssignment\\dist\\index.js"],
      "env": {
        "DOCKERHUB_TOKEN": "dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

**Important Notes:**
- Replace the path with your actual project path
- Use double backslashes (`\\`) on Windows
- Replace `dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX` with your actual token

---

## Testing Authentication

### Test 1: Verify Token Format
Your token should:
- Start with `dckr_pat_`
- Be approximately 36 characters long
- Contain only alphanumeric characters and underscores

### Test 2: Manual API Test
```bash
# Test public repository access
curl -H "Authorization: Bearer dckr_pat_YOUR_TOKEN" \
     "https://registry-1.docker.io/v2/library/nginx/tags/list"

# Test private repository access (replace with your repo)
curl -H "Authorization: Bearer dckr_pat_YOUR_TOKEN" \
     "https://registry-1.docker.io/v2/yourusername/yourrepo/tags/list"
```

### Test 3: MCP Server Test
```bash
# Run the test client
cd your_project_directory
node local_test/debug-client.mjs
```

### Test 4: Claude Desktop Test
Ask Claude: "List the tags for my private repository username/repository-name"

---

## Authentication Patterns

### Automatic Fallback Authentication
The MCP server implements intelligent authentication fallback:

```
1. Try request without authentication (for public repos)
2. If 401/404 error, retry with authentication
3. If still fails, return appropriate error message
```

### Bearer Token Authentication
The server uses Docker Registry API v2 with Bearer tokens:

```typescript
// Automatic bearer token generation
const bearerToken = await getBearerToken(repository, scope);
const headers = {
  'Authorization': `Bearer ${bearerToken}`,
  'Accept': 'application/vnd.docker.distribution.manifest.v2+json'
};
```

### JWT Token Handling
For DockerHub API endpoints, JWT tokens are used:

```typescript
// JWT authentication for DockerHub API
const headers = {
  'Authorization': `JWT ${DOCKERHUB_TOKEN}`,
  'Content-Type': 'application/json'
};
```

---

## Rate Limits and Best Practices

### DockerHub Rate Limits

#### **Anonymous Requests:**
- 100 requests per 6 hours per IP
- Shared across all anonymous users from same IP

#### **Authenticated Requests:**
- 200 requests per 6 hours per user
- Personal rate limit (not shared)

### Best Practices

1. **Use Authentication When Possible:**
   - Higher rate limits
   - Access to private repositories
   - Better error messages

2. **Cache Responses:**
   - Avoid repeated requests for same data
   - Use reasonable cache TTL values

3. **Handle Rate Limits Gracefully:**
   - Implement exponential backoff
   - Show clear error messages to users

4. **Secure Token Storage:**
   - Never commit tokens to version control
   - Use environment variables
   - Rotate tokens regularly

---

## Security Considerations

### Token Security
- **Scope Principle**: Only grant necessary permissions
- **Rotation**: Rotate tokens every 90 days
- **Monitoring**: Monitor token usage in DockerHub settings
- **Revocation**: Revoke tokens immediately if compromised

### Environment Security
- Use `.env` files for local development
- Add `.env` to `.gitignore`
- Use secure secret management in production

### Network Security
- All API calls use HTTPS
- Tokens are never logged or exposed
- Error messages don't reveal sensitive information

---

## Troubleshooting Authentication

### Common Issues

#### **"Invalid token format"**
**Problem**: Token doesn't start with `dckr_pat_`
**Solution**: Generate a new Personal Access Token, not a legacy password

#### **"Authorization failed"**
**Problem**: Token lacks necessary permissions
**Solution**: Regenerate token with "Public Repo Read" permission

#### **"Repository not found"**
**Problem**: Private repository access without authentication
**Solution**: Verify token has "Private Repo Read" permission

#### **"Rate limit exceeded"**
**Problem**: Too many requests
**Solution**: Use authentication for higher limits

### Debug Authentication
```bash
# Check if token is properly set
echo $DOCKERHUB_TOKEN

# Test token validity
curl -H "Authorization: Bearer $DOCKERHUB_TOKEN" \
     "https://registry-1.docker.io/v2/"
```

### Authentication Flow Debugging
```bash
# Enable debug logging
export DEBUG=dockerhub-mcp:auth
node dist/index.js
```

---

## Production Deployment

### Environment Variables
```bash
# Production environment
DOCKERHUB_TOKEN=dckr_pat_production_token
NODE_ENV=production
LOG_LEVEL=info
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV DOCKERHUB_TOKEN=""
CMD ["node", "dist/index.js"]
```

```bash
# Run with authentication
docker run -e DOCKERHUB_TOKEN=dckr_pat_YOUR_TOKEN your-image
```

### Kubernetes Deployment
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-secret
type: Opaque
stringData:
  token: dckr_pat_XXXXXXXXXXXXXXXXXXXXXXXX
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dockerhub-mcp
spec:
  template:
    spec:
      containers:
      - name: mcp-server
        image: your-image
        env:
        - name: DOCKERHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: dockerhub-secret
              key: token
```

---

## Advanced Authentication

### Multiple Token Support
```bash
# Different tokens for different purposes
DOCKERHUB_READ_TOKEN=dckr_pat_read_only_token
DOCKERHUB_WRITE_TOKEN=dckr_pat_write_token
```

### Token Rotation
```bash
# Automated token rotation script
#!/bin/bash
OLD_TOKEN=$DOCKERHUB_TOKEN
NEW_TOKEN=$(generate_new_token.sh)
export DOCKERHUB_TOKEN=$NEW_TOKEN
restart_mcp_server.sh
revoke_token.sh $OLD_TOKEN
```

### Monitoring and Alerting
```javascript
// Monitor authentication failures
const authFailures = new prometheus.Counter({
  name: 'dockerhub_auth_failures_total',
  help: 'Total number of authentication failures'
});

// Alert on rate limit approaching
const rateLimitUsage = new prometheus.Gauge({
  name: 'dockerhub_rate_limit_usage',
  help: 'Current rate limit usage percentage'
});
```

This authentication setup guide provides comprehensive coverage of all authentication scenarios and should enable users to successfully configure both public and private repository access.
