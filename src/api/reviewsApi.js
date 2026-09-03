import { apiClient } from './apiClient';

export const reviewsApi = {
  async getRestaurantReviews(restaurantId) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/reviews`);
    return res.data || res;
  },

  async createReview(data) {
    const res = await apiClient.post('/api/reviews', data);
    return res.data || res;
  },
};
