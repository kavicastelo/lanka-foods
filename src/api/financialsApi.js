import { apiClient } from './apiClient';

export const financialsApi = {
  async getCommissionConfig() {
    const res = await apiClient.get('/api/admin/commission-config');
    const data = res.config || res.data || res;
    const rawServiceFee = data.serviceFeeFormatted ?? data.serviceFee ?? 99;
    const serviceFee = typeof rawServiceFee === "number" && rawServiceFee >= 50 ? rawServiceFee / 100 : rawServiceFee;
    return {
      ...data,
      serviceFee,
      defaultRate: data.defaultRate ?? 10,
      default_rate: data.defaultRate ?? 10,
    };
  },

  async updateCommissionConfig(defaultCommissionRate, overrides = [], serviceFee) {
    const payload = {};
    if (defaultCommissionRate !== undefined) payload.defaultRate = defaultCommissionRate;
    if (serviceFee !== undefined) payload.serviceFee = typeof serviceFee === "number" ? Math.round(serviceFee * 100) : 99;
    const res = await apiClient.post('/api/admin/commission-config', payload);
    return res.data || res;
  },

  async getFinancialRecords(params = {}) {
    const res = await apiClient.get('/api/admin/financial-records', { params });
    const data = res.data || res;
    const list = Array.isArray(data) ? data : (data.data || []);
    const parseCents = (val) => (typeof val === "number" ? val / 100 : 0);
    const records = list.map((r) => ({
      ...r,
      orderSubtotal: parseCents(r.orderSubtotal),
      deliveryFee: parseCents(r.deliveryFee),
      serviceFee: parseCents(r.serviceFee),
      orderTotal: parseCents(r.orderTotal),
      commissionableAmount: parseCents(r.commissionableAmount),
      commissionAmount: parseCents(r.commissionAmount),
      platformFeeTotal: parseCents(r.platformFeeTotal ?? ((r.commissionAmount || 0) + (r.serviceFee || 0))),
      restaurantNetAmount: parseCents(r.restaurantNetAmount),
    }));
    return {
      data: records,
      pagination: data.pagination || {},
    };
  },

  async settleFinancialRecord(id, notes = '') {
    const res = await apiClient.post(`/api/admin/financial-records/${id}/settle`, { notes });
    return res.data || res;
  },

  async getRestaurantFinancials(restaurantId, params = {}) {
    const res = await apiClient.get(`/api/restaurants/${restaurantId}/financials`, { params });
    const data = res.data || res;
    const summary = data.summary || {};
    const parseCents = (val) => (typeof val === "number" ? val / 100 : 0);
    return {
      records: (data.records || []).map((r) => ({
        ...r,
        orderSubtotal: parseCents(r.orderSubtotal),
        deliveryFee: parseCents(r.deliveryFee),
        serviceFee: parseCents(r.serviceFee),
        orderTotal: parseCents(r.orderTotal),
        commissionableAmount: parseCents(r.commissionableAmount),
        commissionAmount: parseCents(r.commissionAmount),
        platformFeeTotal: parseCents(r.platformFeeTotal ?? ((r.commissionAmount || 0) + (r.serviceFee || 0))),
        restaurantNetAmount: parseCents(r.restaurantNetAmount),
      })),
      summary: {
        totalGross: parseCents(summary.totalGross),
        totalCommission: parseCents(summary.totalCommission),
        pendingCommission: parseCents(summary.pendingCommission),
        settledCommission: parseCents(summary.settledCommission),
        totalNet: parseCents(summary.totalNet),
        pendingCount: summary.pendingCount || 0,
        settledCount: summary.settledCount || 0,
      },
    };
  },
};
