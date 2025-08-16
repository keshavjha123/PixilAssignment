import axios, { AxiosInstance } from 'axios';
import { DockerHubClientOptions } from './types/dockerhub-types';

/**
 * Thin DockerHub client that only handles authentication and basic setup.
 * All API logic is now in separate modular functions.
 */
export class DockerHubClient {
    private axios: AxiosInstance;
    private token?: string;

    constructor(options: DockerHubClientOptions = {}) {
        this.token = options.token;
        this.axios = axios.create({
            baseURL: 'https://hub.docker.com/v2/',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (options.username && options.password) {
            this.login(options.username, options.password);
        } else if (options.token) {
            this.setToken(options.token);
        }
    }

    async login(username: string, password: string) {
        const resp = await this.axios.post('/users/login/', { username, password });
        this.token = resp.data.token;
        if (this.token) {
            this.setToken(this.token);
        }
        return this.token;
    }

    setToken(token: string) {
        this.token = token;
        this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    getToken(): string | undefined {
        return this.token;
    }
}
