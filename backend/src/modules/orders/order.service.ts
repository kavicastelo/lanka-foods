import { CommissionConfig } from '../../models/commission-config.model.js';
import { MenuItem } from '../../models/menu-item.model.js';
import { generateNextOrderNumber } from '../../models/order-counter.model.js';
import { Order, type IOrder, type IOrderItem, type OrderStatus } from '../../models/order.model.js';
import { Restaurant } from '../../models/restaurant.model.js';
import { User } from '../../models/user.model.js';
import { centsToEurosFormatted } from '../../utils/money.js';
import type { PaginatedResult } from '../restaurants/restaurant.service.js';
import { FinancialService } from '../financials/financial.service.js';
import { toOrderResponseDto, type OrderResponseDto } from './order.mapper.js';
import type {
  CreateOrderInput,
  CustomerOrdersQueryInput,
  RestaurantOrdersQueryInput,
} from './order.schemas.js';
import { validateOrderStatusTransition } from './order.state-machine.js';

export class OrderService {
  /**
   * Server-authoritative order placement.
   * Calculates subtotal, delivery fee, and total strictly from database records in integer cents.
   */
  static async createOrder(customerId: string, input: CreateOrderInput): Promise<OrderResponseDto> {
    // 1. Verify authenticated customer identity
    const user = await User.findById(customerId);
    if (!user || !user.isActive) {
      const error = new Error('Customer account is inactive or invalid.') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    // 2. Validate target restaurant
    const restaurant = await Restaurant.findById(input.restaurantId);
    if (!restaurant) {
      const error = new Error('Restaurant not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    if (restaurant.status !== 'active') {
      const error = new Error('Restaurant is not active and cannot accept orders.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    if (!restaurant.isOpen) {
      const error = new Error('Restaurant is currently closed.') as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // 3. Validate fulfillment type (pickup / delivery)
    if (input.deliveryType === 'pickup' && !restaurant.pickup) {
      const error = new Error('This restaurant does not support pickup orders.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    if (input.deliveryType === 'delivery' && !restaurant.delivery) {
      const error = new Error('This restaurant does not support delivery orders.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    // 4. Server-authoritative menu item lookup & validation
    const itemIds = input.items.map((i) => i.menuItemId);
    const dbMenuItems = await MenuItem.find({ _id: { $in: itemIds } });
    const menuItemMap = new Map(dbMenuItems.map((item) => [item._id.toString(), item]));

    const orderItemSnapshots: IOrderItem[] = [];
    let calculatedSubtotal = 0;

    for (const itemInput of input.items) {
      const dbItem = menuItemMap.get(itemInput.menuItemId);

      if (!dbItem) {
        const error = new Error(`Menu item not found: ${itemInput.menuItemId}`) as Error & {
          statusCode?: number;
        };
        error.statusCode = 404;
        throw error;
      }

      // Cross-Restaurant Protection: Item MUST belong to selected restaurant
      if (dbItem.restaurantId.toString() !== restaurant._id.toString()) {
        const error = new Error(
          `Menu item '${dbItem.name}' does not belong to the selected restaurant.`
        ) as Error & { statusCode?: number };
        error.statusCode = 400;
        throw error;
      }

      // Item Availability Check
      if (!dbItem.isAvailable) {
        const error = new Error(`Menu item '${dbItem.name}' is currently unavailable.`) as Error & {
          statusCode?: number;
        };
        error.statusCode = 400;
        throw error;
      }

      // Server-authoritative price lookup (directly from DB in integer cents)
      const unitPrice = dbItem.price;
      const lineSubtotal = unitPrice * itemInput.quantity;
      calculatedSubtotal += lineSubtotal;

      orderItemSnapshots.push({
        menuItemId: dbItem._id,
        nameSnapshot: dbItem.name,
        unitPrice: unitPrice,
        quantity: itemInput.quantity,
        subtotal: lineSubtotal,
        instructions: itemInput.instructions || '',
      });
    }

    // 5. Minimum Order Validation
    if (calculatedSubtotal < restaurant.minOrder) {
      const formattedSubtotal = centsToEurosFormatted(calculatedSubtotal);
      const formattedMinOrder = centsToEurosFormatted(restaurant.minOrder);
      const error = new Error(
        `Order subtotal (${formattedSubtotal}) is below restaurant minimum order requirement (${formattedMinOrder}).`
      ) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }

    // 6. Server-authoritative Delivery Fee & Total Calculation
    const globalConfig = await CommissionConfig.findOne({ key: 'default_config' });
    const calculatedDeliveryFee = input.deliveryType === 'delivery' ? restaurant.deliveryFee || 0 : 0;
    const calculatedServiceFee = globalConfig?.serviceFee ?? 99;
    const calculatedTotal = calculatedSubtotal + calculatedDeliveryFee + calculatedServiceFee;

    // 7. Atomic Order Number Generation
    const orderNumber = await generateNextOrderNumber();

    const placedAt = new Date();

    // 8. Create Order Document with Initial Status & Status History Entry
    const newOrder = await Order.create({
      orderNumber,
      restaurantId: restaurant._id,
      customerId: user._id,
      customerName: user.fullName,
      customerPhone: user.phone || '',
      customerEmail: user.email,
      deliveryType: input.deliveryType,
      status: 'received',
      subtotal: calculatedSubtotal,
      deliveryFee: calculatedDeliveryFee,
      serviceFee: calculatedServiceFee,
      total: calculatedTotal,
      scheduledDate: input.scheduledDate || '',
      scheduledTime: input.scheduledTime || '',
      deliveryAddress: input.deliveryType === 'delivery' ? input.deliveryAddress?.trim() : '',
      instructions: input.instructions || '',
      paymentMethod: input.paymentMethod || 'pickup',
      paymentStatus: 'pending',
      placedAt,
      items: orderItemSnapshots,
      statusHistory: [
        {
          status: 'received',
          changedAt: placedAt,
          changedBy: user._id,
        },
      ],
    });

    return toOrderResponseDto(newOrder);
  }

  /**
   * Updates order lifecycle status using the Server-Authoritative State Machine.
   * Concurrency-safe: atomic status transition matching currentStatus in MongoDB.
   */
  static async updateOrderStatus(
    actorUserId: string,
    actorRole: string,
    orderId: string,
    nextStatus: OrderStatus
  ): Promise<OrderResponseDto> {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Order not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // Authorization & Ownership Verification
    if (actorRole === 'RESTAURANT_ADMIN') {
      const ownerRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
      if (!ownerRestaurant || order.restaurantId.toString() !== ownerRestaurant._id.toString()) {
        const error = new Error('Order not found') as Error & { statusCode?: number };
        error.statusCode = 404; // Prevent leaking order existence across restaurants
        throw error;
      }
    } else if (actorRole !== 'SUPER_ADMIN') {
      const error = new Error('Access denied. Insufficient permissions for order status updates.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 403;
      throw error;
    }

    // Validate transition via Server State Machine
    const transitionCheck = validateOrderStatusTransition(order.status, nextStatus, order.deliveryType);
    if (!transitionCheck.valid) {
      const error = new Error(transitionCheck.reason || 'Invalid order status transition.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 400;
      throw error;
    }

    // Concurrency Safety: Atomic update checking current status to prevent race conditions
    const now = new Date();
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      {
        $set: { status: nextStatus },
        $push: {
          statusHistory: {
            status: nextStatus,
            changedAt: now,
            changedBy: actorUserId,
          },
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      const error = new Error(
        'Order status was modified by another concurrent request. Please refresh.'
      ) as Error & { statusCode?: number };
      error.statusCode = 409;
      throw error;
    }

    if (nextStatus === 'completed') {
      await FinancialService.calculateAndCreateCommissionRecord(updatedOrder._id.toString());
    }

    return toOrderResponseDto(updatedOrder);
  }

  /**
   * Returns paginated order list for authenticated customer strictly derived from JWT identity.
   */
  static async getCustomerOrders(
    customerId: string,
    input: CustomerOrdersQueryInput
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      customerId,
    };
    if (input.status) {
      filter.status = input.status;
    }

    const [total, documents] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toOrderResponseDto(doc as unknown as IOrder));

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
   * Retrieves single order by ID with strict ownership authorization checks.
   */
  static async getOrderById(
    actorUserId: string,
    actorRole: string,
    orderId: string
  ): Promise<OrderResponseDto> {
    const order = await Order.findById(orderId).lean();
    if (!order) {
      const error = new Error('Order not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    // Authorization & Data Isolation
    if (actorRole === 'CUSTOMER') {
      if (order.customerId.toString() !== actorUserId) {
        const error = new Error('Order not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }
    } else if (actorRole === 'RESTAURANT_ADMIN') {
      const ownerRestaurant = await Restaurant.findOne({ ownerId: actorUserId });
      if (!ownerRestaurant || order.restaurantId.toString() !== ownerRestaurant._id.toString()) {
        const error = new Error('Order not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      }
    }

    return toOrderResponseDto(order as unknown as IOrder);
  }

  /**
   * Returns paginated order list for authenticated restaurant owner's restaurant.
   */
  static async getRestaurantOrders(
    actorUserId: string,
    input: RestaurantOrdersQueryInput
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const restaurant = await Restaurant.findOne({ ownerId: actorUserId });
    if (!restaurant) {
      const error = new Error('No restaurant found associated with this owner account.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 404;
      throw error;
    }

    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      restaurantId: restaurant._id,
    };
    if (input.status) {
      filter.status = input.status;
    }
    if (input.deliveryType) {
      filter.deliveryType = input.deliveryType;
    }

    const [total, documents] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toOrderResponseDto(doc as unknown as IOrder));

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
   * Returns paginated order list across ALL restaurants for Super Admin.
   */
  static async getAllAdminOrders(
    input: Partial<RestaurantOrdersQueryInput> = {}
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 50));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (input.status) {
      filter.status = input.status;
    }
    if (input.deliveryType) {
      filter.deliveryType = input.deliveryType;
    }

    const [total, documents] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ placedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const data = documents.map((doc) => toOrderResponseDto(doc as unknown as IOrder));

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
}

