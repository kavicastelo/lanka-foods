import type { DeliveryType, OrderStatus } from '../../models/order.model.js';

export interface TransitionResult {
  valid: boolean;
  reason?: string;
}

/**
 * Server-authoritative Order State Machine Validator
 * Enforces valid lifecycle transitions for pickup vs delivery orders.
 */
export function validateOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  deliveryType: DeliveryType
): TransitionResult {
  // Reject same-status updates
  if (currentStatus === nextStatus) {
    return {
      valid: false,
      reason: `Order is already in '${currentStatus}' status.`,
    };
  }

  // Terminal state check: completed, cancelled, rejected cannot be transitioned
  if (currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'rejected') {
    return {
      valid: false,
      reason: `Order is in terminal '${currentStatus}' status and cannot be modified.`,
    };
  }

  // State Machine Allowed Transitions Definition
  if (deliveryType === 'pickup') {
    switch (currentStatus) {
      case 'received':
        if (nextStatus === 'accepted' || nextStatus === 'rejected' || nextStatus === 'cancelled') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for pickup order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transitions: 'accepted', 'rejected', 'cancelled'.`,
        };

      case 'accepted':
        if (nextStatus === 'preparing' || nextStatus === 'cancelled') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for pickup order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transitions: 'preparing', 'cancelled'.`,
        };

      case 'preparing':
        if (nextStatus === 'ready') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for pickup order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transition: 'ready'.`,
        };

      case 'ready':
        if (nextStatus === 'completed') {
          return { valid: true };
        }
        if (nextStatus === 'out_for_delivery') {
          return {
            valid: false,
            reason: `Pickup orders cannot transition to 'out_for_delivery'. Transition directly from 'ready' to 'completed'.`,
          };
        }
        return {
          valid: false,
          reason: `Invalid transition for pickup order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transition: 'completed'.`,
        };

      default:
        return { valid: false, reason: `Unknown current status '${currentStatus}'.` };
    }
  } else {
    // deliveryType === 'delivery'
    switch (currentStatus) {
      case 'received':
        if (nextStatus === 'accepted' || nextStatus === 'rejected' || nextStatus === 'cancelled') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for delivery order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transitions: 'accepted', 'rejected', 'cancelled'.`,
        };

      case 'accepted':
        if (nextStatus === 'preparing' || nextStatus === 'cancelled') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for delivery order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transitions: 'preparing', 'cancelled'.`,
        };

      case 'preparing':
        if (nextStatus === 'ready') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for delivery order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transition: 'ready'.`,
        };

      case 'ready':
        if (nextStatus === 'out_for_delivery') {
          return { valid: true };
        }
        if (nextStatus === 'completed') {
          return {
            valid: false,
            reason: `Delivery orders cannot bypass 'out_for_delivery'. Transition from 'ready' to 'out_for_delivery' before 'completed'.`,
          };
        }
        return {
          valid: false,
          reason: `Invalid transition for delivery order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transition: 'out_for_delivery'.`,
        };

      case 'out_for_delivery':
        if (nextStatus === 'completed') {
          return { valid: true };
        }
        return {
          valid: false,
          reason: `Invalid transition for delivery order: '${currentStatus}' cannot transition to '${nextStatus}'. Allowed transition: 'completed'.`,
        };

      default:
        return { valid: false, reason: `Unknown current status '${currentStatus}'.` };
    }
  }
}
