import { apiClient } from './apiClient';

export const notificationsApi = {
  async getNotifications(params = {}) {
    const res = await apiClient.get('/api/notifications', { params });
    return res.data || res;
  },

  async markAsRead(id) {
    const res = await apiClient.patch(`/api/notifications/${id}/read`);
    return res.data || res;
  },

  async markAllAsRead() {
    const res = await apiClient.patch('/api/notifications/read-all');
    return res.data || res;
  },

  async subscribePush(data) {
    const res = await apiClient.post('/api/notifications/push-subscribe', data);
    return res.data || res;
  },
};
