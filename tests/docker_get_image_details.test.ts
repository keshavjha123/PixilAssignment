import { dockerGetImageDetails } from '../src/tools/docker_get_image_details';

describe('docker_get_image_details tool', () => {
    const env = process.env;
    const tool = dockerGetImageDetails(env);

    it('should return details for a valid image', async () => {
        // Use a well-known public image for testing
        const input = { namespace: 'library', repository: 'nginx' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('structuredContent');
        expect(result.structuredContent.results).toHaveProperty('name');
        expect(result.structuredContent.results).toHaveProperty('namespace');
        expect(result.content[0].text).toMatch(/Details for library\/nginx/);
    });
});
