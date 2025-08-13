import { dockerGetImageHistory } from "../src/tools/docker_get_image_history";

describe("docker_get_image_history tool", () => {
    const tool = dockerGetImageHistory(process.env);

    it("should get image history for a valid image tag", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "latest" };
        const result = await tool.handler(input);
        expect(Array.isArray(result.history)).toBe(true);
        expect(result.content[0].text).toMatch(/Found \d+ history entries for/);
    });

    it("should handle invalid image tag gracefully", async () => {
        const input = { namespace: "library", repository: "nginx", tag: "nonexistenttag123" };
        const result = await tool.handler(input);
        expect(Array.isArray(result.history)).toBe(true);
        expect(result.content[0].text).toMatch(/Failed to retrieve image history/);
    });
});
