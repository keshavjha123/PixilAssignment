import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

/**
 * Get detailed information about a DockerHub image repository.
 * Uses unauthorized→authorized fallback pattern.
 */
export async function getImageDetails(
  namespace: string,
  repository: string,
  token?: string
): Promise<unknown> {
  const url = `https://hub.docker.com/v2/repositories/${namespace}/${repository}`;
  try {
    
    const resp = await axios.get(url);
    
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
