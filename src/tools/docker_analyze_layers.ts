import { z } from "zod";
import { DockerHubClient } from "../dockerhub/client";
import axios from "axios";

export const dockerAnalyzeLayers = (env: NodeJS.ProcessEnv) => ({
    name: "docker_analyze_layers",
    description: "Analyze the layers and sizes of a DockerHub image tag.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { layers: z.array(z.any()), totalSize: z.number() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        const repo = `${input.namespace}/${input.repository}`;
        const url = `https://registry-1.docker.io/v2/${repo}/manifests/${input.tag}`;
        try {
            // Get a token for the registry API
            const authResp = await axios.get(
                `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
            );
            const token = authResp.data.token;
            // Accept both manifest list and image manifest
            const acceptHeaders = [
                "application/vnd.oci.image.index.v1+json",
                "application/vnd.docker.distribution.manifest.list.v2+json",
                "application/vnd.oci.image.manifest.v1+json",
                "application/vnd.docker.distribution.manifest.v2+json"
            ].join(", ");
            const manifestResp = await axios.get(url, {
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
            const layers = manifest.layers || [];
            const totalSize = layers.reduce((sum: number, l: any) => sum + (l.size || 0), 0);
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Found ${layers.length} layers, total size: ${totalSize} bytes for ${repo}:${input.tag}`
                    }
                ],
                layers,
                totalSize
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to analyze layers: ${err?.response?.data?.errors?.[0]?.message || err.message}`
                    }
                ],
                layers: [],
                totalSize: 0
            };
        }
    }
});
