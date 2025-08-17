import { dockerAnalyzeLayers } from '../src/tools/docker_analyze_layers';

jest.setTimeout(40000);

describe('docker_analyze_layers tool', () => {
    const tool = dockerAnalyzeLayers(process.env);

    it('should return layers and total size for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('structuredContent');
        expect(Array.isArray(result.structuredContent.layers)).toBe(true);
        expect(result.structuredContent.layers.length).toBeGreaterThan(0);
        expect(typeof result.structuredContent.totalSize).toBe('number');
        expect(result.content[0].text).toMatch(/Found \d+ layers.*total size: \d+ bytes for library\/nginx:latest/s);
    }, 10000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.structuredContent.layers.length).toBe(0);
        expect(result.structuredContent.totalSize).toBe(0);
        expect(result.content[0].text).toMatch(/Failed to analyze layers/);
    }, 10000);
});
