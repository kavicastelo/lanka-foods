import { apiClient, tokenStorage } from './apiClient';

export const authApi = {
  async register(data) {
    const res = await apiClient.post('/api/auth/register', data);
    const result = /** @type {any} */ (res);
    if (result.token) {
      tokenStorage.setToken(result.token);
    }
    return res;
  },

  async login(email, password) {
    const res = await apiClient.post('/api/auth/login', { email, password });
    const result = /** @type {any} */ (res);
    if (result.token) {
      tokenStorage.setToken(result.token);
    }
    return res;
  },

  async getMe() {
    return await apiClient.get('/api/auth/me');
  },

  async updateMe(data) {
    return await apiClient.patch('/api/auth/me', data);
  },

  async changePassword(currentPassword, newPassword) {
    return await apiClient.post('/api/auth/change-password', { currentPassword, newPassword });
  },

  logout() {
    tokenStorage.removeToken();
  },
};
