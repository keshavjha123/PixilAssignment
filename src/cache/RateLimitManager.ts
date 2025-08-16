/**
 * Enhanced Rate Limiting Manager with intelligent request queuing
 * Implements DockerHub-specific rate limiting strategies
 */

export interface RateLimitConfig {
    maxRequestsPerHour: number;
    maxConcurrentRequests: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
    queueMaxSize: number;
    monitoringEnabled: boolean;
}

export interface RateLimitStats {
    requestsThisHour: number;
    requestsQueued: number;
    requestsCompleted: number;
    requestsFailed: number;
    averageResponseTime: number;
    currentBackoffMs: number;
    hourlyQuotaUsed: number;
}

interface QueuedRequest {
    id: string;
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: number;
    retryCount: number;
}

/**
 * Smart Rate Limiting Manager for DockerHub API
 */
export class RateLimitManager {
    private config: RateLimitConfig;
    private requestQueue: QueuedRequest[] = [];
    private activeRequests = 0;
    private requestTimestamps: number[] = [];
    private stats: RateLimitStats;
    private currentBackoffMs = 0;
    private processing = false;

    // DockerHub specific rate limits
    private static readonly DOCKERHUB_LIMITS = {
        anonymous: {
            requestsPerHour: 100,
            requestsPer6Hours: 100
        },
        authenticated: {
            requestsPerHour: 200,
            requestsPer6Hours: 200
        }
    };

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = {
            maxRequestsPerHour: 180, // Conservative limit for authenticated users
            maxConcurrentRequests: 5,
            backoffMultiplier: 2,
            maxBackoffMs: 30000, // 30 seconds max backoff
            queueMaxSize: 100,
            monitoringEnabled: true,
            ...config
        };

        this.stats = {
            requestsThisHour: 0,
            requestsQueued: 0,
            requestsCompleted: 0,
            requestsFailed: 0,
            averageResponseTime: 0,
            currentBackoffMs: 0,
            hourlyQuotaUsed: 0
        };

