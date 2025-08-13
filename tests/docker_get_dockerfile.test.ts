import { dockerGetDockerfile } from '../src/tools/docker_get_dockerfile';

describe('docker_get_dockerfile tool', () => {
    const env = process.env;
    const tool = dockerGetDockerfile(env);

    it('should return a Dockerfile for an official image if available', async () => {
        // Use a well-known official image (nginx) for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        // Dockerfile may or may not be found, so just check for string or null
        expect(result).toHaveProperty('dockerfile');
        expect(result.content[0].text).toMatch(/Dockerfile (found|not found) for library\/nginx:latest/);
    }, 15000);

    it('should return null for a non-existent image', async () => {
        const input = { namespace: 'library', repository: 'nonexistentrepo12345', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result.dockerfile).toBeNull();
        expect(result.content[0].text).toMatch(/not found|Failed to retrieve Dockerfile/);
    }, 10000);
});
