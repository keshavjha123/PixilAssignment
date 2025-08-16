import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

export interface DockerfileInfo {
    dockerfile: string | null;
}

/**
 * Attempt to retrieve the Dockerfile for a DockerHub image tag.
 * Implements unauthorized→authorized fallback pattern.
 */
export async function getDockerfile(namespace: string, repository: string, tag: string, token?: string): Promise<DockerfileInfo> {
    const repo = `${namespace}/${repository}`;
    const baseUrl = 'https://hub.docker.com/v2';
    const url = `${baseUrl}/repositories/${repo}`;
    
    try {
        // Try unauthorized request first to get repository details
        
        const detailsResp = await axios.get(url);
        
        return await fetchDockerfileFromDetails(detailsResp.data, repo, tag);
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authorized request with proper JWT token
            try {
                
                const jwtToken = await getDockerHubAPIToken(token);
                if (!jwtToken) {
                    throw new Error('Failed to get JWT token');
                }
                
                const detailsResp = await axios.get(url, {
                    headers: { 
                        Authorization: `JWT ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                return await fetchDockerfileFromDetails(detailsResp.data, repo, tag);
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}

async function fetchDockerfileFromDetails(details: { source_url?: string; github_repo?: string }, repo: string, tag: string): Promise<DockerfileInfo> {
    // Check for source repository (GitHub) link
    const githubUrl = details?.source_url || details?.github_repo;
    
    if (!githubUrl || !githubUrl.includes('github.com')) {
        return { dockerfile: null };
    }
    
    // Try to guess Dockerfile location (common: /Dockerfile or /main/Dockerfile or /master/Dockerfile)
    const repoPath = githubUrl.replace('https://github.com/', '');
    const possibleUrls = [
        `https://raw.githubusercontent.com/${repoPath}/main/Dockerfile`,
        `https://raw.githubusercontent.com/${repoPath}/master/Dockerfile`,
        `https://raw.githubusercontent.com/${repoPath}/main/${tag}/Dockerfile`,
        `https://raw.githubusercontent.com/${repoPath}/master/${tag}/Dockerfile`,
        `https://raw.githubusercontent.com/${repoPath}/Dockerfile`
    ];
    
    for (const url of possibleUrls) {
        try {
            const resp = await axios.get(url);
            if (resp.status === 200 && resp.data && typeof resp.data === 'string') {
                return { dockerfile: resp.data };
            }
        } catch {
            // Continue to next URL
            continue;
        }
    }
    
    return { dockerfile: null };
}
