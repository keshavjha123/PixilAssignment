import { z } from "zod";
import { getImageDetails } from "../dockerhubFunctions/imageDetails";

export const dockerGetImageDetails = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_image_details",
    description: "Get detailed information about a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { details: z.any() },
    handler: async (input: { namespace: string; repository: string }) => {
        const details = await getImageDetails(input.namespace, input.repository, env.DOCKERHUB_TOKEN);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Details for ${input.namespace}/${input.repository}`
                }
            ],
            structuredContent: {
                results: details
            }
        };
    }
});
