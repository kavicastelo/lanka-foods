import { apiClient } from './apiClient';

export const menuApi = {
  // Public restaurant menu catalog
  async getPublicMenuBySlug(slug) {
    const res = await apiClient.get(`/api/restaurants/${slug}/menu`);
    return res.data || res;
  },

  // Owner Menu Categories
  async getOwnerMenuCategories() {
    const res = /** @type {any} */ (await apiClient.get('/api/restaurant/menu-categories'));
    return res.categories || res.data?.categories || res;
  },

  async createMenuCategory(data) {
    const res = /** @type {any} */ (await apiClient.post('/api/restaurant/menu-categories', data));
    return res.category || res.data?.category || res;
  },

  async updateMenuCategory(id, data) {
    const res = /** @type {any} */ (await apiClient.patch(`/api/restaurant/menu-categories/${id}`, data));
    return res.category || res.data?.category || res;
  },

  async deleteMenuCategory(id) {
    const res = /** @type {any} */ (await apiClient.delete(`/api/restaurant/menu-categories/${id}`));
    return res.data || res;
  },

  // Owner Menu Items
  async getOwnerMenuItems() {
    const res = /** @type {any} */ (await apiClient.get('/api/restaurant/menu-items'));
    return res.items || res.data?.items || res;
  },

  async createMenuItem(data) {
    const res = /** @type {any} */ (await apiClient.post('/api/restaurant/menu-items', data));
    return res.item || res.data?.item || res;
  },

  async updateMenuItem(id, data) {
    const res = /** @type {any} */ (await apiClient.patch(`/api/restaurant/menu-items/${id}`, data));
    return res.item || res.data?.item || res;
  },

  async deleteMenuItem(id) {
    const res = await apiClient.delete(`/api/restaurant/menu-items/${id}`);
    return res.data || res;
  },
};
