import { dockerCompareImages } from '../src/tools/docker_compare_images';

describe('docker_compare_images tool', () => {
    const env = process.env;
    const tool = dockerCompareImages(env);

    it('should compare two valid images and return shared/unique layers', async () => {
        // Use two well-known public images for testing
        const input = {
            image1: { namespace: 'library', repository: 'nginx', tag: 'latest' },
            image2: { namespace: 'library', repository: 'alpine', tag: 'latest' }
        };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('comparison');
        expect(result.comparison).not.toBeNull();
        if (result.comparison) {
            expect(Array.isArray(result.comparison.sharedLayers)).toBe(true);
            expect(Array.isArray(result.comparison.uniqueToImg1)).toBe(true);
            expect(Array.isArray(result.comparison.uniqueToImg2)).toBe(true);
        }
        expect(result.content[0].text).toMatch(/Compared images. Shared layers: \d+, Unique to image1: \d+, Unique to image2: \d+/);
    }, 20000);

    it('should fail for a non-existent image', async () => {
        const input = {
            image1: { namespace: 'library', repository: 'nginx', tag: 'latest' },
            image2: { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' }
        };
        const result = await tool.handler(input);
        expect(result.comparison).toBeNull();
        expect(result.content[0].text).toMatch(/Failed to compare images/);
    }, 20000);
});
