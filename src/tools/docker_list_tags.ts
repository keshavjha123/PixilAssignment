import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";

export const dockerListTags = (env: NodeJS.ProcessEnv) => ({
    name: "docker_list_tags",
    description: "List all tags for a DockerHub repository.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { tags: z.array(z.string()) },
    handler: async (input: { namespace: string; repository: string }) => {
        const client = new DockerHubClient({
            username: env.DOCKERHUB_USERNAME,
            token: env.DOCKERHUB_TOKEN
        });
        // DockerHub API paginates tags, so we need to fetch all pages
        let tags: string[] = [];
        let page = 1;
        let hasNext = true;
        while (hasNext) {
            const resp = await client["axios"].get(`/repositories/${input.namespace}/${input.repository}/tags`, {
                params: { page, page_size: 100 }
            });
            const results = resp.data.results || [];
            tags = tags.concat(results.map((t: any) => t.name));
            hasNext = !!resp.data.next;
            page++;
        }
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${tags.length} tags for ${input.namespace}/${input.repository}`
                }
            ],
            tags
        };
    }
});
