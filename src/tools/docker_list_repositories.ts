import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerListRepositories = (env: NodeJS.ProcessEnv) => ({
    name: "docker_list_repositories",
    description: "List all repositories for a DockerHub user or organization (requires authentication for private repos).",
    inputSchema: { username: z.string() },
    outputSchema: { repositories: z.array(z.any()) },
    handler: async (input: { username: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        let repos: any[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext) {
            const resp = await client["axios"].get(`/repositories/${input.username}/`, {
                params: { page, page_size: 100 }
            });
            const results = resp.data.results || [];
            repos = repos.concat(results);
            hasNext = !!resp.data.next;
            page++;
        }
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${repos.length} repositories for user ${input.username}`
                }
            ],
            repositories: repos
        };
    }
});
