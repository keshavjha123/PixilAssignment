import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerDeleteTag = (env: NodeJS.ProcessEnv) => ({
    name: "docker_delete_tag",
    description: "Delete a specific tag from a DockerHub repository (requires authentication and permissions).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { success: z.boolean(), message: z.string() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        try {
            // DockerHub API: DELETE /repositories/{namespace}/{repository}/tags/{tag}/
            await client["axios"].delete(`/repositories/${input.namespace}/${input.repository}/tags/${input.tag}/`);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Deleted tag ${input.tag} from ${input.namespace}/${input.repository}`
                    }
                ],
                success: true,
                message: `Tag ${input.tag} deleted successfully.`
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to delete tag ${input.tag} from ${input.namespace}/${input.repository}: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                success: false,
                message: err?.response?.data?.detail || err.message
            };
        }
    }
});
