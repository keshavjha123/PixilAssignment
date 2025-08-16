import { dockerListTags } from '../src/tools/docker_list_tags';

jest.setTimeout(40000); // Increase Jest timeout to 40 seconds for slow DockerHub API tests

describe('docker_list_tags tool', () => {
    const env = process.env;
    const tool = dockerListTags(env);

    it('should return tags for a valid image', async () => {
        // Use a well-known public image for testing
        const input = { namespace: 'library', repository: 'nginx' };
        const result = await tool.handler(input);
        expect(result.structuredContent).toHaveProperty('results');
        expect(Array.isArray(result.structuredContent.results)).toBe(true);
        expect(result.structuredContent.results.length).toBeGreaterThan(0);
        expect(result.content[0].text).toMatch(/Found \d+ tags for library\/nginx/);
    }, 20000); // Increase timeout to 20 seconds
});
