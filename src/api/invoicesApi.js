import { apiClient } from './apiClient';

export const invoicesApi = {
  async generateInvoice(data) {
    const res = await apiClient.post('/api/admin/invoices/generate', data);
    return res.data || res;
  },

  async getAdminInvoices(params = {}) {
    const res = await apiClient.get('/api/admin/invoices', { params });
    return res.data || res;
  },

  async getRestaurantInvoices(params = {}) {
    const res = await apiClient.get('/api/restaurant/invoices', { params });
    return res.data || res;
  },

  async getInvoiceById(id) {
    const res = await apiClient.get(`/api/invoices/${id}`);
    return res.data || res;
  },

  async uploadPaymentSlip(id, paymentSlipUrl) {
    const res = await apiClient.post(`/api/invoices/${id}/payment-slip`, { paymentSlipUrl });
    return res.data || res;
  },

  async markInvoicePaid(id) {
    const res = await apiClient.patch(`/api/admin/invoices/${id}/settle`);
    return res.data || res;
  },
};
