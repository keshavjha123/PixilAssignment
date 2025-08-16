import { dockerGetStats } from '../src/tools/docker_get_stats';

describe('docker_get_stats tool', () => {
    const env = process.env;
    const tool = dockerGetStats(env);

    it('should return stats for a valid image', async () => {
        // Use a well-known public image for testing
        const input = { namespace: 'library', repository: 'nginx' };
        const result = await tool.handler(input);
    expect(typeof result.structuredContent.pull_count).toBe('number');
    expect(typeof result.structuredContent.star_count).toBe('number');
        expect(result.content[0].text).toMatch(/Stats for library\/nginx: \d+ pulls, \d+ stars\./);
    }, 10000);

    it('should fail for a non-existent image', async () => {
        const input = { namespace: 'library', repository: 'nonexistentrepo12345' };
        const result = await tool.handler(input);
    expect(result.structuredContent.pull_count).toBe(0);
    expect(result.structuredContent.star_count).toBe(0);
        expect(result.content[0].text).toMatch(/Failed to retrieve stats/);
    }, 10000);
});
