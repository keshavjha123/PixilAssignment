import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

/**
 * Get all tags for a DockerHub repository.
 * Implements unauthorized→authorized fallback pattern.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listRepositoryTags(namespace: string, repository: string, page = 1, pageSize = 100, token?: string): Promise<any> {
    const url = `https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags`;
    
    try {
        // Try unauthorized request first
        const resp = await axios.get(url, {
            params: { page, page_size: pageSize }
        });
        
        
        // If we get 0 results and a token is available, try authenticated request anyway
        if (resp.data?.count === 0 && token) {
            
            const jwtToken = await getDockerHubAPIToken(token);
            if (jwtToken) {
                const authResp = await axios.get(url, {
                    params: { page, page_size: pageSize },
                    headers: { 
                        Authorization: `JWT ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                return authResp.data;
            }
        }
        
        return resp.data;
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authorized request with proper JWT token for 401 or 404 errors
            try {
                
                const jwtToken = await getDockerHubAPIToken(token);
                if (!jwtToken) {
                    throw new Error('Failed to get JWT token');
                }
                
                const resp = await axios.get(url, {
                    params: { page, page_size: pageSize },
                    headers: { 
                        Authorization: `JWT ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                return resp.data;
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}
