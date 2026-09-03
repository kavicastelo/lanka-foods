import { apiClient } from './apiClient';

export const favoritesApi = {
  async getFavorites() {
    const res = await apiClient.get('/api/favorites');
    return res.data || res;
  },

  async addFavorite(itemType, itemId) {
    const endpoint = itemType === 'RESTAURANT' || itemType === 'restaurant'
      ? `/api/favorites/restaurants/${itemId}`
      : `/api/favorites/menu-items/${itemId}`;
    const res = await apiClient.post(endpoint, {});
    return res.data || res;
  },

  async removeFavorite(itemType, itemId) {
    const endpoint = itemType === 'RESTAURANT' || itemType === 'restaurant'
      ? `/api/favorites/restaurants/${itemId}`
      : `/api/favorites/menu-items/${itemId}`;
    const res = await apiClient.delete(endpoint);
    return res.data || res;
  },
};
