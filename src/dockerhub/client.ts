import axios, { AxiosInstance } from 'axios';

export interface DockerHubClientOptions {
    username?: string;
    password?: string;
    token?: string;
}

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
        this.axios.defaults.headers.common['Authorization'] = `JWT ${token}`;
    }

    async searchImages(query: string, page = 1, pageSize = 25) {
        const resp = await this.axios.get('/search/repositories', {
            params: { query, page, page_size: pageSize },
        });
        return resp.data;
    }

    async getImageDetails(namespace: string, repository: string) {
        const resp = await this.axios.get(`/repositories/${namespace}/${repository}`);
        return resp.data;
    }

    // Add more methods as needed for tags, manifests, etc.
}
