import { apiClient } from './apiClient';

export const ordersApi = {
  async createOrder(data) {
    const res = await apiClient.post('/api/orders', data);
    return res.data || res;
  },

  async getOrders(params = {}) {
    const res = await apiClient.get('/api/orders', { params });
    return res.data || res;
  },

  async getOrderById(id) {
    const res = await apiClient.get(`/api/orders/${id}`);
    return res.data || res;
  },

  async updateOrderStatus(id, status, reason = '') {
    const res = await apiClient.patch(`/api/orders/${id}/status`, { status, reason });
    return res.data || res;
  },

  async cancelOrder(id, reason = '') {
    const res = await apiClient.post(`/api/orders/${id}/cancel`, { reason });
    return res.data || res;
  },
};
