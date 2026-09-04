import { apiClient } from './apiClient';

export const categoriesApi = {
  async getCategories() {
    const res = /** @type {any} */ (await apiClient.get('/api/categories'));
    const data = res.data || res;
    return data.categories || (Array.isArray(data) ? data : []);
  },

  async getCategoryById(id) {
    const res = await apiClient.get(`/api/categories/${id}`);
    return res.data || res;
  },
};
