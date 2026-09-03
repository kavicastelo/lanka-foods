import { apiClient } from './apiClient';

export const restaurantsApi = {
  async getRestaurants(params = {}) {
    const res = await apiClient.get('/api/restaurants', { params });
    return res.data || res;
  },

  async getRestaurantById(id) {
    const res = await apiClient.get(`/api/restaurants/${id}`);
    return res.data || res;
  },

  async getRestaurantBySlug(slug) {
    const res = await apiClient.get(`/api/restaurants/slug/${slug}`);
    return res.data || res;
  },

  async getAdminRestaurants(params = {}) {
    const res = await apiClient.get('/api/admin/restaurants', { params });
    return res.data || res;
  },

  async updateRestaurant(id, data) {
    const res = await apiClient.patch(`/api/restaurants/${id}`, data);
    return res.data || res;
  },
};
