import axios, { AxiosError } from 'axios';
import { getDockerHubBearerToken } from './auth';

/**
 * Get the layers and total size for a DockerHub image tag.
 * Uses the same registry-based approach as docker_estimate_pull_size for compatibility.
 */
export async function getImageLayers(
    namespace: string, 
    repository: string, 
    tag: string, 
    token?: string
): Promise<{ layers: { size?: number; digest?: string }[]; totalSize: number }> {
    
    const repo = `${namespace}/${repository}`;
    
    try {
        // Try to get a registry token first (this usually works without authentication)
        const authResp = await axios.get(
            `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
        );
        const registryToken = authResp.data.token;
        
        return await calculateLayersWithToken(repo, tag, registryToken);
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
                    
                    return await calculateLayersWithToken(repo, tag, registryToken);
                } catch {
                    // If that fails, try with the DockerHub token directly
                    return await calculateLayersWithToken(repo, tag, bearerToken);
                }
            } catch (authError) {
                throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
            }
        }
        
        throw new Error(`Failed to get layer information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function calculateLayersWithToken(repo: string, tag: string, token: string): Promise<{ layers: { size?: number; digest?: string }[]; totalSize: number }> {
    const manifestUrl = `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`;
    
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
    
    const layers = manifest.layers || [];
    const layerData = layers.map((layer: { digest: string; size: number }) => ({
        digest: layer.digest || '',
        size: layer.size || 0
    }));
    
    const totalSize = layerData.reduce((sum: number, layer: { size: number }) => sum + layer.size, 0);
    
    return {
        layers: layerData,
        totalSize
    };
}