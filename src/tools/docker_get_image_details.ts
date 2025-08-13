import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerGetImageDetails = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_image_details",
    description: "Get detailed information about a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { details: z.any() },
    handler: async (input: { namespace: string; repository: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        const details = await client.getImageDetails(input.namespace, input.repository);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Details for ${input.namespace}/${input.repository}`
                }
            ],
            details
        };
    }
});
