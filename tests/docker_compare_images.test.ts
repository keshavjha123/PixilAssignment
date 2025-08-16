import { dockerCompareImages } from '../src/tools/docker_compare_images';

jest.setTimeout(40000);

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
        expect(result).toHaveProperty('structuredContent');
        expect(result.structuredContent.comparison).not.toBeNull();
        if (result.structuredContent.comparison && 'commonLayers' in result.structuredContent.comparison) {
            expect(typeof result.structuredContent.comparison.commonLayers).toBe('number');
            expect(typeof result.structuredContent.comparison.uniqueToImage1).toBe('number');
            expect(typeof result.structuredContent.comparison.uniqueToImage2).toBe('number');
        }
        expect(result.content[0].text).toMatch(/Image Comparison:|Compared images/);
    }, 20000);

    it('should fail for a non-existent image', async () => {
        const input = {
            image1: { namespace: 'library', repository: 'nginx', tag: 'latest' },
            image2: { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' }
        };
        const result = await tool.handler(input);
        expect(result.structuredContent.comparison).toHaveProperty('error');
        expect(result.content[0].text).toMatch(/Failed to compare images/);
    }, 20000);
});
