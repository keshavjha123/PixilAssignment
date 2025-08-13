import { dockerGetManifest } from '../src/tools/docker_get_manifest';

describe('docker_get_manifest tool', () => {
    const env = process.env;
    const tool = dockerGetManifest(env);

    it('should return a manifest for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('manifest');
        expect(result.manifest).toBeTruthy();
        expect(result.content[0].text).toMatch(/Manifest for library\/nginx:latest/);
    }, 10000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.manifest).toBeNull();
        expect(result.content[0].text).toMatch(/Failed to retrieve manifest/);
    }, 10000);
});
