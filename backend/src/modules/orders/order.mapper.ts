import type { IOrder, IOrderItem, IStatusHistoryEntry } from '../../models/order.model.js';

export interface OrderItemResponseDto {
  menuItemId: string;
  nameSnapshot: string;
  unitPrice: number; // in cents
  quantity: number;
  subtotal: number; // in cents
  instructions?: string;
}

export interface StatusHistoryResponseDto {
  status: string;
  changedAt: string;
  changedBy: string;
}

export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  restaurantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: string;
  status: string;
  subtotal: number; // in cents
  deliveryFee: number; // in cents
  serviceFee: number; // in cents
  total: number; // in cents
  scheduledDate: string;
  scheduledTime: string;
  deliveryAddress: string;
  instructions: string;
  paymentMethod: string;
  paymentStatus: string;
  placedAt: string;
  items: OrderItemResponseDto[];
  statusHistory?: StatusHistoryResponseDto[];
  createdAt: string;
}

export function toOrderItemResponseDto(item: IOrderItem): OrderItemResponseDto {
  return {
    menuItemId: item.menuItemId ? item.menuItemId.toString() : '',
    nameSnapshot: item.nameSnapshot,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    subtotal: item.subtotal,
    instructions: item.instructions || '',
  };
}

export function toStatusHistoryResponseDto(entry: IStatusHistoryEntry): StatusHistoryResponseDto {
  return {
    status: entry.status,
    changedAt: entry.changedAt ? new Date(entry.changedAt).toISOString() : new Date().toISOString(),
    changedBy: entry.changedBy ? entry.changedBy.toString() : '',
  };
}

export function toOrderResponseDto(order: Partial<IOrder> & { _id: unknown }): OrderResponseDto {
  return {
    id: order._id ? order._id.toString() : '',
    orderNumber: order.orderNumber || '',
    restaurantId: order.restaurantId ? order.restaurantId.toString() : '',
    customerId: order.customerId ? order.customerId.toString() : '',
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    customerEmail: order.customerEmail || '',
    deliveryType: order.deliveryType || 'pickup',
    status: order.status || 'received',
    subtotal: order.subtotal ?? 0,
    deliveryFee: order.deliveryFee ?? 0,
    serviceFee: order.serviceFee ?? 0,
    total: order.total ?? 0,
    scheduledDate: order.scheduledDate || '',
    scheduledTime: order.scheduledTime || '',
    deliveryAddress: order.deliveryAddress || '',
    instructions: order.instructions || '',
    paymentMethod: order.paymentMethod || 'pickup',
    paymentStatus: order.paymentStatus || 'pending',
    placedAt: order.placedAt ? new Date(order.placedAt).toISOString() : new Date().toISOString(),
    items: order.items ? order.items.map(toOrderItemResponseDto) : [],
    statusHistory: order.statusHistory ? order.statusHistory.map(toStatusHistoryResponseDto) : [],
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
  };
}
