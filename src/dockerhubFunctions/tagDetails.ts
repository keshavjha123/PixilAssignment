import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

export interface TagDetails {
    name: string;
    full_size: number;
    architecture: string;
    os: string;
    digest: string;
    last_updated: string;
    last_updater_username: string;
    [key: string]: unknown; // Allow additional fields
}

/**
 * Get details for a specific tag of a DockerHub image.
 * Implements unauthorized→authorized fallback pattern.
 */
export async function getDockerHubTagDetails(
  namespace: string,
  repository: string,
  tag: string,
  token?: string
): Promise<TagDetails> {
  const baseUrl = 'https://hub.docker.com/v2';
  const url = `${baseUrl}/repositories/${namespace}/${repository}/tags/${tag}`;
  
  try {
    // Try unauthorized request first
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
