import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerSearchImages = (env: NodeJS.ProcessEnv) => ({
    name: "docker_search_images",
    description: "Search Docker Hub for images.",
    inputSchema: { query: z.string() },
    outputSchema: { results: z.any() },
    handler: async (input: { query: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        const data = await client.searchImages(input.query);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${data.count} images for query: ${input.query}`
                }
            ],
            results: data
        };
    }
});
