import { dockerListRepositories } from '../src/tools/docker_list_repositories';

describe('docker_list_repositories tool', () => {
    const env = process.env;
    const tool = dockerListRepositories(env);

    it('should return repositories for a public DockerHub user', async () => {
        // Use a well-known public DockerHub user for testing
        const input = { username: 'library' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('structuredContent');
        expect(Array.isArray(result.structuredContent.repositories)).toBe(true);
        expect(result.structuredContent.repositories.length).toBeGreaterThan(0);
        expect(result.content[0].text).toMatch(/Found \d+ repositories for user library/);
    }, 10000);
});
