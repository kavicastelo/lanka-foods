import mongoose from 'mongoose';
import { CommissionConfig } from '../../models/commission-config.model.js';
import { FinancialRecord } from '../../models/financial-record.model.js';
import { MenuItem } from '../../models/menu-item.model.js';
import { Order } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { RestaurantApplication } from '../../models/restaurant-application.model.js';
import { Review } from '../../models/review.model.js';
import type {
  AdminDashboardMetricsDto,
  MonthlyDataPoint,
  RestaurantDashboardMetricsDto,
  RestaurantRevenueSummaryDto,
  StatusDataPoint,
  TopSellingItemDto,
} from './dashboard.mapper.js';

export class DashboardService {
  /**
   * Scoped Restaurant Admin Dashboard Metrics.
   * Derived from server-authoritative MongoDB collections.
   */
  static async getRestaurantDashboardMetrics(
    requestingUserId: string,
    userRole: string,
    restaurantId: string
  ): Promise<RestaurantDashboardMetricsDto> {
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

    // Ownership Verification
    if (userRole !== 'SUPER_ADMIN' && restaurant.ownerId.toString() !== requestingUserId) {
      const error = new Error('Unauthorized access to restaurant dashboard') as Error & {
        statusCode?: number;
      };
      error.statusCode = 403;
      throw error;
    }

    const now = new Date();

    const [orders, reviews, menuItemCount, topItemsResult, statusResult] = await Promise.all([
      Order.find({ restaurantId: restaurant._id }).lean(),
      Review.find({ restaurantId: restaurant._id }).lean(),
      MenuItem.countDocuments({ restaurantId: restaurant._id }),
      Order.aggregate([
        { $match: { restaurantId: restaurant._id, status: 'completed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.nameSnapshot',
            qty: { $sum: '$items.quantity' },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id', qty: 1 } },
      ]),
      Order.aggregate([
        { $match: { restaurantId: restaurant._id } },
        { $group: { _id: '$status', value: { $sum: 1 } } },
        { $project: { _id: 0, name: '$_id', value: 1 } },
      ]),
    ]);

    const completedOrders = orders.filter((o) => o.status === 'completed');
    const totalRevenueCents = completedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalRevenue = +(totalRevenueCents / 100).toFixed(2);

    const avgRating =
      reviews.length > 0
        ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : restaurant.ratingAverage || 0;

    // Monthly Aggregation (last 6 months)
    const monthlyData: MonthlyDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = startOfMonth.toLocaleString('en', { month: 'short' });

      const monthOrders = orders.filter(
        (o) => o.placedAt >= startOfMonth && o.placedAt <= endOfMonth
      );
      const monthCompleted = monthOrders.filter((o) => o.status === 'completed');
      const monthGrossCents = monthCompleted.reduce((sum, o) => sum + (o.subtotal || 0), 0);

      monthlyData.push({
        month: monthLabel,
        orders: monthOrders.length,
        gross: +(monthGrossCents / 100).toFixed(2),
      });
    }

    const topItems: TopSellingItemDto[] = topItemsResult.map((i) => ({
      name: i.name || 'Unknown Dish',
      qty: i.qty || 0,
    }));

    const statusData: StatusDataPoint[] = statusResult.map((s) => ({
      name: s.name ? s.name.replace(/_/g, ' ') : 'unknown',
      value: s.value || 0,
    }));

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      avgRating,
      reviewCount: reviews.length,
      menuItemCount,
      monthlyData,
      topItems,
      statusData,
    };
  }

  /**
   * Global Super Admin Dashboard Metrics.
   * Derived from server-authoritative MongoDB collections & Phase 11 FinancialRecords.
   */
  static async getAdminDashboardMetrics(): Promise<AdminDashboardMetricsDto> {
    const now = new Date();

    const [
      restaurants,
      pendingApplications,
      orders,
      reviews,
      globalConfig,
      financialRecords,
    ] = await Promise.all([
      Restaurant.find().lean(),
      RestaurantApplication.countDocuments({ status: 'pending' }),
      Order.find().lean(),
      Review.find().lean(),
      CommissionConfig.findOne({ key: 'default_config' }).lean(),
      FinancialRecord.find().lean(),
    ]);

    const activeRestaurants = restaurants.filter((r) => r.status === 'active');
    const defaultCommissionRate = globalConfig?.defaultRate ?? 10;

    const avgRating =
      reviews.length > 0
        ? +(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : 0;

    // Monthly Aggregation (last 6 months)
    const monthlyData: MonthlyDataPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = startOfMonth.toLocaleString('en', { month: 'short' });

      const monthOrders = orders.filter(
        (o) => o.placedAt >= startOfMonth && o.placedAt <= endOfMonth
      );
      const monthRecords = financialRecords.filter(
        (f) => f.createdAt >= startOfMonth && f.createdAt <= endOfMonth
      );

      const monthCompletedOrders = monthOrders.filter((o) => o.status === 'completed');
      const grossCents = monthCompletedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const platformCents = monthRecords.reduce((sum, f) => sum + (f.commissionAmount || 0), 0);
      const restaurantCents = monthRecords.reduce((sum, f) => sum + (f.restaurantNetAmount || 0), 0);

      monthlyData.push({
        month: monthLabel,
        orders: monthOrders.length,
        gross: +(grossCents / 100).toFixed(2),
        platform: +(platformCents / 100).toFixed(2),
        restaurant: +(restaurantCents / 100).toFixed(2),
      });
    }

    // Revenue by Restaurant
    const restaurantRevenue: RestaurantRevenueSummaryDto[] = restaurants.map((r) => {
      const rOrders = orders.filter(
        (o) => o.restaurantId.toString() === r._id.toString() && o.status === 'completed'
      );
      const rRecords = financialRecords.filter(
        (f) => f.restaurantId.toString() === r._id.toString()
      );

      const grossCents = rOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const platformCents = rRecords.reduce((sum, f) => sum + (f.commissionAmount || 0), 0);
      const restaurantCents = rRecords.reduce((sum, f) => sum + (f.restaurantNetAmount || 0), 0);
      const rate = typeof r.commissionRate === 'number' ? r.commissionRate : defaultCommissionRate;

      return {
        id: r._id.toString(),
        name: r.name,
        orderCount: rOrders.length,
        gross: +(grossCents / 100).toFixed(2),
        platform: +(platformCents / 100).toFixed(2),
        restaurantRev: +(restaurantCents / 100).toFixed(2),
        rate,
      };
    });

    return {
      totalRestaurants: restaurants.length,
      activeRestaurants: activeRestaurants.length,
      pendingApplications,
      totalOrders: orders.length,
      totalReviews: reviews.length,
      avgRating,
      commissionRate: defaultCommissionRate,
      monthlyData,
      restaurantRevenue,
    };
  }
}
