import { z } from "zod";
import axios from "axios";

export const dockerEstimatePullSize = (env: NodeJS.ProcessEnv) => ({
    name: "docker_estimate_pull_size",
    description: "Estimate the total download size for a DockerHub image tag.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { totalSize: z.number(), layers: z.array(z.any()) },
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
            let manifestResp = await axios.get(manifestUrl, {
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
                        text: `Estimated pull size for ${repo}:${input.tag} is ${totalSize} bytes.`
                    }
                ],
                totalSize,
                layers
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to estimate pull size: ${err?.response?.data?.detail || err.message}`
                    }
                ],
                totalSize: 0,
                layers: []
            };
        }
    }
});
