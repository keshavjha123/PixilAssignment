import { dockerGetTagDetails } from '../src/tools/docker_get_tag_details';

describe('docker_get_tag_details tool', () => {
    const env = process.env;
    const tool = dockerGetTagDetails(env);

    it('should return details for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('tagDetails');
        expect(result.tagDetails).toHaveProperty('name', 'latest');
        expect(result.content[0].text).toMatch(/Details for tag latest of library\/nginx/);
    }, 10000); // 10s timeout for network
});
