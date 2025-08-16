// Type definitions for DockerHubClient and DockerHub API responses

export interface DockerHubClientOptions {
    username?: string;
    password?: string;
    token?: string;
}

export interface Repository {
    name: string;
    namespace: string;
    description?: string;
    is_private: boolean;
    star_count: number;
    pull_count: number;
    last_updated: string;
    [key: string]: unknown; // Allow additional fields
}

export interface Manifest {
    mediaType?: string;
    manifests?: { platform?: { architecture?: string; os?: string }; digest: string }[];
    layers?: { size?: number }[];
}
