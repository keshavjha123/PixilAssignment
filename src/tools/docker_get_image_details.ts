import { z } from "zod";
import { getImageDetails } from "../dockerhubFunctions/imageDetails";
import { cachedDockerHubAPI } from "../cache/CachedDockerHubAPI";

export const dockerGetImageDetails = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_image_details",
    description: "Get detailed information about a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { details: z.any() },
    handler: async (input: { namespace: string; repository: string }) => {
        // Use cached version for static image details
        const details = await cachedDockerHubAPI.getImageDetails(input.namespace, input.repository);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Details for ${input.namespace}/${input.repository} are: ${JSON.stringify(details)}`
                }
            ],
            structuredContent: {
                results: details
            }
        };
    }
});
