import { performance } from 'perf_hooks';

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
}

export interface CacheStats {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    entries: number;
    memoryUsage: number;
}

export interface CacheConfig {
    maxSize: number;
    defaultTTL: number;
    cleanupInterval: number;
    enableStats: boolean;
    logLevel: 'none' | 'basic' | 'detailed';
}

/**
 * Smart Cache with TTL, LRU eviction, and intelligent caching strategies
 * Optimized for DockerHub API responses with different cache strategies per data type
 */
export class SmartCache {
    private cache = new Map<string, CacheEntry<any>>();
    private accessOrder = new Map<string, number>();
    private stats: CacheStats;
    private config: CacheConfig;
    private cleanupTimer?: NodeJS.Timeout;
    private requestCounter = 0;

    // TTL strategies based on data volatility
    private ttlStrategies = {
        // Stable data - cache for longer periods
        imageMetadata: 3600000,      // 1 hour - basic image info changes rarely
        repositoryInfo: 3600000,     // 1 hour - repository details stable
        tags: 1800000,               // 30 minutes - tags updated moderately

        // Semi-stable data
        searchResults: 900000,       // 15 minutes - search results change with new images
        downloadStats: 1800000,      // 30 minutes - download counts update periodically
        vulnerabilities: 7200000,    // 2 hours - vulnerability scans updated periodically

        // Dynamic data - shorter cache periods
        manifest: 600000,            // 10 minutes - manifests can be updated
        layers: 600000,              // 10 minutes - layer info tied to manifests
        dockerfile: 3600000,         // 1 hour - Dockerfiles rarely change for same tag

        // Very dynamic data
        bearerTokens: 270000,        // 4.5 minutes (tokens expire in 5 minutes)
        rateLimit: 60000,            // 1 minute - rate limit status changes frequently
    };

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxSize: 1000,
            defaultTTL: 1800000, // 30 minutes default
            cleanupInterval: 300000, // 5 minutes
            enableStats: true,
            logLevel: 'basic',
            ...config
        };

        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            entries: 0,
            memoryUsage: 0
        };

        this.startCleanupTimer();
    }

    /**
     * Get data from cache or execute the provided function
     */
    async get<T>(
        key: string,
        fetchFn: () => Promise<T>,
        cacheType?: keyof typeof this.ttlStrategies,
        customTTL?: number
    ): Promise<T> {
        const startTime = performance.now();
        this.stats.totalRequests++;
        this.requestCounter++;

        // Check if data exists and is not expired
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && (cached.timestamp + cached.ttl) > now) {
            // Cache hit
            cached.hits++;
            this.stats.cacheHits++;
            this.accessOrder.set(key, this.requestCounter);

            const duration = performance.now() - startTime;
            this.log('detailed', 'Cache HIT', {
                key,
                age: now - cached.timestamp,
                hits: cached.hits,
                duration: `${duration.toFixed(2)}ms`
            });

            this.updateStats();
            return cached.data;
        }

        // Cache miss - fetch new data
        this.stats.cacheMisses++;
        this.log('detailed', 'Cache MISS', { key, reason: cached ? 'expired' : 'not found' });

        try {
            const data = await fetchFn();

            // Determine TTL
            const ttl = customTTL ||
                (cacheType ? this.ttlStrategies[cacheType] : undefined) ||
                this.config.defaultTTL;

            // Store in cache
            this.set(key, data, ttl);

            const duration = performance.now() - startTime;
            this.log('detailed', 'Cache STORE', {
                key,
                ttl: `${ttl / 1000}s`,
                duration: `${duration.toFixed(2)}ms`
            });

            this.updateStats();
            return data;

        } catch (error) {
            // On error, return stale data if available
            if (cached) {
                this.log('basic', 'Returning stale data due to fetch error', { key, error: (error as Error).message });
                cached.hits++;
                this.accessOrder.set(key, this.requestCounter);
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Manually set cache entry
     */
    set<T>(key: string, data: T, ttl?: number): void {
        // Ensure we don't exceed max size
        if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            hits: 0
        };

        this.cache.set(key, entry);
        this.accessOrder.set(key, this.requestCounter);

        this.log('detailed', 'Cache SET', {
            key,
            ttl: `${entry.ttl / 1000}s`,
            size: this.cache.size
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        const cached = this.cache.get(key);
        if (!cached) return false;

        const isExpired = (cached.timestamp + cached.ttl) <= Date.now();
        if (isExpired) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Delete specific key
     */
    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        this.accessOrder.delete(key);
        return deleted;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder.clear();
        this.log('basic', 'Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Get detailed cache information
     */
    getInfo(): any {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            age: now - entry.timestamp,
            ttl: entry.ttl,
            hits: entry.hits,
            expired: (entry.timestamp + entry.ttl) <= now
        }));

        return {
            config: this.config,
            stats: this.stats,
            entries,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Generate cache key for DockerHub operations
     */
    static generateKey(operation: string, params: Record<string, any>): string {
        // Sort parameters for consistent key generation
        const sortedParams = Object.keys(params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = params[key];
                return obj;
            }, {} as Record<string, any>);

        return `${operation}:${JSON.stringify(sortedParams)}`;
    }

    /**
     * Invalidate cache entries matching pattern
     */
    invalidatePattern(pattern: string | RegExp): number {
        let invalidated = 0;
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                invalidated++;
            }
        }

        this.log('basic', 'Pattern invalidation', { pattern: pattern.toString(), invalidated });
        return invalidated;
    }

    /**
     * Preload cache with common data
     */
    async preload(preloadFunctions: Array<{
        key: string,
        fn: () => Promise<any>,
        type: keyof SmartCache['ttlStrategies']
    }>): Promise<void> {
        this.log('basic', 'Starting cache preload', { functions: preloadFunctions.length });

        const results = await Promise.allSettled(
            preloadFunctions.map(async ({ key, fn, type }) => {
                try {
                    const data = await fn();
                    this.set(key, data, this.ttlStrategies[type]);
                    return { key, success: true };
                } catch (error) {
                    this.log('basic', 'Preload failed', { key, error: (error as Error).message });
                    return { key, success: false, error };
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        this.log('basic', 'Cache preload completed', { successful, total: preloadFunctions.length });
    }

    private evictLRU(): void {
        // Find least recently used entry
        let oldestKey = '';
        let oldestAccess = Infinity;

        for (const [key, accessTime] of this.accessOrder.entries()) {
            if (accessTime < oldestAccess) {
                oldestAccess = accessTime;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.accessOrder.delete(oldestKey);
            this.log('detailed', 'LRU eviction', { key: oldestKey });
        }
    }

    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if ((entry.timestamp + entry.ttl) <= now) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.log('detailed', 'Cleanup completed', { cleaned, remaining: this.cache.size });
        }
    }

    private updateStats(): void {
        this.stats.hitRate = this.stats.totalRequests > 0
            ? (this.stats.cacheHits / this.stats.totalRequests) * 100
            : 0;
        this.stats.entries = this.cache.size;
        this.stats.memoryUsage = this.estimateMemoryUsage();
    }

    private estimateMemoryUsage(): number {
        // Rough estimation of memory usage in bytes
        let size = 0;
        for (const [key, entry] of this.cache.entries()) {
            size += key.length * 2; // UTF-16 characters
            size += JSON.stringify(entry.data).length * 2;
            size += 64; // Approximate overhead per entry
        }
        return size;
    }

    private log(level: 'none' | 'basic' | 'detailed', message: string, data?: any): void {
        if (this.config.logLevel === 'none') return;
        if (level === 'detailed' && this.config.logLevel === 'basic') return;

        const timestamp = new Date().toISOString();
        if (data) {
            console.log(`[${timestamp}] SmartCache: ${message}`, data);
        } else {
            console.log(`[${timestamp}] SmartCache: ${message}`);
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
        this.log('basic', 'SmartCache destroyed');
    }
}

// Singleton instance for application-wide use
export const globalCache = new SmartCache({
    maxSize: 2000,
    defaultTTL: 1800000, // 30 minutes
    cleanupInterval: 300000, // 5 minutes
    enableStats: true,
    logLevel: process.env.CACHE_LOG_LEVEL as any || 'basic'
});
