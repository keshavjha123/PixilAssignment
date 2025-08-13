import { dockerTrackBaseUpdates } from '../src/tools/docker_track_base_updates';

describe('docker_track_base_updates tool', () => {
    const env = process.env;
    const tool = dockerTrackBaseUpdates(env);

    it('should return base image info and update status for a valid image', async () => {
        // Use a well-known public image for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('baseImage');
        expect(result).toHaveProperty('isUpToDate');
        expect(result.content[0].text).toMatch(/base image|Could not determine/);
    }, 15000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.baseImage).toBeNull();
        expect(result.isUpToDate).toBeNull();
        expect(result.content[0].text).toMatch(/Failed to check base image updates|No config digest/);
    }, 10000);
});
