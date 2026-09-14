import { apiClient } from './apiClient';

export const deliveryApi = {
  async getDeliverySettings(restaurantId) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/delivery-settings`);
    return res.data || res;
  },

  async updateDeliverySettings(restaurantId, data) {
    const res = await apiClient.patch(`/api/restaurants/${restaurantId}/delivery-settings`, data);
    return res.data || res;
  },

  async initiateWoltConnect(restaurantId) {
    const res = await apiClient.post(`/api/restaurants/${restaurantId}/wolt/connect`);
    return res.data || res;
  },

  async disconnectWolt(restaurantId) {
    const res = await apiClient.post(`/api/restaurants/${restaurantId}/wolt/disconnect`);
    return res.data || res;
  },

  async getCheckoutDeliveryQuote(restaurantId, dropoffAddress, orderSubtotal) {
    const res = await apiClient.post('/api/delivery/quote', {
      restaurantId,
      dropoffAddress,
      orderSubtotal: Math.round(orderSubtotal * 100), // convert euros to cents
    });
    return res.data || res;
  },

  async dispatchDelivery(orderId) {
    const res = await apiClient.post(`/api/orders/${orderId}/delivery/dispatch`);
    return res.data || res;
  },

  async cancelDelivery(orderId, reason) {
    const res = await apiClient.post(`/api/orders/${orderId}/delivery/cancel`, { reason });
    return res.data || res;
  },

  async getOrderDelivery(orderId) {
    const res = await apiClient.get(`/api/orders/${orderId}/delivery`);
    return res.data || res;
  },

  async getSuperAdminDeliveryOverview() {
    const res = await apiClient.get('/api/admin/delivery/overview');
    return res.data || res;
  },
};
