import { apiClient } from './apiClient';

export const financialsApi = {
  async getCommissionConfig() {
    const res = await apiClient.get('/api/admin/commission-config');
    return res.config || res.data || res;
  },

  async updateCommissionConfig(defaultCommissionRate, overrides = []) {
    const res = await apiClient.post('/api/admin/commission-config', {
      defaultCommissionRate,
      overrides,
    });
    return res.data || res;
  },

  async getFinancialRecords(params = {}) {
    const res = await apiClient.get('/api/admin/financial-records', { params });
    return res.data || res;
  },

  async settleFinancialRecord(id, notes = '') {
    const res = await apiClient.post(`/api/admin/financial-records/${id}/settle`, { notes });
    return res.data || res;
  },

  async getRestaurantFinancials(restaurantId, params = {}) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/financials`, { params });
    return res.data || res;
  },
};
