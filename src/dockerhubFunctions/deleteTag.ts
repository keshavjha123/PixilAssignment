import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

export interface DeleteTagResult {
    success: boolean;
    message: string;
}

/**
 * Delete a specific tag from a DockerHub repository.
 * This operation requires authentication and appropriate permissions.
 */
export async function deleteDockerHubTag(
  namespace: string,
  repository: string,
  tag: string,
  token?: string
): Promise<DeleteTagResult> {
  const baseUrl = 'https://hub.docker.com/v2';
  const url = `${baseUrl}/repositories/${namespace}/${repository}/tags/${tag}/`;
  
  try {
    // Try unauthorized delete request first
    await axios.delete(url);
    
    
    return {
      success: true,
      message: `Tag ${tag} deleted successfully.`
    };
  } catch (error: unknown) {
    
    if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
      // Fallback to JWT authenticated delete request
      try {
        
        const jwtToken = await getDockerHubAPIToken(token);
        if (!jwtToken) {
          throw new Error('Failed to get JWT token');
        }
        
        await axios.delete(url, {
          headers: { 
            Authorization: `JWT ${jwtToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        
        return {
          success: true,
          message: `Tag ${tag} deleted successfully.`
        };
      } catch (authError: unknown) {
        
        if (authError instanceof AxiosError) {
          const errorMessage = authError.response?.data?.detail || authError.message;
          return {
            success: false,
            message: errorMessage
          };
        }
        return {
          success: false,
          message: authError instanceof Error ? authError.message : 'Authentication failed'
        };
      }
    }
    
    if (!token) {
      return {
        success: false,
        message: 'Authentication token is required for tag deletion'
      };
    }
    
    if (error instanceof AxiosError) {
      const errorMessage = error.response?.data?.detail || error.message;
      return {
        success: false,
        message: errorMessage
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
