import { z } from "zod";
import { compareImages } from "../dockerhubFunctions/imageComparison";

export const dockerCompareImages = (env: NodeJS.ProcessEnv) => ({
    name: "docker_compare_images",
    description: "Compare two DockerHub images by layers, sizes, and base images.",
    inputSchema: {
        image1: z.object({ 
            namespace: z.string(), 
            repository: z.string(), 
            tag: z.string() 
        }),
        image2: z.object({ 
            namespace: z.string(), 
            repository: z.string(), 
            tag: z.string() 
        })
    },
    outputSchema: {
        comparison: z.object({
            image1: z.object({
                name: z.string(),
                size: z.number(),
                layerCount: z.number(),
                layers: z.array(z.object({
                    digest: z.string(),
                    size: z.number()
                }))
            }),
            image2: z.object({
                name: z.string(),
                size: z.number(),
                layerCount: z.number(),
                layers: z.array(z.object({
                    digest: z.string(),
                    size: z.number()
                }))
            }),
            sizeDifference: z.number(),
            commonLayers: z.number(),
            uniqueToImage1: z.number(),
            uniqueToImage2: z.number()
        })
    },
    handler: async (input: {
        image1: { namespace: string; repository: string; tag: string },
        image2: { namespace: string; repository: string; tag: string }
    }) => {
        try {
            const comparison = await compareImages(input.image1, input.image2, env.DOCKERHUB_TOKEN);
            
            // Format sizes in MB for readability
            const image1SizeMB = (comparison.image1.size / (1024 * 1024)).toFixed(2);
            const image2SizeMB = (comparison.image2.size / (1024 * 1024)).toFixed(2);
            const sizeDiffMB = (comparison.sizeDifference / (1024 * 1024)).toFixed(2);
            
            const summaryText = `Image Comparison:

            ${comparison.image1.name}: ${image1SizeMB} MB (${comparison.image1.layerCount} layers)
            ${comparison.image2.name}: ${image2SizeMB} MB (${comparison.image2.layerCount} layers)

            Size difference: ${sizeDiffMB} MB
            Common layers: ${comparison.commonLayers}
            Unique to ${comparison.image1.name}: ${comparison.uniqueToImage1}
            Unique to ${comparison.image2.name}: ${comparison.uniqueToImage2}`;
                        
            return {
                content: [
                    {
                        type: "text" as const,
                        text: summaryText
                    }
                ],
                structuredContent: {
                    comparison
                }
            };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to compare images: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    comparison: {
                        error: errorMessage,
                        image1: {
                            name: "error",
                            size: 0,
                            layerCount: 0,
                            layers: []
                        },
                        image2: {
                            name: "error", 
                            size: 0,
                            layerCount: 0,
                            layers: []
                        },
                        sizeDifference: 0,
                        commonLayers: 0,
                        uniqueToImage1: 0,
                        uniqueToImage2: 0
                    }
                }
            };
        }
    }
});