import { DockerHubClient } from '../src/dockerhub/client';

describe('DockerHubClient', () => {
    const username = process.env.DOCKERHUB_USERNAME;
    const token = process.env.DOCKERHUB_TOKEN;

    it('should search for images on DockerHub', async () => {
        const client = new DockerHubClient({ username, token });
        const data = await client.searchImages('nginx');
        expect(data).toHaveProperty('count');
        expect(data.count).toBeGreaterThan(0);
        expect(Array.isArray(data.results)).toBe(true);
    });
});
