import { z } from "zod";
import axios from "axios";

export const dockerGetDockerfile = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_dockerfile",
    description: "Attempt to retrieve the Dockerfile for a DockerHub image tag (when available).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { dockerfile: z.string().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        // DockerHub does not provide Dockerfile for all images, but for official images it is available via GitHub links
        // Try to fetch from DockerHub's source_url if available
        try {
            // 1. Get image details from DockerHub API
            const repo = `${input.namespace}/${input.repository}`;
            const detailsResp = await axios.get(`https://hub.docker.com/v2/repositories/${repo}`);
            const details = detailsResp.data;
            // 2. Check for source repository (GitHub) link
            const githubUrl = details?.source_url || details?.github_repo;
            if (githubUrl && githubUrl.includes('github.com')) {
                // Try to guess Dockerfile location (common: /Dockerfile or /master/Dockerfile)
                // Try main branch first, then master
                const repoPath = githubUrl.replace('https://github.com/', '');
                const possibleUrls = [
                    `https://raw.githubusercontent.com/${repoPath}/main/Dockerfile`,
                    `https://raw.githubusercontent.com/${repoPath}/master/Dockerfile`,
                    `https://raw.githubusercontent.com/${repoPath}/Dockerfile`
                ];
                for (const url of possibleUrls) {
                    try {
                        const resp = await axios.get(url);
                        if (resp.status === 200 && resp.data && typeof resp.data === 'string') {
                            return {
                                content: [
                                    {
                                        type: "text" as const,
                                        text: `Dockerfile found for ${repo}:${input.tag}`
                                    }
                                ],
                                dockerfile: resp.data
                            };
                        }
                    } catch (err) {
                        // Try next
                    }
                }
            }
            // 3. If not found, return null
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Dockerfile not found for ${repo}:${input.tag}`
                    }
                ],
                dockerfile: null
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve Dockerfile: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                dockerfile: null
            };
        }
    }
});
