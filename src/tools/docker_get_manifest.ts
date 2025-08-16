import { z } from "zod";
import { getManifestDetails } from "../dockerhubFunctions/manifestDetails";
import { cachedDockerHubAPI } from "../cache/CachedDockerHubAPI";

export const dockerGetManifest = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_manifest",
    description: "Retrieve the manifest for a DockerHub image tag.",
    inputSchema: {
        namespace: z.string(),
        repository: z.string(),
        tag: z.string()
    },
    outputSchema: {
        manifest: z.any().nullable()
    },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        const repo = `${input.namespace}/${input.repository}`;
        try {
            // Use cached version for manifest details - static data safe to cache
            const manifest = await cachedDockerHubAPI.getManifest(input.namespace, input.repository, input.tag);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Manifest for ${repo}:${input.tag}`
                    }
                ],
                structuredContent: {
                    manifest
                }
            };
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
                message = (err as { message: string }).message;
            } else {
                message = String(err);
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve manifest: ${message}`
                    }
                ],
                structuredContent: {
                    manifest: null
                }
            };
        }
    }
});
