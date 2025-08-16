import { z } from "zod";
import { getDockerHubTagDetails } from "../dockerhubFunctions/tagDetails";

export const dockerGetTagDetails = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_tag_details",
    description: "Get details for a specific tag of a DockerHub image.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { tagDetails: z.any() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        const tagDetails = await getDockerHubTagDetails(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Details for tag ${input.tag} of ${input.namespace}/${input.repository}`
                }
            ],
            structuredContent: {
                tagDetails: tagDetails,
            }
        };
    }
});
