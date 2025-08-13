import { z } from "zod";
import axios from "axios";

export const dockerGetStats = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_stats",
    description: "Get download statistics and star count for a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { pull_count: z.number(), star_count: z.number() },
    handler: async (input: { namespace: string; repository: string }) => {
        try {
            const repo = `${input.namespace}/${input.repository}`;
            const resp = await axios.get(`https://hub.docker.com/v2/repositories/${repo}`);
            const data = resp.data;
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Stats for ${repo}: ${data.pull_count} pulls, ${data.star_count} stars.`
                    }
                ],
                pull_count: data.pull_count,
                star_count: data.star_count
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve stats: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                pull_count: 0,
                star_count: 0
            };
        }
    }
});
