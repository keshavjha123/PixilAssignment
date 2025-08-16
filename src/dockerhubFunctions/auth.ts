
import axios from 'axios';

interface AuthTokenResponse {
  token: string;
  access_token?: string;
  expires_in?: number;
}

/**
 * Exchange personal access token for a proper bearer token
 */
export async function getDockerHubBearerToken(
  personalAccessToken: string,
  scope: string = 'repository:*:*'
): Promise<string | null> {
  const authUrl = 'https://auth.docker.io/token';
  const params = {
    service: 'registry.docker.io',
    scope: scope
  };

  try {
    // For personal access tokens, use the token directly as password with empty username
    const response = await axios.get(authUrl, {
      params,
      auth: {
        username: process.env.DOCKERHUB_USERNAME || '',
        password: personalAccessToken
      }
    });

    const data: AuthTokenResponse = response.data;
    return data.token || data.access_token || null;
  } catch (error) {
    // Try alternative authentication method for personal access tokens
    try {
      const response = await axios.get(authUrl, {
        params,
        headers: {
          'Authorization': `Bearer ${personalAccessToken}`
        }
      });

      const data: AuthTokenResponse = response.data;
      return data.token || data.access_token || null;
    } catch (secondError) {
      return null;
    }
  }
}

/**
 * Get bearer token for Docker Hub API v2 endpoints
 */
// export async function getDockerHubAPIToken(
//   personalAccessToken: string
// ): Promise<string | null> {
//   try {
//     // For Docker Hub API v2, use the login endpoint
//     const response = await axios.post('https://hub.docker.com/v2/users/login/', {
//       username: process.env.DOCKERHUB_USERNAME || '',
//       password: personalAccessToken
//     }, {
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     return response.data.token || null;
//   } catch {
//     // If login fails, try using the personal access token directly
//     // Some endpoints may accept it with Basic auth
//     return personalAccessToken;
//   }
// }




// Updated auth.ts to handle PAT properly
export async function getDockerHubAPIToken(personalAccessToken: string): Promise<string> {
    try {
        const response = await axios.post('https://hub.docker.com/v2/users/login/', {
            username: process.env.DOCKERHUB_USERNAME || '',
            password: personalAccessToken // Use PAT as password
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return response.data.token;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Authentication failed: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
        }
        throw error;
    }
}

/**
 * Create appropriate headers for Docker Hub API calls
 */
export function createAuthHeaders(token: string, useBearer: boolean = true): Record<string, string> {
  if (useBearer) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } else {
    // Use JWT format for Docker Hub API v2 (this is the correct format!)
    return {
      'Authorization': `JWT ${token}`,
      'Content-Type': 'application/json'
    };
  }
}
