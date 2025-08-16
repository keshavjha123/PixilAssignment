import { z } from "zod";
import { estimatePullSize } from "../dockerhubFunctions/pullSizeEstimate";

export const dockerEstimatePullSize = (env: NodeJS.ProcessEnv) => ({
    name: "docker_estimate_pull_size",
    description: "Estimate the total download size for a DockerHub image tag.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { totalSize: z.number(), layers: z.array(z.any()) },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const result = await estimatePullSize(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            const repo = `${input.namespace}/${input.repository}`;
            
            // Convert bytes to MB for better readability
            const totalSizeMB = (result.totalSize / (1024 * 1024)).toFixed(2);
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Estimated pull size for ${repo}:${input.tag}: ${totalSizeMB} MB (${result.layers.length} layers)`
                    }
                ],
                structuredContent: {
                    totalSize: result.totalSize,
                    layers: result.layers
                }
            };
        } catch (err: unknown) {
            const repo = `${input.namespace}/${input.repository}`;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to estimate pull size for ${repo}:${input.tag}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    totalSize: 0,
                    layers: []
                }
            };
        }
    }
});
