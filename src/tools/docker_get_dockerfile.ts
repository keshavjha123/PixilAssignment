import { z } from "zod";
import { getDockerfile } from "../dockerhubFunctions/dockerfileInfo";

export const dockerGetDockerfile = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_dockerfile",
    description: "Attempt to retrieve the Dockerfile for a DockerHub image tag (when available).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { dockerfile: z.string().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const result = await getDockerfile(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            const repo = `${input.namespace}/${input.repository}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: result.dockerfile
                            ? `Dockerfile found for ${repo}:${input.tag}`
                            : `No Dockerfile available for ${repo}:${input.tag}`
                    }
                ],
                structuredContent: {
                    dockerfile: result.dockerfile
                }
            };
        } catch (err: unknown) {
            const repo = `${input.namespace}/${input.repository}`;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to fetch Dockerfile for ${repo}:${input.tag}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    dockerfile: null
                }
            };
        }
    }
});
