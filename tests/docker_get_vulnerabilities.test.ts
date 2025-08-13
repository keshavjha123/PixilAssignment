import { dockerGetVulnerabilities } from '../src/tools/docker_get_vulnerabilities';

describe('docker_get_vulnerabilities tool', () => {
    const env = process.env;
    const tool = dockerGetVulnerabilities(env);

    it('should return vulnerabilities or a message for a valid image tag', async () => {
        // Use a well-known public image and tag for testing
        const input = { namespace: 'library', repository: 'nginx', tag: 'latest' };
        const result = await tool.handler(input);
        expect(result).toHaveProperty('vulnerabilities');
        expect(result.content[0].text).toMatch(/Vulnerabilities found|No vulnerability data available/);
    }, 10000);

    it('should fail for a non-existent tag', async () => {
        const input = { namespace: 'library', repository: 'nginx', tag: 'nonexistenttag12345' };
        const result = await tool.handler(input);
        expect(result.vulnerabilities).toBeNull();
        expect(result.content[0].text).toMatch(/(No vulnerability data available|Failed to retrieve vulnerabilities)/);
    }, 10000);
});
