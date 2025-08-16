# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. MCP Server Connection Issues

#### **Problem**: Claude Desktop doesn't recognize the MCP server
**Symptoms:**
- Claude responds with generic Docker information instead of real-time data
- No mention of DockerHub tools in Claude's responses
- Error messages about MCP server not being available

**Solutions:**
1. **Verify Configuration File Location:**
   ```
   Windows: %APPDATA%\Claude\claude_desktop_config.json
   macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
   Linux: ~/.config/Claude/claude_desktop_config.json
   ```

2. **Check Configuration Syntax:**
   ```json
   {
     "mcpServers": {
       "dockerhub-mcp": {
         "command": "node",
         "args": ["d:\\path\\to\\PixilAssignment\\dist\\index.js"],
         "env": {
           "DOCKERHUB_TOKEN": "your_token_here"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop Completely:**
   - Close all Claude Desktop windows
   - End Claude Desktop process in Task Manager (Windows) or Activity Monitor (Mac)
   - Wait 10 seconds and restart

#### **Problem**: MCP server starts but tools don't work
**Symptoms:**
- Claude recognizes the MCP server
- Tools are called but return errors or no data

**Solutions:**
1. **Check Server Logs:**
   ```bash
   # Run server directly to see error messages
   cd d:\pdfReader\PixilAssignment\PixilAssignment
   npm run build
   node dist/index.js
   ```

2. **Test Server Manually:**
   ```bash
   # Use the debug client
   node local_test/debug-client.mjs
   ```

---

### 2. Authentication Issues

#### **Problem**: Private repositories return "Not Found" or "Unauthorized"
**Symptoms:**
- Public repositories work fine
- Private repositories return 404 or 401 errors
- Tools timeout on private repository requests

**Solutions:**
1. **Verify DockerHub Token:**
   ```bash
   # Test token manually
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://registry-1.docker.io/v2/YOUR_USERNAME/YOUR_REPO/tags/list"
   ```

2. **Check Token Permissions:**
   - Go to https://hub.docker.com/settings/security
   - Ensure token has "Public Repo Read" and "Private Repo Read" permissions
   - Regenerate token if necessary

3. **Update Environment Variable:**
   ```bash
   # In your .env file
   DOCKERHUB_TOKEN=dckr_pat_YOUR_NEW_TOKEN_HERE
   ```

4. **Restart MCP Server:**
   - Update the token in Claude Desktop config
   - Restart Claude Desktop completely

#### **Problem**: Token works for some tools but not others
**Symptoms:**
- `docker_search_images` works with authentication
- `docker_analyze_layers` or `docker_compare_images` fail

**Solutions:**
1. **Check Token Format:**
   - Must be Personal Access Token (starts with `dckr_pat_`)
   - NOT a JWT token or session token

2. **Verify Registry Access:**
   ```bash
   # Test registry endpoint
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://registry-1.docker.io/v2/"
   ```

---

### 3. Rate Limiting Issues

#### **Problem**: Tools return "Rate limit exceeded" errors
**Symptoms:**
- First few requests work, then start failing
- Error messages mention rate limits
- Tools become slow or unresponsive

**Solutions:**
1. **Use Authentication:**
   - Authenticated requests have higher rate limits
   - Add DOCKERHUB_TOKEN to your configuration

2. **Reduce Request Frequency:**
   - Wait between requests
   - Use caching when available

3. **Check Current Rate Limit Status:**
   ```bash
   # Check rate limit headers
   curl -I "https://hub.docker.com/v2/repositories/library/nginx/"
   ```

---

### 4. Tool-Specific Issues

#### **docker_search_images**
**Problem**: Search returns no results or incorrect results
**Solutions:**
- Verify search query spelling
- Try broader search terms
- Check if the repository name is correct

#### **docker_analyze_layers**
**Problem**: Layer analysis fails or shows incorrect sizes
**Solutions:**
- Ensure image and tag exist
- Try with a simpler image (e.g., `alpine:latest`)
- Check if image manifest is accessible

#### **docker_compare_images**
**Problem**: Comparison shows "no differences" for clearly different images
**Solutions:**
- Verify both images exist and are accessible
- Check if images are from the same repository
- Try comparing with official images first

#### **docker_get_vulnerabilities**
**Problem**: Vulnerability scanning fails or shows no results
**Solutions:**
- This feature depends on DockerHub's security scanning
- Not all images have vulnerability data available
- Try with popular official images first

---

### 5. Performance Issues

#### **Problem**: Tools are very slow or timeout
**Symptoms:**
- Requests take longer than 30 seconds
- Tools seem to hang
- Claude says the request timed out

**Solutions:**
1. **Check Network Connection:**
   ```bash
   # Test DockerHub connectivity
   curl -w "%{time_total}\n" -o /dev/null -s "https://hub.docker.com"
   ```

2. **Use Smaller Images for Testing:**
   - Start with small images like `alpine:latest`
   - Avoid large images with many layers initially

3. **Monitor System Resources:**
   - Check CPU and memory usage
   - Ensure sufficient system resources

---

### 6. Development and Testing Issues

#### **Problem**: Tests fail with network errors
**Solutions:**
1. **Run Tests with Proper Environment:**
   ```bash
   # Set environment variables
   export DOCKERHUB_TOKEN=your_token
   npm test
   ```

2. **Check Test Configuration:**
   ```bash
   # Run specific test
   npm test -- --testNamePattern="docker_search_images"
   ```

#### **Problem**: Local development server won't start
**Solutions:**
1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Project:**
   ```bash
   npm run build
   ```

3. **Check for Port Conflicts:**
   ```bash
   # Kill any existing Node processes
   taskkill /F /IM node.exe  # Windows
   pkill node                # Mac/Linux
   ```

---

### 7. Error Message Reference

#### **"ENOTFOUND" or "ECONNREFUSED"**
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection and firewall settings

#### **"Invalid token format"**
- **Cause**: Token is not a valid DockerHub Personal Access Token
- **Solution**: Generate a new token at https://hub.docker.com/settings/security

#### **"Repository not found"**
- **Cause**: Repository doesn't exist or is private without proper authentication
- **Solution**: Verify repository name and authentication

#### **"Manifest unknown"**
- **Cause**: Image tag doesn't exist
- **Solution**: Check available tags with `docker_list_tags`

#### **"Too many requests"**
- **Cause**: Rate limit exceeded
- **Solution**: Add authentication token or wait before retrying

---

### 8. Advanced Troubleshooting

#### **Enable Debug Logging**
```bash
# Set debug environment variable
export DEBUG=dockerhub-mcp:*
node dist/index.js
```

#### **Test Individual Components**
```bash
# Test specific DockerHub function
node -e "
const { searchImages } = require('./dist/dockerhubFunctions/searchImages');
searchImages('nginx', 5).then(console.log).catch(console.error);
"
```

#### **Manual MCP Protocol Testing**
```bash
# Use the MCP inspector
npx @modelcontextprotocol/inspector dist/index.js
```

---

### 9. Getting Help

#### **Collect Debug Information**
Before reporting issues, collect:
1. **Environment Information:**
   - Operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)

2. **Configuration:**
   - Claude Desktop config (with token redacted)
   - Environment variables (with sensitive data redacted)

3. **Error Messages:**
   - Complete error messages
   - Console output
   - Server logs

#### **Test with Minimal Example**
```bash
# Try the simplest possible case
echo '{"query": "alpine", "limit": 1}' | node dist/index.js
```

#### **Check Known Issues**
- Review GitHub issues
- Check for updates to MCP SDK
- Verify DockerHub API status

---

### 10. Performance Optimization Tips

#### **For Large Scale Usage**
1. **Implement Caching:**
   - Use Redis for persistent caching
   - Cache frequently accessed data

2. **Optimize Network Requests:**
   - Use HTTP/2 when available
   - Implement request batching

3. **Monitor Resource Usage:**
   - Track memory usage
   - Monitor API rate limits

#### **For Better User Experience**
1. **Use Appropriate Timeouts:**
   - Set reasonable timeout values
   - Implement progressive timeouts

2. **Provide Clear Error Messages:**
   - Include helpful context in errors
   - Suggest possible solutions

---

This troubleshooting guide covers the most common issues. If you encounter problems not covered here, please check the project's GitHub issues or create a new issue with detailed information about your setup and the problem you're experiencing.
