import { apiClient } from './apiClient';

export const restaurantsApi = {
  async getRestaurants(params = {}) {
    const res = await apiClient.get('/api/restaurants', { params });
    return res.data || res;
  },

  async getRestaurantBySlug(slug) {
    const res = /** @type {any} */ (await apiClient.get(`/api/restaurants/${slug}`));
    return res.restaurant || res.data?.restaurant || res;
  },

  async getRestaurantById(id) {
    const res = /** @type {any} */ (await apiClient.get(`/api/restaurants/${id}`));
    return res.restaurant || res.data?.restaurant || res;
  },

  async getMyRestaurant() {
    const res = /** @type {any} */ (await apiClient.get('/api/restaurant/me'));
    return res.restaurant || res.data?.restaurant || res;
  },

  async updateMySettings(data) {
    const res = /** @type {any} */ (await apiClient.patch('/api/restaurant/settings', data));
    return res.restaurant || res.data?.restaurant || res;
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
