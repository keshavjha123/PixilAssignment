import { z } from "zod";
import { deleteDockerHubTag } from "../dockerhubFunctions/deleteTag";

export const dockerDeleteTag = (env: NodeJS.ProcessEnv) => ({
    name: "docker_delete_tag",
    description: "Delete a specific tag from a DockerHub repository (requires authentication and permissions).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { success: z.boolean(), message: z.string() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const result = await deleteDockerHubTag(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            
            return {
                content: [
                    {
                        type: "text" as const,
                        text: result.success 
                            ? `Deleted tag ${input.tag} from ${input.namespace}/${input.repository}`
                            : `Failed to delete tag ${input.tag} from ${input.namespace}/${input.repository}: ${result.message}`
                    }
                ],
                structuredContent: {
                    success: result.success,
                    message: result.message
                }
                
                
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to delete tag ${input.tag} from ${input.namespace}/${input.repository}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    success: false,
                    message: errorMessage
                }
            };
        }
    }
});
