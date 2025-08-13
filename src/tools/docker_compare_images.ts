import { z } from "zod";
import axios from "axios";

export const dockerCompareImages = (env: NodeJS.ProcessEnv) => ({
    name: "docker_compare_images",
    description: "Compare two DockerHub images by layers, sizes, and base images.",
    inputSchema: {
        image1: z.object({ namespace: z.string(), repository: z.string(), tag: z.string() }),
        image2: z.object({ namespace: z.string(), repository: z.string(), tag: z.string() })
    },
    outputSchema: {
        comparison: z.any()
    },
    handler: async (input: {
        image1: { namespace: string; repository: string; tag: string },
        image2: { namespace: string; repository: string; tag: string }
    }) => {
        async function fetchManifestAndLayers({ namespace, repository, tag }: { namespace: string; repository: string; tag: string }) {
            const repo = `${namespace}/${repository}`;
            const url = `https://registry-1.docker.io/v2/${repo}/manifests/${tag}`;
            const authResp = await axios.get(
                `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repo}:pull`
            );
            const token = authResp.data.token;
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
            return { manifest, layers, totalSize };
        }
        try {
            const [img1, img2] = await Promise.all([
                fetchManifestAndLayers(input.image1),
                fetchManifestAndLayers(input.image2)
            ]);
            // Compare layers by digest
            const img1LayerDigests = img1.layers.map((l: any) => l.digest);
            const img2LayerDigests = img2.layers.map((l: any) => l.digest);
            const sharedLayers = img1LayerDigests.filter((d: string) => img2LayerDigests.includes(d));
            const uniqueToImg1 = img1LayerDigests.filter((d: string) => !img2LayerDigests.includes(d));
            const uniqueToImg2 = img2LayerDigests.filter((d: string) => !img1LayerDigests.includes(d));
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Compared images. Shared layers: ${sharedLayers.length}, Unique to image1: ${uniqueToImg1.length}, Unique to image2: ${uniqueToImg2.length}`
                    }
                ],
                comparison: {
                    image1: {
                        totalSize: img1.totalSize,
                        layers: img1.layers
                    },
                    image2: {
                        totalSize: img2.totalSize,
                        layers: img2.layers
                    },
                    sharedLayers,
                    uniqueToImg1,
                    uniqueToImg2
                }
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to compare images: ${err?.response?.data?.errors?.[0]?.message || err.message}`
                    }
                ],
                comparison: null
            };
        }
    }
});
