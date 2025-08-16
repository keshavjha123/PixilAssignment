import { z } from "zod";
import { listRepositoryTags } from "../dockerhubFunctions/listRepositoryTags";

export const dockerListTags = (env: NodeJS.ProcessEnv) => ({
    name: "docker_list_tags",
    description: "List all tags for a DockerHub repository.",
    inputSchema: { namespace: z.string(), repository: z.string() },
    outputSchema: { results: z.array(z.string()) },
    handler: async (input: { namespace: string; repository: string }) => {
        let tags: string[] = [];
        let page = 1;
        let hasNext = true;
        try {
            while (hasNext) {
                const resp: { results?: { name: string }[]; next?: string | null } = await listRepositoryTags(input.namespace, input.repository, page, 100, env.DOCKERHUB_TOKEN);
                const results: { name: string }[] = Array.isArray(resp?.results) ? resp.results : [];
                tags = tags.concat(results.map((t) => t.name));
                hasNext = !!resp?.next;
                page++;
            }
        } catch {
            // If error, tags remains an empty array
        }
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Found ${tags.length} tags for ${input.namespace}/${input.repository}`
                }
            ],
            structuredContent: {
                results: tags
            }
        };
    }
});
