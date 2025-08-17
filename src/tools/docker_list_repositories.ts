import { z } from "zod";
import { listDockerHubRepositories } from "../dockerhubFunctions/listRepositories";

export const dockerListRepositories = (env: NodeJS.ProcessEnv) => ({
    name: "docker_list_repositories",
    description: "List all repositories for a DockerHub user or organization (requires authentication for private repos).",
    inputSchema: { username: z.string() },
    outputSchema: { repositories: z.array(z.any()) },
    handler: async (input: { username: string }) => {
        const repos = await listDockerHubRepositories(input.username, env.DOCKERHUB_TOKEN);
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${repos.length} repositories for user ${input.username} , repository details are as follows: ${JSON.stringify(repos)}`
                }
            ],
            structuredContent: {
                repositories: repos
            }
        };
    }
});
