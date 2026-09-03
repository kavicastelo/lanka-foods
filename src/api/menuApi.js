import { apiClient } from './apiClient';

export const menuApi = {
  async getMenuItems(restaurantId, params = {}) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/menu-items`, { params });
    return res.data || res;
  },

  async getMenuItemById(id) {
    const res = await apiClient.get(`/api/menu-items/${id}`);
    return res.data || res;
  },

  async createMenuItem(restaurantId, data) {
    const res = await apiClient.post(`/api/restaurants/${restaurantId}/menu-items`, data);
    return res.data || res;
  },

  async updateMenuItem(id, data) {
    const res = await apiClient.patch(`/api/menu-items/${id}`, data);
    return res.data || res;
  },

  async deleteMenuItem(id) {
    const res = await apiClient.delete(`/api/menu-items/${id}`);
    return res.data || res;
  },
};
