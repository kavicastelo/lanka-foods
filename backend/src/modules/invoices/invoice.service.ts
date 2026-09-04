import mongoose from 'mongoose';
import { NotificationService } from '../notifications/notification.service.js';
import { FinancialRecord } from '../../models/financial-record.model.js';
import { Invoice, type IInvoice } from '../../models/invoice.model.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import type { PaginatedResult } from '../restaurants/restaurant.service.js';
import { toInvoiceResponseDto, type InvoiceResponseDto } from './invoice.mapper.js';
import type { GenerateInvoiceInput, ListInvoicesQueryInput } from './invoice.schemas.ts';

export class InvoiceService {
  /**
   * Generates a single consolidated periodic/monthly invoice for a restaurant (Super Admin only).
   */
  static async generateInvoice(
    _adminUserId: string,
    input: GenerateInvoiceInput
  ): Promise<InvoiceResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(input.restaurantId)) {
      const error = new Error('Invalid restaurant ID') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const restaurant = await Restaurant.findById(input.restaurantId);
    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const start = new Date(input.periodStart);
    if (!isNaN(start.getTime())) {
      start.setUTCHours(0, 0, 0, 0);
    }

    const end = new Date(input.periodEnd);
    if (!isNaN(end.getTime())) {
      end.setUTCHours(23, 59, 59, 999);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      const error = new Error('Invalid date range for billing period.') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // Aggregate PENDING financial records for target restaurant in date range
    const records = await FinancialRecord.find({
      restaurantId: restaurant._id,
      status: 'PENDING',
      createdAt: { $gte: start, $lte: end },
    }).lean();

    let orderCount = 0;
    let grossSales = 0;
    let totalCommission = 0;
    let totalServiceFee = 0;

    if (records.length > 0) {
      orderCount = records.length;
      grossSales = records.reduce((s, r) => s + (r.orderTotal || 0), 0);
      totalCommission = records.reduce((s, r) => s + (r.commissionAmount || 0), 0);
      totalServiceFee = records.reduce((s, r) => s + (r.serviceFee || 0), 0);
    } else {
      // Fallback: Aggregate completed orders in date range directly
      const orders = await Order.find({
        restaurantId: restaurant._id,
        status: 'completed',
        placedAt: { $gte: start, $lte: end },
      }).lean();

      orderCount = orders.length;
      grossSales = orders.reduce((s, o) => s + (o.total || 0), 0);
      const effectiveRate = restaurant.commissionRate ?? 10;
      const subtotalSum = orders.reduce((s, o) => s + (o.subtotal || 0), 0);
      totalCommission = Math.round((subtotalSum * effectiveRate) / 100);
      totalServiceFee = orders.reduce((s, o) => s + (o.serviceFee || 0), 0);
    }

    const subscriptionFeeCents = typeof input.subscriptionFee === 'number'
      ? (Number.isInteger(input.subscriptionFee) && input.subscriptionFee >= 50
        ? input.subscriptionFee
        : Math.round(input.subscriptionFee * 100))
      : 0;

    const totalAmountDue = totalCommission + totalServiceFee + subscriptionFeeCents;

    // Generate unique Invoice Number
    const yearMonthStr = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}`;
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${yearMonthStr}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      periodStart: start,
      periodEnd: end,
      orderCount,
      grossSales,
      totalCommission,
      totalServiceFee,
      subscriptionFee: subscriptionFeeCents,
      totalAmountDue,
      status: 'ISSUED',
      notes: input.notes || '',
      issuedAt: new Date(),
    });

    // Notify Restaurant Admin
    await NotificationService.createNotification({
      restaurantId: restaurant._id,
      role: 'RESTAURANT_ADMIN',
      type: 'INVOICE_ISSUED',
      title: `Commission Invoice Issued #${invoice.invoiceNumber}`,
      message: `A new period invoice #${invoice.invoiceNumber} has been issued for ${restaurant.name}.`,
      link: `/restaurant/dashboard?tab=invoices`,
      metadata: { invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber },
    }).catch(() => {});

    return toInvoiceResponseDto(invoice);
  }

  /**
   * Returns paginated invoice list with filtering.
   */
  static async listInvoices(
    input: ListInvoicesQueryInput
  ): Promise<PaginatedResult<InvoiceResponseDto>> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (input.restaurantId && mongoose.Types.ObjectId.isValid(input.restaurantId)) {
      filter.restaurantId = new mongoose.Types.ObjectId(input.restaurantId);
    }
    if (input.status) {
      filter.status = input.status;
    }

    const [total, documents] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toInvoiceResponseDto(doc as unknown as IInvoice));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single invoice by ID with strict ownership authorization checks.
   */
  static async getInvoiceById(
    actorUserId: string,
    actorRole: string,
    invoiceId: string
  ): Promise<InvoiceResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      const error = new Error('Invalid invoice ID') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) {
      const error = new Error('Invoice not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    if (actorRole === 'RESTAURANT_ADMIN') {
      const ownerRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
      if (!ownerRestaurant || invoice.restaurantId.toString() !== ownerRestaurant._id.toString()) {
        const error = new Error('Invoice not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }
    }

    return toInvoiceResponseDto(invoice as unknown as IInvoice);
  }

  /**
   * Attaches a payment slip image/document URL to an invoice (Restaurant Admin).
   */
  static async uploadPaymentSlip(
    actorUserId: string,
    invoiceId: string,
    paymentSlipUrl: string
  ): Promise<InvoiceResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      const error = new Error('Invalid invoice ID') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      const error = new Error('Invoice not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const ownerRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
    if (!ownerRestaurant || invoice.restaurantId.toString() !== ownerRestaurant._id.toString()) {
      const error = new Error('Unauthorized to modify this invoice.') as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }

    invoice.paymentSlipUrl = paymentSlipUrl;
    await invoice.save();

    // Notify Super Admin
    await NotificationService.createNotification({
      role: 'SUPER_ADMIN',
      type: 'PAYMENT_SLIP_UPLOADED',
      title: 'Payment Slip Uploaded',
      message: `${ownerRestaurant.name} uploaded a payment slip for invoice #${invoice.invoiceNumber}.`,
      link: `/admin/dashboard?tab=invoices`,
      metadata: { invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber },
    }).catch(() => {});

    return toInvoiceResponseDto(invoice);
  }

  /**
   * Confirms payment for an invoice and marks constituent financial records as SETTLED (Super Admin only).
   */
  static async markInvoiceAsPaid(
    adminUserId: string,
    invoiceId: string
  ): Promise<InvoiceResponseDto> {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      const error = new Error('Invalid invoice ID') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      const error = new Error('Invoice not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    invoice.status = 'PAID';
    invoice.paidAt = now;
    invoice.paidBy = new mongoose.Types.ObjectId(adminUserId);
    await invoice.save();

    // Mark all financial records for this restaurant within the invoice billing period as SETTLED
    await FinancialRecord.updateMany(
      {
        restaurantId: invoice.restaurantId,
        createdAt: { $gte: invoice.periodStart, $lte: invoice.periodEnd },
      },
      {
        $set: {
          status: 'SETTLED',
          settledAt: now,
          settledBy: new mongoose.Types.ObjectId(adminUserId),
        },
      }
    );

    // Notify Restaurant Admin
    await NotificationService.createNotification({
      restaurantId: invoice.restaurantId,
      role: 'RESTAURANT_ADMIN',
      type: 'INVOICE_ISSUED',
      title: `Invoice Settled #${invoice.invoiceNumber}`,
      message: `Payment slip for invoice #${invoice.invoiceNumber} has been verified and settled!`,
      link: `/restaurant/dashboard?tab=invoices`,
      metadata: { invoiceId: invoice._id.toString(), invoiceNumber: invoice.invoiceNumber },
    }).catch(() => {});

    return toInvoiceResponseDto(invoice);
  }
}
