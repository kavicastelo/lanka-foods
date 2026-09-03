import { apiClient } from './apiClient';

export const categoriesApi = {
  async getCategories() {
    const res = await apiClient.get('/api/categories');
    return res.data || res;
  },

  async getCategoryById(id) {
    const res = await apiClient.get(`/api/categories/${id}`);
    return res.data || res;
  },
};
