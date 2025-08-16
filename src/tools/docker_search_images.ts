import { z } from "zod";
import { searchImages } from "../dockerhubFunctions/searchImages";
import { searchMyRepositories } from "../dockerhubFunctions/searchMyRepositories";
import { cachedDockerHubAPI } from "../cache/CachedDockerHubAPI";

interface SearchResults {
    count: number;
    results: Array<{
        name: string;
        description?: string;
        is_private?: boolean;
        repo_owner?: string;
        user?: string;
        pull_count?: number;
        star_count?: number;
        last_updated?: string;
        search_score?: number;
    }>;
}

export const dockerSearchImages = (env: NodeJS.ProcessEnv) => ({
    name: "docker_search_images",
    description: "Search Docker Hub for images, including private repositories when authenticated.",
    inputSchema: {
        query: z.string(),
        include_private: z.boolean().optional().default(true),
        search_mode: z.enum(['all', 'public_only', 'private_only']).optional().default('all')
    },
    outputSchema: {
        results: z.object({
            count: z.number(),
            results: z.array(z.object({
                name: z.string(),
                description: z.string().optional(),
                is_private: z.boolean().optional(),
                repo_owner: z.string().optional(),
                user: z.string().optional(),
                pull_count: z.number().optional(),
                star_count: z.number().optional(),
                last_updated: z.string().optional(),
                search_score: z.number().optional()
            })),
            private_matches: z.number(),
            public_matches: z.number(),
            search_mode: z.string()
        })
    },
    handler: async (input: {
        query: string,
        include_private?: boolean,
        search_mode?: 'all' | 'public_only' | 'private_only'
    }) => {
        let publicResults: SearchResults = { count: 0, results: [] };
        let privateResults: SearchResults = { count: 0, results: [] };

        try {
            // Handle public search
            if (input.search_mode !== 'private_only') {
                try {
                    // Use cached version for public search - semi-dynamic data safe to cache briefly
                    publicResults = await cachedDockerHubAPI.searchImages(input.query, 1, 25);
                } catch (error) {
                    console.warn('Public search failed:', error);
                }
            }

            // Handle private search using repository listing approach
            if (input.search_mode !== 'public_only' && env.DOCKERHUB_TOKEN && env.DOCKERHUB_USERNAME) {
                try {
                    privateResults = await searchMyRepositories(input.query, env.DOCKERHUB_TOKEN);
                } catch (error) {
                    console.warn('Private search failed:', error);
                    // continue with public results
                }
            }

            // Combine results
            const totalResults = [...(privateResults.results || []), ...(publicResults.results || [])];
            const totalCount = (privateResults.count || 0) + (publicResults.count || 0);
            const privateCount = privateResults.count || 0;
            const publicCount = publicResults.count || 0;

            let resultText = `Found ${totalCount} images for query: ${input.query}`;
            if (privateCount > 0 || publicCount > 0) {
                resultText += ` (${privateCount} private, ${publicCount} public)`;
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: resultText
                    }
                ],
                structuredContent: {
                    results: {
                        count: totalCount,
                        results: totalResults,
                        private_matches: privateCount,
                        public_matches: publicCount,
                        search_mode: input.search_mode
                    }
                }
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Search failed for query: ${input.query}. Error: ${error}`
                    }
                ],
                structuredContent: {
                    results: { count: 0, results: [], error: error }
                }
            };
        }
    }
});