        this.startProcessing();
        this.startCleanupTimer();
    }

    /**
     * Execute a request with rate limiting and intelligent queuing
     */
    async executeRequest<T>(
        operation: () => Promise<T>,
        operationId: string = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    ): Promise<T> {
        // Check if we can execute immediately
        if (this.canExecuteImmediately()) {
            try {
                return await this.executeWithMonitoring(operation);
            } catch (error) {
                if (this.isRateLimitError(error)) {
                    // If rate limited, queue the request
                    return this.queueRequest(operation, operationId);
                }
                throw error;
            }
        }

        // Queue the request
        return this.queueRequest(operation, operationId);
    }

    /**
     * Get current rate limit statistics
     */
    getStats(): RateLimitStats {
        this.updateStats();
        return { ...this.stats };
    }

    /**
     * Get rate limit health status
     */
    getHealthStatus(): {
        status: 'healthy' | 'throttled' | 'overloaded';
        message: string;
        recommendations: string[];
    } {
        const quotaUsed = this.getHourlyQuotaUsage();
        const queueSize = this.requestQueue.length;

        if (quotaUsed > 90) {
            return {
                status: 'overloaded',
                message: 'Rate limit quota nearly exhausted',
                recommendations: [
                    'Consider implementing caching',
                    'Reduce request frequency',
                    'Use authenticated requests if possible'
                ]
            };
        }

        if (quotaUsed > 70 || queueSize > 10) {
            return {
                status: 'throttled',
                message: 'Rate limiting is actively managing request flow',
                recommendations: [
                    'Requests may experience delays',
                    'Consider enabling caching for better performance'
                ]
            };
        }

        return {
            status: 'healthy',
            message: 'Rate limiting is operating normally',
            recommendations: []
        };
    }

    /**
     * Manually adjust rate limits based on authentication status
     */
    updateLimits(isAuthenticated: boolean): void {
        const limits = isAuthenticated
            ? RateLimitManager.DOCKERHUB_LIMITS.authenticated
            : RateLimitManager.DOCKERHUB_LIMITS.anonymous;

        this.config.maxRequestsPerHour = limits.requestsPerHour * 0.9; // 90% of limit for safety

        this.log(`Rate limits updated for ${isAuthenticated ? 'authenticated' : 'anonymous'} user: ${this.config.maxRequestsPerHour}/hour`);
    }

    private async queueRequest<T>(operation: () => Promise<T>, operationId: string): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.requestQueue.length >= this.config.queueMaxSize) {
                reject(new Error('Request queue is full. Please try again later.'));
                return;
            }

            const request: QueuedRequest = {
                id: operationId,
                operation,
                resolve,
                reject,
                timestamp: Date.now(),
                retryCount: 0
            };

            this.requestQueue.push(request);
            this.stats.requestsQueued++;

            this.log(`Request queued: ${operationId} (Queue size: ${this.requestQueue.length})`);
        });
    }

    private canExecuteImmediately(): boolean {
        return (
            this.activeRequests < this.config.maxConcurrentRequests &&
            this.getHourlyQuotaUsage() < 95 &&
            this.currentBackoffMs === 0 &&
            this.requestQueue.length === 0
        );
    }

    private async executeWithMonitoring<T>(operation: () => Promise<T>): Promise<T> {
        const startTime = Date.now();
        this.activeRequests++;
        this.requestTimestamps.push(startTime);

        try {
            const result = await operation();

            const duration = Date.now() - startTime;
            this.updateResponseTime(duration);
            this.stats.requestsCompleted++;

            // Reset backoff on successful request
            this.currentBackoffMs = 0;

            this.log(`Request completed successfully in ${duration}ms`);
            return result;

        } catch (error) {
            this.stats.requestsFailed++;

            if (this.isRateLimitError(error)) {
                this.handleRateLimit();
            }

            throw error;
        } finally {
            this.activeRequests--;
        }
    }

    private isRateLimitError(error: any): boolean {
        return (
            error?.response?.status === 429 ||
            error?.code === 'RATE_LIMITED' ||
            (error?.message && error.message.toLowerCase().includes('rate limit'))
        );
    }

    private handleRateLimit(): void {
        this.currentBackoffMs = Math.min(
            this.currentBackoffMs === 0 ? 1000 : this.currentBackoffMs * this.config.backoffMultiplier,
            this.config.maxBackoffMs
        );

        this.stats.currentBackoffMs = this.currentBackoffMs;
        this.log(`Rate limit hit. Backing off for ${this.currentBackoffMs}ms`);

        // Clear backoff after the timeout
        setTimeout(() => {
            this.currentBackoffMs = 0;
            this.stats.currentBackoffMs = 0;
        }, this.currentBackoffMs);
    }

    private startProcessing(): void {
        if (this.processing) return;
        this.processing = true;

        const processQueue = async () => {
            while (this.requestQueue.length > 0 && this.canExecuteImmediately()) {
                const request = this.requestQueue.shift();
                if (!request) continue;

                try {
                    const result = await this.executeWithMonitoring(request.operation);
                    request.resolve(result);
                } catch (error) {
                    // Retry logic for certain errors
                    if (this.shouldRetry(error, request)) {
                        request.retryCount++;
                        this.requestQueue.unshift(request); // Put back at front
                        await this.delay(1000 * request.retryCount); // Progressive delay
                    } else {
                        request.reject(error);
                    }
                }
            }

            // Continue processing
            setTimeout(processQueue, 100);
        };

        processQueue();
    }

    private shouldRetry(error: any, request: QueuedRequest): boolean {
        return (
            request.retryCount < 3 &&
            (this.isRateLimitError(error) || error?.code === 'NETWORK_ERROR') &&
            (Date.now() - request.timestamp) < 60000 // Don't retry requests older than 1 minute
        );
    }

    private getHourlyQuotaUsage(): number {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const recentRequests = this.requestTimestamps.filter(timestamp => timestamp > oneHourAgo);
        return (recentRequests.length / this.config.maxRequestsPerHour) * 100;
    }

    private updateStats(): void {
        this.stats.requestsThisHour = this.getHourlyRequestCount();
        this.stats.hourlyQuotaUsed = this.getHourlyQuotaUsage();
        this.stats.requestsQueued = this.requestQueue.length;
    }

    private getHourlyRequestCount(): number {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return this.requestTimestamps.filter(timestamp => timestamp > oneHourAgo).length;
    }

    private updateResponseTime(duration: number): void {
        const totalRequests = this.stats.requestsCompleted;
        this.stats.averageResponseTime =
            (this.stats.averageResponseTime * (totalRequests - 1) + duration) / totalRequests;
    }

    private startCleanupTimer(): void {
        setInterval(() => {
            // Clean old timestamps
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneHourAgo);

            // Clean old queued requests
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            this.requestQueue = this.requestQueue.filter(request => request.timestamp > tenMinutesAgo);

        }, 5 * 60 * 1000); // Cleanup every 5 minutes
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private log(message: string): void {
        if (this.config.monitoringEnabled) {
            console.log(`[RateLimitManager] ${new Date().toISOString()} - ${message}`);
        }
    }
}

// Global rate limit manager instance
export const globalRateLimiter = new RateLimitManager({
    maxRequestsPerHour: 180,
    maxConcurrentRequests: 5,
    monitoringEnabled: process.env.NODE_ENV !== 'production'
});
