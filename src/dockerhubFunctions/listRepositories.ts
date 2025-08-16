import axios, { AxiosError } from 'axios';
import { Repository } from './types/dockerhub-types';
import { getDockerHubAPIToken, createAuthHeaders } from './auth';

/**
 * List all repositories for a DockerHub user or organization.
 * Supports both public and private repositories with authentication fallback.
 * 
 * @param username - Docker Hub username or organization name
 * @param token - Optional personal access token for private repositories
 * @returns Promise<Repository[]> - Array of repository objects
 */
export async function listDockerHubRepositories(
  username: string,
  token?: string
): Promise<Repository[]> {
  const baseUrl = 'https://hub.docker.com/v2';
  
  // If token is provided, try authenticated requests first for better private repo visibility
  if (token) {
    try {
      const bearerToken = await getDockerHubAPIToken(token);
      
      if (bearerToken) {
        const authHeaders = createAuthHeaders(bearerToken, false);
        
        // Try current user's repositories endpoint first (most comprehensive for private repos)
        try {
          const repos = await listCurrentUserRepositories(baseUrl, authHeaders);
          if (repos.length > 0) {
            return repos;
          }
        } catch (error) {
          // Continue to next strategy if this fails
        }
        
        // Try specific user endpoint with authentication
        try {
          const repos = await listUserRepositoriesPaginated(username, baseUrl, authHeaders);
          if (repos.length > 0) {
            return repos;
          }
        } catch (error) {
          // Continue to fallback if this fails
        }
      }
    } catch (authError) {
      // Authentication failed, fall back to public endpoint
    }
  }
  
  // Fallback to unauthenticated request (public repositories only)
  try {
    return await listRepositoriesUnauthenticated(username, baseUrl);
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        throw new Error(`User '${username}' not found or has no accessible repositories`);
      }
      if (error.response?.status === 403) {
        throw new Error(`Access denied. User '${username}' may have private repositories requiring authentication`);
      }
    }
    throw new Error(`Failed to list repositories for '${username}': ${error}`);
  }
}

/**
 * List repositories without authentication (public repositories only).
 */
async function listRepositoriesUnauthenticated(username: string, baseUrl: string): Promise<Repository[]> {
  const repos: Repository[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await axios.get(`${baseUrl}/repositories/${username}/`, {
      params: { page, page_size: 100 }
    });
    
    const results = response.data.results || [];
    repos.push(...results);
    hasNext = !!response.data.next;
    page++;
  }
  
  return repos;
}

/**
 * Get current authenticated user's repositories (includes all accessible private repos).
 */
async function listCurrentUserRepositories(baseUrl: string, headers: Record<string, string>): Promise<Repository[]> {
  const repos: Repository[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await axios.get(`${baseUrl}/user/repositories/`, {
      params: { page, page_size: 100 },
      headers
    });
    
    const results = response.data.results || [];
    repos.push(...results);
    hasNext = !!response.data.next;
    page++;
  }
  
  return repos;
}

/**
 * List specific user's repositories with authentication (paginated).
 */
async function listUserRepositoriesPaginated(
  username: string, 
  baseUrl: string, 
  headers: Record<string, string>
): Promise<Repository[]> {
  const repos: Repository[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await axios.get(`${baseUrl}/repositories/${username}/`, {
      params: { page, page_size: 100 },
      headers
    });
    
    const results = response.data.results || [];
    repos.push(...results);
    hasNext = !!response.data.next;
    page++;
  }
  
  return repos;
}