import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerGetTagDetails = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_tag_details",
    description: "Get details for a specific tag of a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { tagDetails: z.any() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        // DockerHub API: /repositories/{namespace}/{repository}/tags/{tag}/
        const resp = await client["axios"].get(`/repositories/${input.namespace}/${input.repository}/tags/${input.tag}`);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Details for tag ${input.tag} of ${input.namespace}/${input.repository}`
                }
            ],
            tagDetails: resp.data
        };
    }
});
