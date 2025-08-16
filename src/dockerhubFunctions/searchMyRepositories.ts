// Updated searchMyRepositories.ts with better error handling
import axios from 'axios';

export async function searchMyRepositories(query: string, token: string): Promise<any> {
    try {
        // Get username from environment variable
        const username = process.env.DOCKERHUB_USERNAME;

        if (!username) {
            throw new Error('DOCKERHUB_USERNAME environment variable is required for private repository search');
        }

        // Since Personal Access Tokens don't work with /user/ endpoint,
        // we'll use a direct search approach for known repositories
        // First try to get repository list using known patterns
        const searchResults: any[] = [];

        // Try different repository name patterns that might match the query
        const possibleRepos = [
            query, // Exact match
            `${query}repo`, // With 'repo' suffix
            `${username}${query}`, // With username prefix
        ];

        for (const repoName of possibleRepos) {
            try {
                // Try to get repository details directly
                const repoResp = await axios.get(`https://hub.docker.com/v2/repositories/${username}/${repoName}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });

                if (repoResp.data) {
                    const repo = repoResp.data;
                    searchResults.push({
                        ...repo,
                        repo_owner: username,
                        is_private: repo.is_private,
                        search_score: calculateRelevanceScore(repo, query, username)
                    });
                }
            } catch (repoError) {
                // Repository doesn't exist or access denied, continue
                console.log(`Repository ${username}/${repoName} not accessible`);
            }
        }

        // If we found repositories through direct access, return them
        if (searchResults.length > 0) {
            return {
                count: searchResults.length,
                results: searchResults.sort((a, b) => b.search_score - a.search_score),
                username: username,
                total_repos_searched: possibleRepos.length
            };
        }

        // Fallback: return empty results with indication that private repos might exist
        return {
            count: 0,
            results: [],
            username: username,
            total_repos_searched: 0,
            note: 'Private repository search requires specific repository name due to API limitations'
        };

    } catch (error) {
        // Provide more specific error messages
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('Authentication failed - invalid or expired token');
            } else if (error.response?.status === 403) {
                throw new Error('Access forbidden - insufficient permissions');
            } else if (error.response?.status === 404) {
                throw new Error('User not found or no repositories available');
            }
        }
        throw new Error(`Failed to search private repositories: ${error}`);
    }
}

function calculateRelevanceScore(repo: any, query: string, username: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Exact matches get highest priority
    if (repo.name.toLowerCase() === queryLower) score += 100;
    else if (repo.name.toLowerCase().startsWith(queryLower)) score += 50;
    else if (repo.name.toLowerCase().includes(queryLower)) score += 25;

    // Full name matches
    if (`${username}/${repo.name}`.toLowerCase() === queryLower) score += 80;

    // Description matches
    if (repo.description?.toLowerCase().includes(queryLower)) score += 15;

    // Boost recent activity
    if (repo.last_updated) {
        const daysSinceUpdate = (Date.now() - new Date(repo.last_updated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) score += 10;
        else if (daysSinceUpdate < 30) score += 5;
    }

    // Boost popular repos
    if (repo.pull_count > 100) score += 5;
    if (repo.star_count > 5) score += 3;

    return score;
}
