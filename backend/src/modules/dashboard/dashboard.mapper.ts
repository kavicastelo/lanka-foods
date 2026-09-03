export interface MonthlyDataPoint {
  month: string;
  orders: number;
  gross: number;
  platform?: number;
  restaurant?: number;
}

export interface TopSellingItemDto {
  name: string;
  qty: number;
}

export interface StatusDataPoint {
  name: string;
  value: number;
}

export interface RestaurantRevenueSummaryDto {
  id: string;
  name: string;
  orderCount: number;
  gross: number;
  platform: number;
  restaurantRev: number;
  rate: number;
}

export interface RestaurantDashboardMetricsDto {
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number; // in Euros
  avgRating: number;
  reviewCount: number;
  menuItemCount: number;
  monthlyData: MonthlyDataPoint[];
  topItems: TopSellingItemDto[];
  statusData: StatusDataPoint[];
}

export interface AdminDashboardMetricsDto {
  totalRestaurants: number;
  activeRestaurants: number;
  pendingApplications: number;
  totalOrders: number;
  totalReviews: number;
  avgRating: number;
  commissionRate: number;
  monthlyData: MonthlyDataPoint[];
  restaurantRevenue: RestaurantRevenueSummaryDto[];
}
