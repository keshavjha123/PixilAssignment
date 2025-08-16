import axios, { AxiosError } from 'axios';
import { getDockerHubAPIToken } from './auth';

export interface VulnerabilityInfo {
    vulnerabilities: unknown | null;
}

/**
 * Fetch security scan results (vulnerabilities) for a DockerHub image tag.
 * Implements unauthorized→authorized fallback pattern.
 */
export async function getImageVulnerabilities(namespace: string, repository: string, tag: string, token?: string): Promise<VulnerabilityInfo> {
    const repo = `${namespace}/${repository}`;
    const baseUrl = 'https://hub.docker.com/v2';
    const url = `${baseUrl}/repositories/${repo}/tags/${tag}/images`;
    
    try {
        // Try unauthorized request first
        
        const resp = await axios.get(url);
        
        const images = resp.data.results || [];
        
        // Look for vulnerability scan results
        let vulnerabilities = null;
        for (const image of images) {
            if (image.scan_results && image.scan_results.vulnerabilities) {
                vulnerabilities = image.scan_results.vulnerabilities;
                break;
            }
        }
        
        return { vulnerabilities };
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authorized request with proper JWT token
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
                
                const images = resp.data.results || [];
                
                // Look for vulnerability scan results
                let vulnerabilities = null;
                for (const image of images) {
                    if (image.scan_results && image.scan_results.vulnerabilities) {
                        vulnerabilities = image.scan_results.vulnerabilities;
                        break;
                    }
                }
                
                return { vulnerabilities };
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}
