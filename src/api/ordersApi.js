import { apiClient } from './apiClient';

export const ordersApi = {
  async createOrder(data) {
    const res = await apiClient.post('/api/orders', data);
    return res.data || res;
  },

  async getMyOrders(params = {}) {
    const res = await apiClient.get('/api/orders/my-orders', { params });
    return res.data || res;
  },

  async getRestaurantOrders(params = {}) {
    const res = await apiClient.get('/api/restaurant/orders', { params });
    return res.data || res;
  },

  async getAdminOrders(params = {}) {
    const res = await apiClient.get('/api/admin/orders', { params });
    return res.data || res;
  },

  async getOrders(params = {}) {
    if (params && params.restaurantId) {
      return this.getRestaurantOrders(params);
    }
    if (params && params.admin) {
      return this.getAdminOrders(params);
    }
    try {
      return await this.getAdminOrders(params);
    } catch (_err) {
      return await this.getMyOrders(params);
    }
  },

  async getOrderById(id) {
    const res = await apiClient.get(`/api/orders/${id}`);
    return res.data || res;
  },

  async updateOrderStatus(id, status) {
    const res = await apiClient.patch(`/api/orders/${id}/status`, { status });
    return res.data || res;
  },
};

