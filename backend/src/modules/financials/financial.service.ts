import mongoose from 'mongoose';
import { CommissionConfig } from '../../models/commission-config.model.js';
import { FinancialRecord, type IFinancialRecord } from '../../models/financial-record.model.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import type { PaginatedResult } from '../restaurants/restaurant.service.js';
import {
  toCommissionConfigDto,
  toFinancialRecordResponseDto,
  type CommissionConfigDto,
  type FinancialRecordResponseDto,
} from './financial.mapper.js';
import type {
  GetFinancialRecordsQueryInput,
  UpdateCommissionConfigInput,
} from './financial.schemas.js';

export interface RestaurantFinancialSummaryDto {
  records: FinancialRecordResponseDto[];
  summary: {
    totalGross: number;
    totalCommission: number;
    pendingCommission: number;
    settledCommission: number;
    totalNet: number;
    pendingCount: number;
    settledCount: number;
  };
}

export class FinancialService {
  /**
   * Retrieves the global default commission configuration.
   */
  static async getCommissionConfig(): Promise<CommissionConfigDto> {
    let config = await CommissionConfig.findOne({ key: 'default_config' });
    if (!config) {
      config = await CommissionConfig.create({
        key: 'default_config',
        defaultRate: 10,
        updatedDate: new Date(),
      });
    }
    return toCommissionConfigDto(config);
  }

  /**
   * Updates global default commission configuration (Super Admin only).
   */
  static async updateCommissionConfig(
    adminUserId: string,
    input: UpdateCommissionConfigInput
  ): Promise<CommissionConfigDto> {
    if (input.restaurantId && typeof input.rate === 'number' && mongoose.Types.ObjectId.isValid(input.restaurantId)) {
      await Restaurant.findByIdAndUpdate(input.restaurantId, { commissionRate: input.rate });
    }

    let config = await CommissionConfig.findOne({ key: 'default_config' });
    if (!config) {
      config = new CommissionConfig({ key: 'default_config' });
    }

    if (typeof input.defaultRate === 'number') {
      config.defaultRate = input.defaultRate;
    }

    if (typeof input.serviceFee === 'number') {
      const cents = Number.isInteger(input.serviceFee) && input.serviceFee >= 50
        ? input.serviceFee
        : Math.round(input.serviceFee * 100);
      config.serviceFee = cents;
    }

    config.updatedBy = new mongoose.Types.ObjectId(adminUserId);
    config.updatedDate = new Date();
    await config.save();

    return toCommissionConfigDto(config);
  }

