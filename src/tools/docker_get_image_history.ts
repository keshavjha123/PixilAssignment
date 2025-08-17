import { z } from "zod";
import { getImageHistory } from "../dockerhubFunctions/imageHistory";

export const dockerGetImageHistory = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_image_history",
    description: "Get image build history for a DockerHub image tag (if available).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { history: z.array(z.any()) },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const history = await getImageHistory(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            const repo = `${input.namespace}/${input.repository}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Found ${history.length} , history: ${JSON.stringify(history)} entries for ${repo}:${input.tag}`
                    }
                ],
                structuredContent: {
                    history
                }
            };
        } catch (err: unknown) {
            const repo = `${input.namespace}/${input.repository}`;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to get history for ${repo}:${input.tag}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    history: []
                }
            };
        }
    }
});
