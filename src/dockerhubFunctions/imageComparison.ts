import axios, { AxiosError } from 'axios';
import { getDockerHubBearerToken } from './auth';

interface Platform {
    architecture?: string;
    os?: string;
}

interface ManifestEntry {
    digest: string;
    platform?: Platform;
}

export interface ImageComparison {
    image1: {
        name: string;
        size: number;
        layerCount: number;
        layers: Array<{ digest: string; size: number }>;
    };
    image2: {
        name: string;
        size: number;
        layerCount: number;
        layers: Array<{ digest: string; size: number }>;
    };
    sizeDifference: number;
    commonLayers: number;
    uniqueToImage1: number;
    uniqueToImage2: number;
}

/**
 * Get authentication token for registry access
 */
async function getRegistryToken(repo: string, token?: string): Promise<string> {
    try {
        const authUrl = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`;
        
        if (token) {
            // Try with bearer token first
            const bearerToken = await getDockerHubBearerToken(token, `repository:${repo}:pull`);
            if (bearerToken) {
                try {
                    const response = await axios.get(authUrl, {
                        headers: { 'Authorization': `Bearer ${bearerToken}` }
                    });
                    return response.data.token;
                } catch {
                    // Fallback to using the bearer token directly
                    return bearerToken;
                }
            }
        }
        
        // Fallback to unauthenticated request
        const response = await axios.get(authUrl);
        return response.data.token;
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 401 && token) {
            throw new Error('Authentication failed - invalid token');
        }
        throw new Error(`Failed to get registry token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get image manifest from registry
 */
async function getImageManifest(
    image: { namespace: string; repository: string; tag: string },
    token?: string
): Promise<{ layers: Array<{ digest: string; size: number }>; totalSize: number }> {
    const repo = `${image.namespace}/${image.repository}`;
    const registryToken = await getRegistryToken(repo, token);
    
    try {
        const manifestUrl = `https://registry-1.docker.io/v2/${repo}/manifests/${image.tag}`;
        const response = await axios.get(manifestUrl, {
            headers: {
                'Authorization': `Bearer ${registryToken}`,
                'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.oci.image.index.v1+json'
            }
        });
        
        const manifest = response.data;
        let layers: Array<{ digest: string; size: number }> = [];
        
        if (manifest.mediaType === 'application/vnd.docker.distribution.manifest.list.v2+json' ||
            manifest.mediaType === 'application/vnd.oci.image.index.v1+json') {
            // Multi-arch manifest - get the amd64/linux platform
            if (manifest.manifests && manifest.manifests.length > 0) {
                // Try to find amd64/linux platform
                let platformManifest = manifest.manifests.find((m: ManifestEntry) => 
                    m.platform?.architecture === 'amd64' && m.platform?.os === 'linux'
                );
                
                // Fallback to first platform if amd64/linux not found
                if (!platformManifest) {
                    platformManifest = manifest.manifests[0];
                }
                
                const platformResp = await axios.get(`https://registry-1.docker.io/v2/${repo}/manifests/${platformManifest.digest}`, {
                    headers: {
                        'Authorization': `Bearer ${registryToken}`,
                        'Accept': 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.oci.image.manifest.v1+json'
                    }
                });
                layers = platformResp.data.layers || [];
            }
        } else {
            layers = manifest.layers || [];
        }
        
        const totalSize = layers.reduce((sum, layer) => sum + (layer.size || 0), 0);
        
        return { layers, totalSize };
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) {
            throw new Error(`Image ${repo}:${image.tag} not found`);
        }
        throw new Error(`Failed to get manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Compare two DockerHub images using Registry API v2.
 */
export async function compareImages(
    image1: { namespace: string; repository: string; tag: string },
    image2: { namespace: string; repository: string; tag: string },
    token?: string
): Promise<ImageComparison> {
    try {
        const [manifest1, manifest2] = await Promise.all([
            getImageManifest(image1, token),
            getImageManifest(image2, token)
        ]);
        
        const image1Name = `${image1.namespace}/${image1.repository}:${image1.tag}`;
        const image2Name = `${image2.namespace}/${image2.repository}:${image2.tag}`;
        
        // Find common layers by digest
        const layer1Digests = new Set(manifest1.layers.map(l => l.digest));
        const layer2Digests = new Set(manifest2.layers.map(l => l.digest));
        const commonDigests = new Set([...layer1Digests].filter(d => layer2Digests.has(d)));
        
        return {
            image1: {
                name: image1Name,
                size: manifest1.totalSize,
                layerCount: manifest1.layers.length,
                layers: manifest1.layers
            },
            image2: {
                name: image2Name,
                size: manifest2.totalSize,
                layerCount: manifest2.layers.length,
                layers: manifest2.layers
            },
            sizeDifference: Math.abs(manifest1.totalSize - manifest2.totalSize),
            commonLayers: commonDigests.size,
            uniqueToImage1: layer1Digests.size - commonDigests.size,
            uniqueToImage2: layer2Digests.size - commonDigests.size
        };
    } catch (error: unknown) {
        throw new Error(`Image comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
