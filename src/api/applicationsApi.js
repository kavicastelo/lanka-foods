import { apiClient } from './apiClient';

export const applicationsApi = {
  async apply(data) {
    const res = await apiClient.post('/api/partner/apply', data);
    return res.data || res;
  },

  async getMyApplication() {
    const res = await apiClient.get('/api/partner/my-application');
    return res.data || res;
  },

  async getApplications(params = {}) {
    const res = await apiClient.get('/api/admin/applications', { params });
    return res.data || res;
  },

  async approveApplication(id) {
    const res = await apiClient.post(`/api/admin/applications/${id}/approve`);
    return res.data || res;
  },

  async rejectApplication(id, rejectionReason = '') {
    const res = await apiClient.post(`/api/admin/applications/${id}/reject`, { rejectionReason });
    return res.data || res;
  },
};
