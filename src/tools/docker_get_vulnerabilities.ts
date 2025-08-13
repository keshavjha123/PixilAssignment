import { z } from "zod";
import axios from "axios";

export const dockerGetVulnerabilities = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_vulnerabilities",
    description: "Fetch security scan results (vulnerabilities) for a DockerHub image tag, if available.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { vulnerabilities: z.any().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            // DockerHub's API for vulnerabilities is not public for all images.
            // For official images, try the DockerHub API endpoint (may require credentials and may not always be available)
            const repo = `${input.namespace}/${input.repository}`;
            const url = `https://hub.docker.com/v2/repositories/${repo}/tags/${input.tag}/images`;
            const resp = await axios.get(url);
            const images = resp.data.results || [];
            // Vulnerabilities may be under 'scan_results' or similar
            let vulnerabilities = null;
            for (const image of images) {
                if (image.scan_results && image.scan_results.vulnerabilities) {
                    vulnerabilities = image.scan_results.vulnerabilities;
                    break;
                }
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: vulnerabilities
                            ? `Vulnerabilities found for ${repo}:${input.tag}`
                            : `No vulnerability data available for ${repo}:${input.tag}`
                    }
                ],
                vulnerabilities
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve vulnerabilities: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                vulnerabilities: null
            };
        }
    }
});
