import { z } from "zod";
import axios from "axios";

export const dockerTrackBaseUpdates = (env: NodeJS.ProcessEnv) => ({
    name: "docker_track_base_updates",
    description: "Check if the base image of a DockerHub image has updates available.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { baseImage: z.string().nullable(), isUpToDate: z.boolean().nullable(), latestBaseTag: z.string().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            // Get a token for the registry API
            const repo = `${input.namespace}/${input.repository}`;
            const manifestUrl = `https://registry-1.docker.io/v2/${repo}/manifests/${input.tag}`;
            const authResp = await axios.get(
                `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
            );
            const token = authResp.data.token;
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
                const amd64Manifest = manifest.manifests.find((m: any) => m.platform?.architecture === "amd64" && m.platform?.os === "linux");
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
            // Now fetch the config blob to get base image info
            const configDigest = manifest.config?.digest;
            if (!configDigest) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `No config digest found for ${repo}:${input.tag}`
                        }
                    ],
                    baseImage: null,
                    isUpToDate: null,
                    latestBaseTag: null
                };
            }
            const configResp = await axios.get(`https://registry-1.docker.io/v2/${repo}/blobs/${configDigest}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const config = configResp.data;
            // Try to extract base image from history or config
            let baseImage: string | null = null;
            if (Array.isArray(config.history)) {
                for (const entry of config.history) {
                    if (entry.created_by && typeof entry.created_by === 'string' && entry.created_by.includes('FROM')) {
                        // Try to extract the base image name from the Dockerfile command
                        const match = entry.created_by.match(/FROM ([^\s]+)/);
                        if (match) {
                            baseImage = match[1];
                            break;
                        }
                    }
                }
            }
            if (!baseImage) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `Could not determine base image for ${repo}:${input.tag}`
                        }
                    ],
                    baseImage: null,
                    isUpToDate: null,
                    latestBaseTag: null
                };
            }
            // Now check if the base image has a newer tag (assume 'latest' is the newest for simplicity)
            const [baseNamespace, baseRepo] = baseImage.includes('/') ? baseImage.split('/') : ['library', baseImage];
            const tagsResp = await axios.get(`https://hub.docker.com/v2/repositories/${baseNamespace}/${baseRepo}/tags`);
            const tags = tagsResp.data.results || [];
            const latestTag = tags.find((t: any) => t.name === 'latest');
            // For simplicity, just compare digests if available
            let isUpToDate: boolean | null = null;
            if (latestTag && latestTag.images && Array.isArray(latestTag.images)) {
                const latestDigest = latestTag.images[0]?.digest;
                isUpToDate = latestDigest === config.rootfs?.diff_ids?.[0];
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: isUpToDate === true
                            ? `Base image ${baseImage} is up to date.`
                            : isUpToDate === false
                                ? `Base image ${baseImage} has updates available.`
                                : `Could not determine update status for base image ${baseImage}.`
                    }
                ],
                baseImage,
                isUpToDate,
                latestBaseTag: latestTag?.name || null
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to check base image updates: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                baseImage: null,
                isUpToDate: null,
                latestBaseTag: null
            };
        }
    }
});
