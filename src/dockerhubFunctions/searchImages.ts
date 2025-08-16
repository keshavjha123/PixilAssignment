// Enhanced searchImages.ts with better error handling and caching
import axios, { AxiosError } from 'axios';

interface Repository {
    name: string;
    description?: string;
    is_private?: boolean;
    repo_owner?: string;
    user?: string;
    pull_count?: number;
    star_count?: number;
    last_updated?: string;
    search_score?: number;
}

interface SearchResult {
    count: number;
    results: Repository[];
    private_matches: number;
    public_matches: number;
    search_mode: string;
    cached?: boolean;
}

// Simple in-memory cache for user profiles (optional optimization)
const userProfileCache = new Map<string, { username: string, expires: number }>();

export async function searchImages(
    query: string, 
    page = 1, 
    pageSize = 25, 
    token?: string,
    searchMode: 'all' | 'public_only' | 'private_only' = 'all'
): Promise<SearchResult> {
    
    let publicResults: { count: number; results: Repository[] } = { count: 0, results: [] };
    let privateMatches: Repository[] = [];

    // Public search (unless private_only mode)
    if (searchMode !== 'private_only') {
        try {
            const resp = await axios.get('https://hub.docker.com/v2/search/repositories', {
                params: { query, page, page_size: pageSize },
                timeout: 10000,
            });
            publicResults = resp.data;
        } catch (error: unknown) {
            if (error instanceof AxiosError) {
                // Only try authenticated public search if we got 401 and have token
                if (error.response?.status === 401 && token) {
                    try {
                        const resp = await axios.get('https://hub.docker.com/v2/search/repositories', {
                            params: { query, page, page_size: pageSize },
                            headers: { 
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 10000,
                        });
                        publicResults = resp.data;
                    } catch (authError) {
                        console.warn('Authenticated public search failed:', authError);
                    }
                }
                // For other errors, log but continue
                else if (error.response?.status !== 404) {
                    console.warn(`Public search warning (${error.response?.status}):`, error.message);
                }
            }
        }
    }

    // Private repository search (unless public_only mode)
    if (searchMode !== 'public_only' && token) {
        try {
            // Get username with caching
            let username: string;
            const cacheKey = `user_${token.substring(0, 8)}`;
            const cached = userProfileCache.get(cacheKey);
            
            if (cached && cached.expires > Date.now()) {
                username = cached.username;
            } else {
                const userResp = await axios.get('https://hub.docker.com/v2/user/', {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000,
                });
                username = userResp.data.username;
                
                // Cache for 5 minutes
                userProfileCache.set(cacheKey, {
                    username,
                    expires: Date.now() + 5 * 60 * 1000
                });
            }

            // Search through private repositories with better pagination
            const allMatchingRepos: Repository[] = [];
            let page = 1;
            let hasMore = true;
            const maxPages = 10; // Prevent infinite loops

            while (hasMore && page <= maxPages) {
                try {
                    const repoResp = await axios.get(`https://hub.docker.com/v2/repositories/${username}/`, {
                        params: { page, page_size: 100 },
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 8000,
                    });

                    // Filter repositories that match the search query
                    const pageMatchingRepos = repoResp.data.results.filter((repo: Repository) => {
                        const nameMatch = repo.name.toLowerCase().includes(query.toLowerCase());
                        const descMatch = repo.description?.toLowerCase().includes(query.toLowerCase());
                        // Could also search tags if needed
                        return nameMatch || descMatch;
                    });

                    allMatchingRepos.push(...pageMatchingRepos);
                    hasMore = repoResp.data.next !== null;
                    page++;
                } catch (pageError) {
                    console.warn(`Error fetching page ${page}:`, pageError);
                    break;
                }
            }

            privateMatches = allMatchingRepos.map((repo: Repository) => ({
                ...repo,
                is_private: true,
                repo_owner: username,
                search_score: calculateSearchScore(repo, query) // Add relevance scoring
            }));

            // Sort by relevance
            privateMatches.sort((a, b) => (b.search_score || 0) - (a.search_score || 0));
        } catch (error) {
            console.warn('Private repository search failed:', error);
            // Log and continue with public results
        }
    }

    // Combine and deduplicate results
    const combinedResults = combineAndDeduplicateResults(privateMatches, publicResults.results || []);
    const totalCount = privateMatches.length + (publicResults.count || 0);

    return {
        count: Math.min(totalCount, combinedResults.length),
        results: combinedResults.slice(0, pageSize),
        private_matches: privateMatches.length,
        public_matches: publicResults.count || 0,
        search_mode: searchMode
    };
}

/**
 * Calculate search relevance score
 */
function calculateSearchScore(repo: Repository, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Exact name match gets highest score
    if (repo.name.toLowerCase() === queryLower) score += 100;
    // Name starts with query
    else if (repo.name.toLowerCase().startsWith(queryLower)) score += 50;
    // Name contains query
    else if (repo.name.toLowerCase().includes(queryLower)) score += 25;
    
    // Description matches
    if (repo.description?.toLowerCase().includes(queryLower)) score += 10;
    
    // Boost score for recently updated repos
    if (repo.last_updated) {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(repo.last_updated).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceUpdate < 30) score += 5;
    }
    
    // Boost for popular repos
    if ((repo.pull_count || 0) > 1000) score += 3;
    if ((repo.star_count || 0) > 10) score += 2;
    
    return score;
}

/**
 * Combine and deduplicate results from private and public searches
 */
function combineAndDeduplicateResults(privateResults: Repository[], publicResults: Repository[]): Repository[] {
    const seen = new Set<string>();
    const combined: Repository[] = [];
    
    // Add private results first (higher priority)
    for (const repo of privateResults) {
        const key = `${repo.repo_owner || repo.user}/${repo.name}`;
        if (!seen.has(key)) {
            seen.add(key);
            combined.push(repo);
        }
    }
    
    // Add public results if not already seen
    for (const repo of publicResults) {
        const key = `${repo.repo_owner || repo.user}/${repo.name}`;
        if (!seen.has(key)) {
            seen.add(key);
            combined.push(repo);
        }
    }
    
    return combined;
}