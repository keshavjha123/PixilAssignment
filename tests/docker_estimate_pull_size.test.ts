import { dockerEstimatePullSize } from "../src/tools/docker_estimate_pull_size";

jest.setTimeout(40000);

describe("docker_estimate_pull_size tool", () => {
    const tool = dockerEstimatePullSize(process.env);
    it("should estimate pull size for a valid image tag", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "latest" };
        const result = await tool.handler(input);
        expect(result.structuredContent.totalSize).toBeGreaterThan(0);
        expect(Array.isArray(result.structuredContent.layers)).toBe(true);
        expect(result.content[0].text).toMatch(/Estimated pull size/);
    });

    it("should handle invalid image tag gracefully", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "nonexistenttag123" };
        const result = await tool.handler(input);
        expect(result.structuredContent.totalSize).toBe(0);
        expect(Array.isArray(result.structuredContent.layers)).toBe(true);
        expect(result.content[0].text).toMatch(/Failed to estimate pull size/);
    });
});
