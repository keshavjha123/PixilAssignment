import { z } from "zod";
import { getImageStats } from "../dockerhubFunctions/imageStats";

export const dockerGetStats = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_stats",
    description: "Get download statistics and star count for a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { pull_count: z.number(), star_count: z.number() },
    handler: async (input: { namespace: string; repository: string }) => {
        try {
            const stats = await getImageStats(input.namespace, input.repository, env.DOCKERHUB_TOKEN);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Stats for ${input.namespace}/${input.repository}: ${stats.pull_count} pulls, ${stats.star_count} stars.`
                    }
                ],
                structuredContent: {
                    pull_count: stats.pull_count,
                    star_count: stats.star_count
                }
            };
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (typeof err === 'object' && err !== null && 'response' in err) {
                // @ts-expect-error: dynamic property access
                message = err?.response?.data?.detail || err?.message || message;
            } else if (err instanceof Error) {
                message = err.message;
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve stats: ${message}`
                    }
                ],
                structuredContent: {
                    pull_count: 0,
                    star_count: 0
                }
            };
        }
    }
});
