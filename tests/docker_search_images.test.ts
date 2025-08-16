import { dockerSearchImages } from '../src/tools/docker_search_images';

describe('docker_search_images tool', () => {
    const env = process.env;
    const tool = dockerSearchImages(env);

    it('should return results for a valid query', async () => {
        const input = { query: 'nginx' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('structuredContent');
        expect(result.structuredContent.results).toHaveProperty('count');
        expect(result.structuredContent.results.count).toBeGreaterThan(0);
        expect(Array.isArray(result.structuredContent.results.results)).toBe(true);
        expect(result.content[0].text).toMatch(/Found \d+ images for query: nginx/);
    });
});
