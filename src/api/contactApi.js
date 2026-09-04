import { apiClient } from './apiClient';

export const contactApi = {
  async submitForm(data) {
    const res = await apiClient.post('/api/contact', data);
    return res.data || res;
  },
};
