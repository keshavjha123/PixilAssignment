import { dockerSearchImages } from '../src/tools/docker_search_images';

describe('docker_search_images tool', () => {
    const env = process.env;
    const tool = dockerSearchImages(env);

    it('should return results for a valid query', async () => {
        const input = { query: 'nginx' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('results');
        expect(result.results).toHaveProperty('count');
        expect(result.results.count).toBeGreaterThan(0);
        expect(Array.isArray(result.results.results)).toBe(true);
        expect(result.content[0].text).toMatch(/Found \d+ images for query: nginx/);
    });
});
