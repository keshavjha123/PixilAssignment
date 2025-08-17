import { dockerGetImageHistory } from "../src/tools/docker_get_image_history";

jest.setTimeout(40000);

describe("docker_get_image_history tool", () => {
    const tool = dockerGetImageHistory(process.env);

    it("should get image history for a valid image tag", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "latest" };
        const result = await tool.handler(input);
        expect(Array.isArray(result.structuredContent.history)).toBe(true);
        expect(result.content[0].text).toMatch(/Found \d+.*entries for/s);
    });

    it("should handle invalid image tag gracefully", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "nonexistenttag123" };
        const result = await tool.handler(input);
        expect(Array.isArray(result.structuredContent.history)).toBe(true);
        expect(result.content[0].text).toMatch(/Failed to get history/);
    });
});
