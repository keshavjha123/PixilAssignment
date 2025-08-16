import axios, { AxiosError } from 'axios';
import { getDockerHubBearerToken } from './auth';

export interface PullSizeEstimate {
    totalSize: number;
    layers: Array<{ size: number; digest: string }>;
}

/**
 * Estimate the total download size for a DockerHub image tag.
 * Implements unauthorized→authorized fallback pattern.
 */
export async function estimatePullSize(namespace: string, repository: string, tag: string, token?: string): Promise<PullSizeEstimate> {
    const repo = `${namespace}/${repository}`;
    
    try {
        // Try to get a registry token first (this usually works without authentication)
        
        const authResp = await axios.get(
            `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
        );
        const registryToken = authResp.data.token;
        
        return await calculatePullSizeWithToken(repo, tag, registryToken);
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to authenticated request with proper bearer token
            try {
                
                const bearerToken = await getDockerHubBearerToken(token, `repository:${repo}:pull`);
                if (!bearerToken) {
                    throw new Error('Failed to get registry bearer token');
                }
                
                // Try to get registry token with authentication
                try {
                    const authResp = await axios.get(
                        `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`,
                        { headers: { Authorization: `Bearer ${bearerToken}` } }
                    );
                    const registryToken = authResp.data.token;
                    
                    
                    return await calculatePullSizeWithToken(repo, tag, registryToken);
                } catch {
                    // If that fails, try with the DockerHub token directly
                    
                    return await calculatePullSizeWithToken(repo, tag, bearerToken);
                }
            } catch (authError) {
                
                throw new Error(`Authentication failed: ${authError}`);
            }
        }
        throw error;
    }
}

async function calculatePullSizeWithToken(repo: string, tag: string, token: string): Promise<PullSizeEstimate> {
    const manifestUrl = `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`;
    
    // Accept both OCI and Docker manifest types
    const acceptHeaders = [
        "application/vnd.oci.image.index.v1+json",
        "application/vnd.docker.distribution.manifest.list.v2+json",
        "application/vnd.oci.image.manifest.v1+json",
        "application/vnd.docker.distribution.manifest.v2+json"
    ].join(", ");
    
    const manifestResp = await axios.get(manifestUrl, {
        headers: {
            Accept: acceptHeaders,
            Authorization: `Bearer ${token}`
        }
    });
    
    let manifest = manifestResp.data;
    
    // If manifest is a manifest list or OCI index, pick the first amd64/linux image manifest
    if ((manifest.mediaType === "application/vnd.docker.distribution.manifest.list.v2+json" ||
        manifest.mediaType === "application/vnd.oci.image.index.v1+json") && Array.isArray(manifest.manifests)) {
        const amd64Manifest = manifest.manifests.find((m: { platform?: { architecture?: string; os?: string }; digest: string }) =>
            m.platform?.architecture === "amd64" && m.platform?.os === "linux"
        );
        
        if (amd64Manifest) {
            const imageManifestResp = await axios.get(
                `https://registry-1.docker.io/v2/${repo}/manifests/${amd64Manifest.digest}`,
                {
                    headers: {
                        Accept: [
                            "application/vnd.oci.image.manifest.v1+json",
                            "application/vnd.docker.distribution.manifest.v2+json"
                        ].join(", "),
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            manifest = imageManifestResp.data;
        }
    }
    
    // Extract layer information
    const layers = manifest.layers || [];
    let totalSize = 0;
    const layerInfo: Array<{ size: number; digest: string }> = [];
    
    for (const layer of layers) {
        const size = layer.size || 0;
        totalSize += size;
        layerInfo.push({
            size,
            digest: layer.digest || ''
        });
    }
    
    return {
        totalSize,
        layers: layerInfo
    };
}
