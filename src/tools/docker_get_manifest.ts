import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";
import axios from "axios";

export const dockerGetManifest = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_manifest",
    description: "Retrieve the manifest for a DockerHub image tag.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { manifest: z.any() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        // Docker Registry API v2 endpoint for manifests
        // e.g. https://registry-1.docker.io/v2/library/nginx/manifests/latest
        const repo = `${input.namespace}/${input.repository}`;
        const url = `https://registry-1.docker.io/v2/${repo}/manifests/${input.tag}`;
        try {
            // Get a token for the registry API
            const authResp = await axios.get(
                `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
            );
            const token = authResp.data.token;
            const manifestResp = await axios.get(url, {
                headers: {
                    Accept: "application/vnd.docker.distribution.manifest.v2+json",
                    Authorization: `Bearer ${token}`
                }
            });
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Manifest for ${repo}:${input.tag}`
                    }
                ],
                manifest: manifestResp.data
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve manifest: ${err?.response?.data?.errors?.[0]?.message || err.message}`
                    }
                ],
                manifest: null
            };
        }
    }
});
