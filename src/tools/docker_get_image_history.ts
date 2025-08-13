import { z } from "zod";
import axios from "axios";

export const dockerGetImageHistory = (env: NodeJS.ProcessEnv) => ({
    name: "docker_get_image_history",
    description: "Get image build history for a DockerHub image tag (if available).",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { history: z.array(z.any()) },
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
            // Now fetch the config blob to get history
            const configDigest = manifest.config?.digest;
            if (!configDigest) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `No config digest found for ${repo}:${input.tag}`
                        }
                    ],
                    history: []
                };
            }
            const configResp = await axios.get(`https://registry-1.docker.io/v2/${repo}/blobs/${configDigest}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const config = configResp.data;
            const history = config.history || [];
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Found ${history.length} history entries for ${repo}:${input.tag}`
                    }
                ],
                history
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to retrieve image history: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                history: []
            };
        }
    }
});
