import { dockerDeleteTag } from '../src/tools/docker_delete_tag';

describe('docker_delete_tag tool', () => {
    const env = process.env;
    const tool = dockerDeleteTag(env);

    it('should fail to delete a tag from a public image without auth', async () => {
        // This should fail unless you have permissions on the repo
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
        expect(result.content[0].text).toMatch(/Failed to delete tag/);
    }, 10000);

    // To test successful deletion, provide credentials and a test repo/tag you control
    // it('should delete a tag from a test repo with valid auth', async () => {
    //     const input = { namespace: 'your_namespace', repository: 'your_repo', tag: 'testtag' };
    //     const result = await tool.handler(input);
    //     expect(result.success).toBe(true);
    //     expect(result.message).toMatch(/deleted successfully/);
    // }, 10000);
});
