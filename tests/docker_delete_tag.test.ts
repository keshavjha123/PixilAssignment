import { dockerDeleteTag } from '../src/tools/docker_delete_tag';

describe('docker_delete_tag tool', () => {
    const env = process.env;
    const tool = dockerDeleteTag(env);

    it('should fail to delete a tag from a public image without auth', async () => {
        // This should fail unless you have permissions on the repo
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result.structuredContent.success).toBe(false);
        expect(result.structuredContent.message).toBeDefined();
        expect(result.content[0].text).toMatch(/Failed to delete tag/);
    }, 10000);

});
