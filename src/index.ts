import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded from the project root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


// Add fallback for missing credentials
if (!process.env.DOCKERHUB_TOKEN) {
    console.error('[WARN] DOCKERHUB_TOKEN not found, some tools may have limited functionality');
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize smart cache system
import { globalCache } from './cache/SmartCache';
import { cachedDockerHubAPI } from './cache/CachedDockerHubAPI';

// Silently initialize cache in background to avoid interfering with MCP startup
setImmediate(async () => {
    try {
        await cachedDockerHubAPI.preloadPopularImages();
    } catch (error) {
        // Silent fail - cache preload is optional
    }
});

// Helper function to register tools with conditional outputSchema
function registerTool(server: McpServer, tool: any) {
    const toolSchema: any = {
        description: tool.description,
        inputSchema: tool.inputSchema
    };
    server.registerTool(tool.name, toolSchema, tool.handler);
    // console.log(`✅ Successfully registered ${tool.name}`);
}

async function startServer() {
    try {
        const server = new McpServer({
            name: "pixil-mcp-server",
            version: "1.0.0"
        });

        // Import modular tool(s) and DockerHub client
        const { dockerGetImageDetails } = await import('./tools/docker_get_image_details');
        const { dockerSearchImages } = await import('./tools/docker_search_images');
        const { dockerListTags } = await import('./tools/docker_list_tags');
        const { dockerGetTagDetails } = await import('./tools/docker_get_tag_details');
        const { dockerDeleteTag } = await import('./tools/docker_delete_tag');
        const { dockerListRepositories } = await import('./tools/docker_list_repositories');
        const { dockerGetManifest } = await import('./tools/docker_get_manifest');
        const { dockerAnalyzeLayers } = await import('./tools/docker_analyze_layers');
        const { dockerCompareImages } = await import('./tools/docker_compare_images');
        const { dockerGetDockerfile } = await import('./tools/docker_get_dockerfile');
        const { dockerGetStats } = await import('./tools/docker_get_stats');
        const { dockerGetVulnerabilities } = await import('./tools/docker_get_vulnerabilities');
        const { dockerEstimatePullSize } = await import('./tools/docker_estimate_pull_size');
        const { dockerGetImageHistory } = await import('./tools/docker_get_image_history');
        const { dockerTrackBaseUpdates } = await import('./tools/docker_track_base_updates');
        const { dockerCacheInfo } = await import('./tools/docker_cache_info');

        // Register all tools using the helper function
        registerTool(server, dockerGetStats(process.env));
        registerTool(server, dockerGetVulnerabilities(process.env));
        registerTool(server, dockerGetDockerfile(process.env));
        registerTool(server, dockerCompareImages(process.env));
        registerTool(server, dockerAnalyzeLayers(process.env));
        registerTool(server, dockerGetManifest(process.env));
        registerTool(server, dockerListRepositories(process.env));
        registerTool(server, dockerDeleteTag(process.env));
        registerTool(server, dockerGetTagDetails(process.env));
        registerTool(server, dockerListTags(process.env));
        registerTool(server, dockerSearchImages(process.env));
        registerTool(server, dockerEstimatePullSize(process.env));
        registerTool(server, dockerGetImageHistory(process.env));
        registerTool(server, dockerTrackBaseUpdates(process.env));
        registerTool(server, dockerGetImageDetails(process.env));
        registerTool(server, dockerCacheInfo(process.env));

        // Register a dummy tool for testing
        const dummyEchoHandler = async (input: { message: string }) => {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: input.message
                    }
                ]
            };
        };

        server.registerTool(
            "dummy_echo",
            {
                description: "Echoes back the input string.",
                inputSchema: { message: z.string() }
            },
            dummyEchoHandler
        );

        // Start the server with StdioServerTransport
        const transport = new StdioServerTransport();
        await server.connect(transport);
    } catch (err) {
        console.error('Failed to start MCP server:', err);
        process.exit(1);
    }
}

startServer();