import { z } from "zod";
import { getImageVulnerabilities } from "../dockerhubFunctions/imageVulnerabilities";

export const dockerGetVulnerabilities = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_vulnerabilities",
    description: "Fetch security scan results (vulnerabilities) for a DockerHub image tag, if available.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { vulnerabilities: z.any().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const result = await getImageVulnerabilities(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            const repo = `${input.namespace}/${input.repository}`;
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: result.vulnerabilities
                            ? `Vulnerabilities found for ${repo}:${input.tag}`
                            : `No vulnerability data available for ${repo}:${input.tag}`
                    }
                ],
                structuredContent: {
                    vulnerabilities: result.vulnerabilities
                }
            };
        } catch (err: unknown) {
            const repo = `${input.namespace}/${input.repository}`;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to fetch vulnerabilities for ${repo}:${input.tag}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    vulnerabilities: null
                }
            };
        }
    }
});
