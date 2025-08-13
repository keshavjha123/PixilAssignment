
import dotenv from 'dotenv';
dotenv.config();


import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function startServer() {
    // ...existing code...

    try {
        console.log('MCP DockerHub server starting...');
        const transport = new StdioServerTransport();
        const server = new McpServer({
            name: "pixil-mcp-server",
            version: "1.0.0",
            transport
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

        // Register DockerHub get stats tool
        const getStatsTool = dockerGetStats(process.env);
        server.registerTool(
            getStatsTool.name,
            {
                description: getStatsTool.description,
                inputSchema: getStatsTool.inputSchema,
                outputSchema: getStatsTool.outputSchema
            },
            getStatsTool.handler
        );

        // Register DockerHub get vulnerabilities tool (bonus)
        const getVulnerabilitiesTool = dockerGetVulnerabilities(process.env);
        server.registerTool(
            getVulnerabilitiesTool.name,
            {
                description: getVulnerabilitiesTool.description,
                inputSchema: getVulnerabilitiesTool.inputSchema,
                outputSchema: getVulnerabilitiesTool.outputSchema
            },
            getVulnerabilitiesTool.handler
        );
        // Register DockerHub get Dockerfile tool
        const getDockerfileTool = dockerGetDockerfile(process.env);
        server.registerTool(
            getDockerfileTool.name,
            {
                description: getDockerfileTool.description,
                inputSchema: getDockerfileTool.inputSchema,
                outputSchema: getDockerfileTool.outputSchema
            },
            getDockerfileTool.handler
        );
        // Register DockerHub compare images tool
        const compareImagesTool = dockerCompareImages(process.env);
        server.registerTool(
            compareImagesTool.name,
            {
                description: compareImagesTool.description,
                inputSchema: compareImagesTool.inputSchema,
                outputSchema: compareImagesTool.outputSchema
            },
            compareImagesTool.handler
        );
        // Register DockerHub analyze layers tool
        const analyzeLayersTool = dockerAnalyzeLayers(process.env);
        server.registerTool(
            analyzeLayersTool.name,
            {
                description: analyzeLayersTool.description,
                inputSchema: analyzeLayersTool.inputSchema,
                outputSchema: analyzeLayersTool.outputSchema
            },
            analyzeLayersTool.handler
        );
        // Register DockerHub get manifest tool
        const getManifestTool = dockerGetManifest(process.env);
        server.registerTool(
            getManifestTool.name,
            {
                description: getManifestTool.description,
                inputSchema: getManifestTool.inputSchema,
                outputSchema: getManifestTool.outputSchema
            },
            getManifestTool.handler
        );
        // Register DockerHub list repositories tool
        const listRepositoriesTool = dockerListRepositories(process.env);
        server.registerTool(
            listRepositoriesTool.name,
            {
                description: listRepositoriesTool.description,
                inputSchema: listRepositoriesTool.inputSchema,
                outputSchema: listRepositoriesTool.outputSchema
            },
            listRepositoriesTool.handler
        );
        // Register DockerHub delete tag tool
        const deleteTagTool = dockerDeleteTag(process.env);
        server.registerTool(
            deleteTagTool.name,
            {
                description: deleteTagTool.description,
                inputSchema: deleteTagTool.inputSchema,
                outputSchema: deleteTagTool.outputSchema
            },
            deleteTagTool.handler
        );
        // Register DockerHub get tag details tool
        const getTagDetailsTool = dockerGetTagDetails(process.env);
        server.registerTool(
            getTagDetailsTool.name,
            {
                description: getTagDetailsTool.description,
                inputSchema: getTagDetailsTool.inputSchema,
                outputSchema: getTagDetailsTool.outputSchema
            },
            getTagDetailsTool.handler
        );
        // Register DockerHub list tags tool (modular)
        const listTagsTool = dockerListTags(process.env);
        server.registerTool(
            listTagsTool.name,
            {
                description: listTagsTool.description,
                inputSchema: listTagsTool.inputSchema,
                outputSchema: listTagsTool.outputSchema
            },
            listTagsTool.handler
        );

        // Register DockerHub search tool
        const searchImagesTool = dockerSearchImages(process.env);
        server.registerTool(
            searchImagesTool.name,
            {
                description: searchImagesTool.description,
                inputSchema: searchImagesTool.inputSchema,
                outputSchema: searchImagesTool.outputSchema
            },
            searchImagesTool.handler
        );

        // Register DockerHub get image details tool
        const imageDetailsTool = dockerGetImageDetails(process.env);
        server.registerTool(
            imageDetailsTool.name,
            {
                description: imageDetailsTool.description,
                inputSchema: imageDetailsTool.inputSchema,
                outputSchema: imageDetailsTool.outputSchema
            },
            imageDetailsTool.handler
        );

        // Register a dummy tool for testing
        const dummyEchoHandler = async (
            input: { message: string },
            _extra: any
        ) => {
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
                inputSchema: { message: z.string() },
                outputSchema: { echoed: z.string() }
            },
            dummyEchoHandler
        );

        // The server may start automatically with the constructor or transport.
        // If not, check the SDK documentation for the correct start method.
        console.log('MCP server is running.');
    } catch (err) {
        console.error('Failed to start MCP server:', err);
        process.exit(1);
    }
}

startServer();
