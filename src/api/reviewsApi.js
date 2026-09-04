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

  async getMyReviews() {
    const res = await apiClient.get('/api/reviews/my-reviews');
    const data = res.data || res;
    return data.data || data.reviews || (Array.isArray(data) ? data : []);
  },

  async getAllReviews() {
    const res = await apiClient.get('/api/admin/reviews');
    const data = res.data || res;
    return data.reviews || (Array.isArray(data) ? data : []);
  },

  async deleteReview(id) {
    const res = await apiClient.delete(`/api/admin/reviews/${id}`);
    return res.data || res;
  },
};
