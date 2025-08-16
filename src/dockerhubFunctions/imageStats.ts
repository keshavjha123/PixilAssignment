import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

/**
 * Get stats (pull count, star count) for a DockerHub repository.
 */
export async function getImageStats(
    namespace: string,
    repository: string,
    token?: string
): Promise<{ pull_count: number; star_count: number }> {
    const url = `https://hub.docker.com/v2/repositories/${namespace}/${repository}`;
    try {
        
        const resp = await axios.get(url);
        
        return {
            pull_count: resp.data.pull_count,
            star_count: resp.data.star_count
        };
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authorized request with proper JWT token for 401 or 404 errors
            try {
                
                const jwtToken = await getDockerHubAPIToken(token);
                if (!jwtToken) {
                    throw new Error('Failed to get JWT token');
                }
                
                const resp = await axios.get(url, {
                    headers: { 
                        Authorization: `JWT ${jwtToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                return {
                    pull_count: resp.data.pull_count,
                    star_count: resp.data.star_count
                };
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}
