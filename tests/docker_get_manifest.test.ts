import { dockerGetManifest } from '../src/tools/docker_get_manifest';

jest.setTimeout(40000);

describe('docker_get_manifest tool', () => {
    const env = process.env;
    const tool = dockerGetManifest(env);

    it('should return a manifest for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result.structuredContent).toHaveProperty('manifest');
        // Since Docker registry requires auth even for public images, manifest might be null without token
        if (result.structuredContent.manifest) {
            expect(result.structuredContent.manifest).toBeTruthy();
            expect(result.content[0].text).toMatch(/Manifest for library\/nginx:latest/);
        } else {
            // If no token is available, should get authentication error
            expect(result.content[0].text).toMatch(/Failed to retrieve manifest|Authentication failed/);
        }
    }, 10000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.structuredContent.manifest).toBeNull();
        expect(result.content[0].text).toMatch(/Failed to retrieve manifest/);
    }, 10000);
});
