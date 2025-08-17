import { z } from "zod";
import { searchImages } from "../dockerhubFunctions/searchImages";
import { searchMyRepositories } from "../dockerhubFunctions/searchMyRepositories";
import { cachedDockerHubAPI } from "../cache/CachedDockerHubAPI";

interface SearchResults {
    count: number;
    results: Array<{
        name?: string;          // For consistent interface
        repo_name?: string;     // What search API actually returns
        description?: string;   // For consistent interface
        short_description?: string; // What search API actually returns
        is_private?: boolean;
        repo_owner?: string;
        user?: string;
        pull_count?: number;
        star_count?: number;
        last_updated?: string;
        search_score?: number;
        is_automated?: boolean;
        is_official?: boolean;
    }>;
    private_matches?: number;
    public_matches?: number;
    search_mode?: string;
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
        let searchResults: SearchResults = { count: 0, results: [] };

        try {
            // Use the enhanced searchImages function which handles both private and public search
            searchResults = await searchImages(
                input.query,
                1,
                25,
                env.DOCKERHUB_TOKEN,
                input.search_mode || 'all'
            );

            // Extract data from search results
            const totalResults = searchResults.results || [];
            const totalCount = searchResults.count || 0;
            const privateCount = searchResults.private_matches || 0;
            const publicCount = searchResults.public_matches || 0;

            let resultText = `Found ${totalCount} images for query: ${input.query}`;
            if (privateCount > 0 || publicCount > 0) {
                resultText += ` (${privateCount} private, ${publicCount} public)`;
            }

            // Add essential info about the top results
            if (totalResults.length > 0) {
                resultText += '\n\nTop results:';
                const topResults = totalResults.slice(0, 15); // Show top 15 results
                topResults.forEach((image, index) => {
                    // Handle different possible property names from DockerHub API
                    const imageAny = image as any;
                    const imageName = image.name || image.repo_name || imageAny.full_name || 'Unknown';
                    const imageDesc = image.description || image.short_description;

                    resultText += `\n${index + 1}. ${imageName}`;

                    // Add description
                    if (imageDesc) {
                        const desc = imageDesc.length > 100
                            ? imageDesc.substring(0, 100) + '...'
                            : imageDesc;
                        resultText += ` - ${desc}`;
                    }

                    // Add metrics and info
                    const metrics = [];
                    if (image.star_count !== undefined) {
                        metrics.push(`⭐${image.star_count}`);
                    }
                    if (image.pull_count !== undefined) {
                        const pullCount = image.pull_count > 1000000000
                            ? `${(image.pull_count / 1000000000).toFixed(1)}B`
                            : image.pull_count > 1000000
                                ? `${(image.pull_count / 1000000).toFixed(1)}M`
                                : image.pull_count > 1000
                                    ? `${(image.pull_count / 1000).toFixed(1)}K`
                                    : image.pull_count.toString();
                        metrics.push(`📥${pullCount}`);
                    }
                    if (metrics.length > 0) {
                        resultText += ` (${metrics.join(', ')})`;
                    }

                    // Add tags
                    const tags = [];
                    if (imageAny.is_official) {
                        tags.push('OFFICIAL');
                    }
                    if (image.is_private) {
                        tags.push('PRIVATE');
                    }
                    if (imageAny.is_automated) {
                        tags.push('AUTOMATED');
                    }
                    if (image.repo_owner) {
                        tags.push(`by ${image.repo_owner}`);
                    }
                    if (tags.length > 0) {
                        resultText += ` [${tags.join(', ')}]`;
                    }

                    // Add last updated if available
                    if (image.last_updated) {
                        const lastUpdated = new Date(image.last_updated);
                        const now = new Date();
                        const diffDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays < 30) {
                            resultText += ` (Updated ${diffDays}d ago)`;
                        } else if (diffDays < 365) {
                            const diffMonths = Math.floor(diffDays / 30);
                            resultText += ` (Updated ${diffMonths}mo ago)`;
                        }
                    }
                });

                if (totalResults.length > 15) {
                    resultText += `\n... and ${totalResults.length - 15} more results`;
                }
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
                        search_mode: input.search_mode || 'all'
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