import { z } from "zod";
import { trackBaseImageUpdates } from "../dockerhubFunctions/baseImageUpdates";

export const dockerTrackBaseUpdates = (env: NodeJS.ProcessEnv) => ({
    name: "docker_track_base_updates",
    description: "Check if the base image of a DockerHub image has updates available.",
    inputSchema: { namespace: z.string(), repository: z.string(), tag: z.string() },
    outputSchema: { baseImage: z.string().nullable(), isUpToDate: z.boolean().nullable(), latestBaseTag: z.string().nullable() },
    handler: async (input: { namespace: string; repository: string; tag: string }) => {
        try {
            const result = await trackBaseImageUpdates(input.namespace, input.repository, input.tag, env.DOCKERHUB_TOKEN);
            const repo = `${input.namespace}/${input.repository}`;

            let statusText = `Base image analysis for ${repo}:${input.tag}`;
            if (result.baseImage) {
                statusText += `\nBase image: ${result.baseImage}`;
                if (result.isUpToDate !== null) {
                    statusText += result.isUpToDate ? " (up to date)" : " (updates available)";
                    if (result.latestBaseTag) {
                        statusText += `\nLatest base tag: ${result.latestBaseTag}`;
                    }
                }
            } else {
                statusText += "\nNo base image detected (might be built from scratch)";
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `${statusText} and the complete complete response from the analysis is:\n\n${JSON.stringify(result, null, 2)}`
                    }
                ],
                structuredContent: {
                    baseImage: result.baseImage,
                    isUpToDate: result.isUpToDate,
                    latestBaseTag: result.latestBaseTag
                }
            };
        } catch (err: unknown) {
            const repo = `${input.namespace}/${input.repository}`;
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Failed to check base image updates for ${repo}:${input.tag}: ${errorMessage}`
                    }
                ],
                structuredContent: {
                    baseImage: null,
                    isUpToDate: null,
                    latestBaseTag: null
                }
            };
        }
    }
});
