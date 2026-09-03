import { apiClient } from './apiClient';

export const dashboardApi = {
  async getDashboardMetrics(scope = 'admin', restaurantId = null) {
    const params = { scope };
    if (restaurantId) params.restaurantId = restaurantId;
    const res = await apiClient.get('/api/dashboard/metrics', { params });
    return res.data || res;
  },

  async getAdminDashboardMetrics() {
    const res = await apiClient.get('/api/admin/dashboard/metrics');
    return res.data || res;
  },

  async getRestaurantDashboardMetrics(restaurantId) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/dashboard/metrics`);
    return res.data || res;
  },
};
