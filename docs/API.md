# API Documentation

## Overview

This MCP server provides comprehensive DockerHub integration through a set of standardized tools. Each tool is designed to handle specific Docker image operations with proper error handling and authentication support.

## Authentication

All tools support both public and private repository access:

- **Public repositories**: No authentication required
- **Private repositories**: Requires DockerHub JWT token via `DOCKERHUB_TOKEN` environment variable

## Tools Reference

### docker_search_images

Search for Docker images on DockerHub.

**Input Schema:**
```json
{
  "query": "string (required)",
  "limit": "number (optional, default: 25)"
}
```

**Output:**
```json
{
  "images": [
    {
      "name": "string",
      "description": "string", 
      "stars": "number",
      "pulls": "number",
      "official": "boolean",
      "automated": "boolean"
    }
  ],
  "total": "number"
}
```

**Example:**
```bash
# Search for nginx images
{
  "query": "nginx",
  "limit": 10
}
```

### docker_get_image_details

Get detailed information about a specific Docker image.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)"
}
```

**Output:**
```json
{
  "name": "string",
  "description": "string",
  "stars": "number",
  "pulls": "number",
  "lastUpdated": "string",
  "user": "string",
  "isPrivate": "boolean"
}
```

### docker_list_tags

List all available tags for a repository.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "limit": "number (optional, default: 100)"
}
```

**Output:**
```json
{
  "tags": [
    {
      "name": "string",
      "lastUpdated": "string",
      "size": "number",
      "architecture": "string"
    }
  ],
  "total": "number"
}
```

### docker_get_manifest

Retrieve the Docker manifest for a specific image tag.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "manifest": "object",
  "mediaType": "string",
  "schemaVersion": "number"
}
```

### docker_analyze_layers

Analyze the layers and calculate total size of a Docker image.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "layers": [
    {
      "digest": "string",
      "size": "number",
      "mediaType": "string"
    }
  ],
  "totalSize": "number",
  "layerCount": "number"
}
```

### docker_compare_images

Compare two Docker images to analyze differences in layers, sizes, and base images.

**Input Schema:**
```json
{
  "image1": {
    "namespace": "string (required)",
    "repository": "string (required)",
    "tag": "string (required)"
  },
  "image2": {
    "namespace": "string (required)",
    "repository": "string (required)",
    "tag": "string (required)"
  }
}
```

**Output:**
```json
{
  "sizeDifference": "number",
  "layerDifference": "number",
  "commonLayers": "number",
  "uniqueToImage1": "number",
  "uniqueToImage2": "number",
  "baseImageSame": "boolean"
}
```

### docker_get_dockerfile

Attempt to retrieve the Dockerfile for an image (when available).

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (optional, default: latest)"
}
```

**Output:**
```json
{
  "dockerfile": "string or null",
  "available": "boolean",
  "source": "string"
}
```

### docker_get_stats

Get download statistics and popularity metrics for an image.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)"
}
```

**Output:**
```json
{
  "pullCount": "number",
  "starCount": "number",
  "lastUpdated": "string",
  "repositoryType": "string"
}
```

### docker_get_vulnerabilities

Fetch security vulnerability scan results (when available).

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "vulnerabilities": [
    {
      "severity": "string",
      "package": "string",
      "version": "string",
      "fixedIn": "string"
    }
  ],
  "summary": {
    "critical": "number",
    "high": "number", 
    "medium": "number",
    "low": "number"
  }
}
```

### docker_get_image_history

Get the build history of a Docker image.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "history": [
    {
      "created": "string",
      "createdBy": "string",
      "size": "number"
    }
  ],
  "totalLayers": "number"
}
```

### docker_track_base_updates

Check if base images have available updates.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "baseImage": "string or null",
  "isUpToDate": "boolean or null", 
  "latestBaseTag": "string or null",
  "recommendation": "string"
}
```

### docker_estimate_pull_size

Calculate the estimated download size for pulling an image.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "estimatedSize": "number",
  "compressedSize": "number",
  "uncompressedSize": "number",
  "layerCount": "number"
}
```

### docker_delete_tag

Delete a tag from your private DockerHub repository.

**Input Schema:**
```json
{
  "namespace": "string (required)",
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "success": "boolean",
  "message": "string"
}
```

**Note**: This operation requires authentication and appropriate permissions.

## Error Handling

All tools return errors in MCP-compliant format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `DOCKER_API_ERROR`: General DockerHub API error
- `AUTHENTICATION_ERROR`: Invalid or missing credentials
- `NOT_FOUND`: Repository or tag not found
- `RATE_LIMITED`: Too many requests
- `NETWORK_ERROR`: Connection issues

### docker_list_repositories

List repositories for a user or organization on DockerHub.

**Input Schema:**
```json
{
  "username": "string (required)",
  "limit": "number (optional, default: 25)"
}
```

**Output:**
```json
{
  "repositories": [
    {
      "name": "string",
      "namespace": "string", 
      "description": "string",
      "is_private": "boolean",
      "star_count": "number",
      "pull_count": "number",
      "last_updated": "string"
    }
  ],
  "total": "number"
}
```

**Example:**
```bash
# List repositories for user
{
  "username": "library",
  "limit": 10
}
```

### docker_get_tag_details

Get detailed information about a specific tag including creation date, size, and last updated time.

**Input Schema:**
```json
{
  "repository": "string (required)",
  "tag": "string (required)"
}
```

**Output:**
```json
{
  "name": "string",
  "repository": "string",
  "tag": "string",
  "digest": "string",
  "compressed_size": "number",
  "full_size": "number",
  "last_updated": "string",
  "last_updater_username": "string",
  "architecture": "string",
  "os": "string"
}
```

**Example:**
```bash
# Get tag details
{
  "repository": "library/nginx",
  "tag": "alpine"
}
```

### docker_cache_info

Monitor smart cache performance and statistics.

**Input:**
```json
{
  "action": "info|stats|clear"
}
```

**Output:**
```json
{
  "cache": {
    "info": {
      "config": {
        "maxSize": 2000,
        "defaultTTL": 1800000,
        "cleanupInterval": 300000,
        "enableStats": true
      },
      "stats": {
        "totalRequests": 150,
        "cacheHits": 120,
        "cacheMisses": 30,
        "hitRate": 80,
        "entries": 25,
        "memoryUsage": 1024000
      }
    }
  }
}
```

**Example:**
```bash
# Get cache statistics
{
  "action": "stats"
}

# Clear cache
{
  "action": "clear"
}
```

## Rate Limiting

DockerHub enforces rate limits:
- **Unauthenticated**: 100 pulls per 6 hours
- **Authenticated**: 200 pulls per 6 hours (free tier)

The server automatically handles rate limiting and implements fallback strategies.

## Best Practices

1. **Use authentication** for better rate limits and private repository access
2. **Leverage built-in caching** - static data is automatically cached for optimal performance
3. **Monitor cache performance** using the `docker_cache_info` tool
4. **Handle errors gracefully** in your client application
5. **Monitor usage** to avoid hitting rate limits
6. **Use specific tags** instead of 'latest' for reproducible results
