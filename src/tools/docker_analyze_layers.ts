import { z } from "zod";
import { getImageLayers } from "../dockerhubFunctions/imageLayers";

export const dockerAnalyzeLayers = (env: NodeJS.ProcessEnv) => ({
    name: "docker_analyze_layers",
    description: "Analyze the layers and sizes of a DockerHub image tag.",
    inputSchema: { 
        namespace: z.string(), 
        repository: z.string(), 
        tag: z.string() 
    },
    outputSchema: { 
        layers: z.array(z.object({
            size: z.number().optional(),
            digest: z.string().optional()
        })), 
        totalSize: z.number() 
    },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            // Use the same authentication method as working tools
            const { layers, totalSize } = await getImageLayers(
                input.namespace, 
                input.repository, 
                input.tag, 
                env.DOCKERHUB_TOKEN // Use token-based auth like other working tools
            );
            
            // Format layer information for human-readable output
            const layerDetails = layers.map((layer, index) => {
                const sizeInMB = layer.size ? (layer.size / 1024 / 1024).toFixed(2) : 'unknown';
                const digest = layer.digest ? ` (${layer.digest.substring(0, 12)}...)` : '';
                return `Layer ${index + 1}: ${sizeInMB} MB${digest}`;
            }).join('\n');
            
            const totalSizeInMB = (totalSize / 1024 / 1024).toFixed(2);
            console.log(`Total size for ${input.namespace}/${input.repository}:${input.tag}: ${totalSizeInMB} MB`);

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Found ${layers.length} layers, total size: ${totalSize} bytes for ${input.namespace}/${input.repository}:${input.tag}.\n\nLayer details:\n${layerDetails}\n\nTotal size: ${totalSizeInMB} MB (${layers.length} layers)`
                    }
                ],
                structuredContent: {
                    layers,
                    totalSize
                }
            };
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
                message = (err as { message: string }).message;
            } else {
                message = String(err);
            }
            
            // Provide more helpful error messages
            if (message.includes('401') || message.includes('Authentication failed')) {
                message = `Authentication failed for private repository. Please set DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD environment variables, or use a Personal Access Token.`;
            }
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to analyze layers: ${message}`
                    }
                ],
                structuredContent: {
                    layers: [],
                    totalSize: 0
                }
            };
        }
    }
});