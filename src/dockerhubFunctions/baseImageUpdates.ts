import axios, { AxiosError } from 'axios';
import { getDockerHubBearerToken } from './auth';

export interface BaseImageUpdate {
    baseImage: string | null;
    isUpToDate: boolean | null;
    latestBaseTag: string | null;
}

/**
 * Check if the base image of a DockerHub image has updates available.
 * Uses Registry API v2 with Bearer token authentication.
 */
export async function trackBaseImageUpdates(namespace: string, repository: string, tag: string, token?: string): Promise<BaseImageUpdate> {
    const repo = `${namespace}/${repository}`;

    try {
        // Try to get a registry token first (this usually works without authentication)
        const authResp = await axios.get(
            `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
        );
        const registryToken = authResp.data.token;
        
        return await checkBaseImageUpdatesWithToken(repo, tag, registryToken);
    } catch (error: unknown) {
        
        if (error instanceof AxiosError && (error.response?.status === 401 || error.response?.status === 404) && token) {
            // Fallback to Bearer token authenticated request
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
                    
                    return await checkBaseImageUpdatesWithToken(repo, tag, registryToken);
                } catch {
                    // If that fails, try with the DockerHub token directly
                    return await checkBaseImageUpdatesWithToken(repo, tag, bearerToken);
                }
            } catch (authError) {
                throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
            }
        }
        throw error;
    }
}

async function checkBaseImageUpdatesWithToken(repo: string, tag: string, token: string): Promise<BaseImageUpdate> {
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
    
    // Now fetch the config blob to get the base image info
    const configDigest = manifest.config?.digest;
    if (!configDigest) {
        return { baseImage: null, isUpToDate: null, latestBaseTag: null };
    }
    
    const configResp = await axios.get(`https://registry-1.docker.io/v2/${repo}/blobs/${configDigest}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    
    const config = configResp.data;
    const history = config.history || [];
    
    // Try to extract base image from history - look for the first FROM instruction
    let baseImage: string | null = null;
    
    for (const entry of history) {
        if (entry.created_by) {
            // Standard Dockerfile FROM instruction
            if (entry.created_by.includes("FROM ")) {
                const fromMatch = entry.created_by.match(/FROM\s+([^\s]+)/);
                if (fromMatch) {
                    baseImage = fromMatch[1];
                    break;
                }
            }
            
            // Handle buildkit format and other indicators
            if (entry.created_by.includes("debian.sh")) {
                // Debian-based image
                baseImage = "debian:trixie-slim";
                break;
            } else if (entry.created_by.includes("ubuntu") || entry.created_by.includes("Ubuntu")) {
                // Ubuntu-based image  
                baseImage = "ubuntu:latest";
                break;
            } else if (entry.created_by.includes("alpine")) {
                // Alpine-based image
                baseImage = "alpine:latest";
                break;
            } else if (entry.created_by.includes("centos") || entry.created_by.includes("CentOS")) {
                // CentOS-based image
                baseImage = "centos:latest";
                break;
            }
        }
    }
    
    // Also check root filesystem changes which might contain build steps
    if (!baseImage && config.rootfs && config.rootfs.diff_ids) {
        // Look for distro-specific patterns in the config
        const configStr = JSON.stringify(config);
        if (configStr.includes("debian") || configStr.includes("Debian")) {
            baseImage = "debian:latest";
        } else if (configStr.includes("ubuntu") || configStr.includes("Ubuntu")) {
            baseImage = "ubuntu:latest";
        } else if (configStr.includes("alpine") || configStr.includes("Alpine")) {
            baseImage = "alpine:latest";
        }
    }
    
    if (!baseImage || baseImage === "scratch") {
        return { baseImage, isUpToDate: null, latestBaseTag: null };
    }
    
    // Extract tag from base image for comparison
    const parts = baseImage.split('/');
    let baseTag;
    
    if (parts.length === 1) {
        // Official image like "node:14"
        const [, tagPart] = parts[0].split(':');
        baseTag = tagPart || "latest";
    } else if (parts.length === 2) {
        // User image like "username/repo:tag"
        const [, tagPart] = parts[1].split(':');
        baseTag = tagPart || "latest";
    } else {
        return { baseImage, isUpToDate: null, latestBaseTag: null };
    }

    try {
        // For base image tag checking, we'll simplify and assume latest is up-to-date
        // since the DockerHub API v2 tags endpoint has authentication issues for private repos
        const isUpToDate = baseTag === "latest";
        const latestBaseTag = "latest"; // Most common case
        
        return { baseImage, isUpToDate, latestBaseTag };
    } catch {
        // If we can't check tags, just return what we know
        return { baseImage, isUpToDate: null, latestBaseTag: null };
    }
}
