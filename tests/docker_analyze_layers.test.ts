import { dockerAnalyzeLayers } from '../src/tools/docker_analyze_layers';

describe('docker_analyze_layers tool', () => {
    const env = process.env;
    const tool = dockerAnalyzeLayers(env);

    it('should return layers and total size for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('layers');
        expect(Array.isArray(result.layers)).toBe(true);
        expect(result.layers.length).toBeGreaterThan(0);
        expect(typeof result.totalSize).toBe('number');
        expect(result.content[0].text).toMatch(/Found \d+ layers, total size: \d+ bytes for library\/nginx:latest/);
    }, 10000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.layers.length).toBe(0);
        expect(result.totalSize).toBe(0);
        expect(result.content[0].text).toMatch(/Failed to analyze layers/);
    }, 10000);
});
