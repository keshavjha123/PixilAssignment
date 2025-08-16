import { z } from "zod";
import { cachedDockerHubAPI } from "../cache/CachedDockerHubAPI";

export const dockerCacheInfo = (env: NodeJS.ProcessEnv) => ({
    name: "docker_cache_info",
    description: "Get information about the smart cache system including hit rates, memory usage, and statistics.",
    inputSchema: {
        action: z.enum(['stats', 'info', 'clear']).optional().default('info')
    },
    outputSchema: {
        cache: z.object({
            stats: z.any().optional(),
            info: z.any().optional(),
            cleared: z.boolean().optional()
        })
    },
    handler: async (input: { action?: 'stats' | 'info' | 'clear' }) => {
        try {
            let result: any = {};
            let actionText = "";

            switch (input.action) {
                case 'stats':
                    result.stats = cachedDockerHubAPI.getCacheStats();
                    actionText = "Cache statistics retrieved";
                    break;
                case 'clear':
                    cachedDockerHubAPI.clearCache();
                    result.cleared = true;
                    actionText = "Cache cleared successfully";
                    break;
                case 'info':
                default:
                    result.info = cachedDockerHubAPI.getCacheInfo();
                    actionText = "Cache information retrieved";
                    break;
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: actionText
                    }
                ],
                structuredContent: {
                    cache: result
                }
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    }
                ],
                structuredContent: {
                    cache: {
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                }
            };
        }
    }
});
