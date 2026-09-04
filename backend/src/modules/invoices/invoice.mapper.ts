import type { IInvoice } from '../../models/invoice.model.js';
import { centsToEurosFormatted } from '../../utils/money.js';

export interface InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  restaurantId: string;
  restaurantName: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossSales: number; // in cents
  grossSalesFormatted: string;
  totalCommission: number; // in cents
  totalCommissionFormatted: string;
  totalServiceFee: number; // in cents
  totalServiceFeeFormatted: string;
  subscriptionFee: number; // in cents
  subscriptionFeeFormatted: string;
  totalAmountDue: number; // in cents
  totalAmountDueFormatted: string;
  status: string;
  paymentSlipUrl?: string | null;
  notes?: string;
  issuedAt: string;
  paidAt?: string | null;
  createdAt: string;
}

export function toInvoiceResponseDto(invoice: Partial<IInvoice> & { _id: unknown }): InvoiceResponseDto {
  const grossSales = invoice.grossSales ?? 0;
  const totalCommission = invoice.totalCommission ?? 0;
  const totalServiceFee = invoice.totalServiceFee ?? 0;
  const subscriptionFee = invoice.subscriptionFee ?? 0;
  const totalAmountDue = invoice.totalAmountDue ?? 0;

  return {
    id: invoice._id ? invoice._id.toString() : '',
    invoiceNumber: invoice.invoiceNumber || '',
    restaurantId: invoice.restaurantId ? invoice.restaurantId.toString() : '',
    restaurantName: invoice.restaurantName || 'Restaurant',
    periodStart: invoice.periodStart ? new Date(invoice.periodStart).toISOString().slice(0, 10) : '',
    periodEnd: invoice.periodEnd ? new Date(invoice.periodEnd).toISOString().slice(0, 10) : '',
    orderCount: invoice.orderCount ?? 0,
    grossSales,
    grossSalesFormatted: centsToEurosFormatted(grossSales),
    totalCommission,
    totalCommissionFormatted: centsToEurosFormatted(totalCommission),
    totalServiceFee,
    totalServiceFeeFormatted: centsToEurosFormatted(totalServiceFee),
    subscriptionFee,
    subscriptionFeeFormatted: centsToEurosFormatted(subscriptionFee),
    totalAmountDue,
    totalAmountDueFormatted: centsToEurosFormatted(totalAmountDue),
    status: invoice.status || 'ISSUED',
    paymentSlipUrl: invoice.paymentSlipUrl || null,
    notes: invoice.notes || '',
    issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date().toISOString(),
    paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString() : null,
    createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString() : new Date().toISOString(),
  };
}
