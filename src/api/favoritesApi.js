import { apiClient } from './apiClient';

export const favoritesApi = {
  async getFavorites() {
    const res = await apiClient.get('/api/favorites');
    return res.data || res;
  },

  async addFavorite(itemType, itemId) {
    const res = await apiClient.post('/api/favorites', { itemType, itemId });
    return res.data || res;
  },

  async removeFavorite(itemType, itemId) {
    const res = await apiClient.delete(`/api/favorites/${itemType}/${itemId}`);
    return res.data || res;
  },
};
