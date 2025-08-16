import { globalCache, SmartCache } from './SmartCache';
import { getImageDetails } from '../dockerhubFunctions/imageDetails';
import { listRepositoryTags } from '../dockerhubFunctions/listRepositoryTags';
import { getManifestDetails } from '../dockerhubFunctions/manifestDetails';
import { searchImages } from '../dockerhubFunctions/searchImages';
import { getImageVulnerabilities } from '../dockerhubFunctions/imageVulnerabilities';
import { getDockerfile } from '../dockerhubFunctions/dockerfileInfo';

/**
 * Cached wrapper for DockerHub API functions
 * Only caches static/semi-static data, never dynamic data like real-time stats
 */
export class CachedDockerHubAPI {
    private cache: SmartCache;

    constructor(cache?: SmartCache) {
        this.cache = cache || globalCache;
    }

    /**
     * Get image details (STATIC DATA - safe to cache for 1 hour)
     * Image descriptions, maintainer info rarely change
     */
    async getImageDetails(namespace: string, repository: string) {
        const key = SmartCache.generateKey('image_details', { namespace, repository });
        return this.cache.get(key,
            () => getImageDetails(namespace, repository, process.env.DOCKERHUB_TOKEN),
            'imageMetadata'
        );
    }

    /**
     * List tags (SEMI-STATIC DATA - cache for 30 minutes)
     * Tags are added periodically but not constantly
     */
    async listTags(namespace: string, repository: string, page?: number, pageSize?: number) {
        const key = SmartCache.generateKey('list_tags', { namespace, repository, page, pageSize });
        return this.cache.get(key,
            () => listRepositoryTags(namespace, repository, page, pageSize, process.env.DOCKERHUB_TOKEN),
            'tags'
        );
    }

    /**
     * Get manifest (SEMI-STATIC DATA - cache for 30 minutes)
     * Manifests rarely change for the same tag
     */
    async getManifest(namespace: string, repository: string, tag: string) {
        const key = SmartCache.generateKey('manifest', { namespace, repository, tag });
        return this.cache.get(key,
            () => getManifestDetails(namespace, repository, tag, process.env.DOCKERHUB_TOKEN),
            'manifest'
        );
    }

    /**
     * Search images (DYNAMIC DATA - cache briefly for 15 minutes)
     * Search results change as new images are published
     */
    async searchImages(query: string, page?: number, pageSize?: number) {
        const key = SmartCache.generateKey('search_images', { query, page, pageSize });
        return this.cache.get(key,
            () => searchImages(query, page, pageSize, process.env.DOCKERHUB_TOKEN),
            'searchResults'
        );
    }

    /**
     * Get vulnerabilities (SEMI-STATIC DATA - cache for 2 hours)
     * Vulnerability scans are updated periodically
     */
    async getVulnerabilities(namespace: string, repository: string, tag: string) {
        const key = SmartCache.generateKey('vulnerabilities', { namespace, repository, tag });
        return this.cache.get(key,
            () => getImageVulnerabilities(namespace, repository, tag, process.env.DOCKERHUB_TOKEN),
            'vulnerabilities'
        );
    }

    /**
     * Get Dockerfile (STATIC DATA - cache for 1 hour)
     * Dockerfiles rarely change for the same tag
     */
    async getDockerfile(namespace: string, repository: string, tag: string) {
        const key = SmartCache.generateKey('dockerfile', { namespace, repository, tag });
        return this.cache.get(key,
            () => getDockerfile(namespace, repository, tag, process.env.DOCKERHUB_TOKEN),
            'dockerfile'
        );
    }

    // === CACHE MANAGEMENT ===

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.getStats();
    }

    /**
     * Get cache information
     */
    getCacheInfo() {
        return this.cache.getInfo();
    }

    /**
     * Clear all cache
     */
    clearCache() {
        return this.cache.clear();
    }

    /**
     * Preload cache with popular images (static data only)
     */
    async preloadPopularImages() {
        const popularImages = [
            { namespace: 'library', repository: 'nginx' },
            { namespace: 'library', repository: 'alpine' },
            { namespace: 'library', repository: 'node' },
            { namespace: 'library', repository: 'python' },
            { namespace: 'library', repository: 'ubuntu' }
        ];

        const preloadFunctions = popularImages.flatMap(({ namespace, repository }) => [
            {
                key: SmartCache.generateKey('image_details', { namespace, repository }),
                fn: () => getImageDetails(namespace, repository, process.env.DOCKERHUB_TOKEN),
                type: 'imageMetadata' as const
            },
            {
                key: SmartCache.generateKey('list_tags', { namespace, repository, page: 1, pageSize: 10 }),
                fn: () => listRepositoryTags(namespace, repository, 1, 10, process.env.DOCKERHUB_TOKEN),
                type: 'tags' as const
            }
        ]);

        await this.cache.preload(preloadFunctions);
    }
}

// Export a singleton instance
export const cachedDockerHubAPI = new CachedDockerHubAPI();
