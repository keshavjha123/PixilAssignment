import axios, { AxiosError } from 'axios';
import { Manifest } from './types/dockerhub-types';
import { getDockerHubBearerToken } from './auth';

/**
 * Get detailed information about a DockerHub image manifest (raw manifest data).
 * Implements unauthorized→authorized fallback pattern.
 */
export async function getManifestDetails(namespace: string, repository: string, tag: string, token?: string): Promise<Manifest> {
    const repo = `${namespace}/${repository}`;
    const url = `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`;
    const acceptHeader = "application/vnd.docker.distribution.manifest.v2+json";
    
    try {
        // Try unauthorized request first
        const resp = await axios.get(url, { headers: { Accept: acceptHeader } });
        return resp.data;
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authorized request with proper registry token
            try {
                
                const bearerToken = await getDockerHubBearerToken(token, `repository:${repo}:pull`);
                if (!bearerToken) {
                    throw new Error('Failed to get registry bearer token');
                }
                
                const headers: Record<string, string> = { 
                    Accept: acceptHeader,
                    Authorization: `Bearer ${bearerToken}`
                };
                const resp = await axios.get(url, { headers });
                
                return resp.data;
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}