  /**
   * Idempotent server-authoritative commission calculation on order completion.
   * Snapshots effective commission rate historically.
   */
  static async calculateAndCreateCommissionRecord(
    orderId: string
  ): Promise<FinancialRecordResponseDto | null> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return null;
    }

    const order = await Order.findById(orderId);
    if (!order || order.status !== 'completed') {
      return null;
    }

    // Idempotency check: Return existing financial record if already calculated
    const existingRecord = await FinancialRecord.findOne({ orderId: order._id });
    if (existingRecord) {
      return toFinancialRecordResponseDto(existingRecord);
    }

    const restaurant = await Restaurant.findById(order.restaurantId);
    const globalConfig = await CommissionConfig.findOne({ key: 'default_config' });

    // Determine effective commission rate percentage snapshot (e.g. 10 for 10%)
    const effectiveRate =
      typeof restaurant?.commissionRate === 'number' && restaurant.commissionRate >= 0
        ? restaurant.commissionRate
        : globalConfig?.defaultRate ?? 10;

    // Monetary Calculation (Deterministic minor-unit integer arithmetic in cents)
    const commissionableAmount = order.subtotal;
    const commissionAmount = Math.round((commissionableAmount * effectiveRate) / 100);
    const serviceFee = order.serviceFee || 0;
    const platformFeeTotal = commissionAmount + serviceFee;
    const restaurantNetAmount = Math.max(0, commissionableAmount - commissionAmount);

    try {
      const record = await FinancialRecord.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        orderSubtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        serviceFee,
        orderTotal: order.total,
        commissionableAmount,
        commissionRate: effectiveRate,
        commissionAmount,
        platformFeeTotal,
        restaurantNetAmount,
        status: 'PENDING',
      });

      return toFinancialRecordResponseDto(record);
    } catch (err: unknown) {
      // Handle MongoDB E11000 duplicate key error cleanly for concurrent requests
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
        const raceRecord = await FinancialRecord.findOne({ orderId: order._id });
        if (raceRecord) {
          return toFinancialRecordResponseDto(raceRecord);
        }
      }
      throw err;
    }
  }

  /**
   * Paginated list of financial records for Super Admin.
   */
  static async getFinancialRecords(
    input: GetFinancialRecordsQueryInput
  ): Promise<PaginatedResult<FinancialRecordResponseDto>> {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (input.restaurantId && mongoose.Types.ObjectId.isValid(input.restaurantId)) {
      filter.restaurantId = new mongoose.Types.ObjectId(input.restaurantId);
    }
    if (input.status) {
      filter.status = input.status;
    }

    const [total, documents] = await Promise.all([
      FinancialRecord.countDocuments(filter),
      FinancialRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toFinancialRecordResponseDto(doc as unknown as IFinancialRecord));

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
   * Scoped financial records and summary totals for Restaurant Owner or Super Admin.
   */
  static async getRestaurantFinancials(
    requestingUserId: string,
    userRole: string,
    restaurantId: string
  ): Promise<RestaurantFinancialSummaryDto> {
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      const error = new Error('Invalid restaurant ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // Ownership Enforcement: Restaurant Admin can only view own restaurant financials
    if (userRole !== 'SUPER_ADMIN' && restaurant.ownerId.toString() !== requestingUserId) {
      const error = new Error('Unauthorized to view financials for this restaurant') as Error & {
        statusCode?: number;
      };
      error.statusCode = 403;
      throw error;
    }

    const records = await FinancialRecord.find({ restaurantId }).sort({ createdAt: -1 });
    const dtos = records.map((r) => toFinancialRecordResponseDto(r));

    let totalGross = 0;
    let totalCommission = 0;
    let pendingCommission = 0;
    let settledCommission = 0;
    let totalNet = 0;
    let pendingCount = 0;
    let settledCount = 0;

    for (const r of records) {
      totalGross += r.commissionableAmount;
      const platformFee = r.platformFeeTotal ?? (r.commissionAmount + (r.serviceFee ?? 0));
      totalCommission += platformFee;
      totalNet += r.restaurantNetAmount;
      if (r.status === 'PENDING') {
        pendingCount++;
        pendingCommission += platformFee;
      }
      if (r.status === 'SETTLED') {
        settledCount++;
        settledCommission += platformFee;
      }
    }

    return {
      records: dtos,
      summary: {
        totalGross,
        totalCommission,
        pendingCommission,
        settledCommission,
        totalNet,
        pendingCount,
        settledCount,
      },
    };
  }

  /**
   * Idempotent manual settlement of a financial record by Super Admin.
   */
  static async settleFinancialRecord(
    adminUserId: string,
    financialRecordId: string
  ): Promise<{ message: string; record: FinancialRecordResponseDto }> {
    if (!mongoose.Types.ObjectId.isValid(financialRecordId)) {
      const error = new Error('Invalid financial record ID format') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    const record = await FinancialRecord.findById(financialRecordId);
    if (!record) {
      const error = new Error('Financial record not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // Idempotency check: Already settled returns 200 OK
    if (record.status === 'SETTLED') {
      return {
        message: 'Financial record is already settled.',
        record: toFinancialRecordResponseDto(record),
      };
    }

    record.status = 'SETTLED';
    record.settledBy = new mongoose.Types.ObjectId(adminUserId);
    record.settledAt = new Date();
    await record.save();

    return {
      message: 'Financial record settled successfully.',
      record: toFinancialRecordResponseDto(record),
    };
  }
}
