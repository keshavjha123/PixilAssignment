import { searchImages } from '../src/dockerhubFunctions/searchImages';

describe('DockerHub Search', () => {
    it('should search for images on DockerHub', async () => {
        const data = await searchImages('nginx');
        expect(data).toHaveProperty('count');
        expect(data.count).toBeGreaterThan(0);
        expect(Array.isArray(data.results)).toBe(true);
    });
});
