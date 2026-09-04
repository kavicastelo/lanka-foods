import type { ICommissionConfig } from '../../models/commission-config.model.js';
import type { IFinancialRecord } from '../../models/financial-record.model.js';

export interface CommissionConfigDto {
  key: string;
  defaultRate: number;
  serviceFee: number; // in cents, e.g. 99
  serviceFeeFormatted: number; // in euros, e.g. 0.99
  updatedBy?: string;
  updatedDate: string;
}

export interface FinancialRecordResponseDto {
  id: string;
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string;
  orderSubtotal: number;
  deliveryFee: number;
  serviceFee: number;
  orderTotal: number;
  commissionableAmount: number;
  commissionRate: number;
  commissionAmount: number;
  platformFeeTotal: number;
  restaurantNetAmount: number;
  status: string;
  settledAt?: string;
  settledBy?: string;
  createdAt: string;
}

export function toCommissionConfigDto(config: Partial<ICommissionConfig>): CommissionConfigDto {
  const serviceFeeCents = config.serviceFee ?? 99;
  return {
    key: config.key || 'default_config',
    defaultRate: config.defaultRate ?? 10,
    serviceFee: serviceFeeCents,
    serviceFeeFormatted: serviceFeeCents / 100,
    updatedBy: config.updatedBy ? config.updatedBy.toString() : undefined,
    updatedDate: config.updatedDate ? new Date(config.updatedDate).toISOString() : new Date().toISOString(),
  };
}

export function toFinancialRecordResponseDto(
  record: Partial<IFinancialRecord> & { _id: unknown }
): FinancialRecordResponseDto {
  const serviceFee = record.serviceFee ?? 0;
  const commissionAmount = record.commissionAmount ?? 0;
  const platformFeeTotal = record.platformFeeTotal ?? (commissionAmount + serviceFee);

  return {
    id: record._id ? record._id.toString() : '',
    orderId: record.orderId ? record.orderId.toString() : '',
    orderNumber: record.orderNumber || '',
    restaurantId: record.restaurantId ? record.restaurantId.toString() : '',
    customerId: record.customerId ? record.customerId.toString() : '',
    orderSubtotal: record.orderSubtotal ?? 0,
    deliveryFee: record.deliveryFee ?? 0,
    serviceFee,
    orderTotal: record.orderTotal ?? 0,
    commissionableAmount: record.commissionableAmount ?? 0,
    commissionRate: record.commissionRate ?? 0,
    commissionAmount,
    platformFeeTotal,
    restaurantNetAmount: record.restaurantNetAmount ?? 0,
    status: record.status || 'PENDING',
    settledAt: record.settledAt ? new Date(record.settledAt).toISOString() : undefined,
    settledBy: record.settledBy ? record.settledBy.toString() : undefined,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
  };
}
