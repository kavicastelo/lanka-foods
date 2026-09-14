import type { PricingStrategy } from '../../../models/delivery.model.js';

export interface DeliveryPricingInput {
  orderSubtotal: number; // in integer cents
  woltDeliveryCost?: number; // in integer cents (Wolt carrier quote)
  distanceKm?: number; // delivery distance in km if calculated
  settings: {
    pricingStrategy: PricingStrategy;
    pricingParams: {
      fixedFee?: number;
      markupFee?: number;
      percentageMultiplier?: number;
      freeDeliveryThreshold?: number;
      distanceTiers?: Array<{ maxKm: number; fee: number }>;
      fallbackFee?: number;
    };
    maxDistanceKm?: number;
  };
}

export interface DeliveryPricingResult {
  customerDeliveryFee: number; // in integer cents
  woltDeliveryCost: number; // in integer cents
  pricingStrategy: PricingStrategy;
  appliedRule: string;
  explanation: string;
  isFreeDelivery: boolean;
}

/**
 * Server-Authoritative Delivery Pricing Engine.
 * Calculates customer delivery fee according to the restaurant's configured strategy.
 * Strictly operates on integer cents.
 *
 * NOTE: wolt_delivery_cost is the carrier delivery fee charged by Wolt to the restaurant.
 * customer_delivery_fee is the fee charged to the customer by the restaurant.
 * The platform DOES NOT collect, hold, route, or settle either amount.
 */
export class DeliveryPricingEngine {
  static calculateCustomerDeliveryFee(input: DeliveryPricingInput): DeliveryPricingResult {
    const { orderSubtotal, settings, distanceKm } = input;
    const woltCost = Math.max(0, Math.round(input.woltDeliveryCost || 0));
    const strategy = settings.pricingStrategy || 'FIXED';
    const params = settings.pricingParams || {};

    // 1. Check Global Free Delivery Over Threshold condition
    const threshold = params.freeDeliveryThreshold ?? 5000; // default €50.00
    if (strategy === 'FREE_OVER_THRESHOLD' || (strategy !== 'FREE' && threshold > 0 && orderSubtotal >= threshold)) {
      if (orderSubtotal >= threshold) {
        return {
          customerDeliveryFee: 0,
          woltDeliveryCost: woltCost,
          pricingStrategy: strategy,
          appliedRule: `FREE_OVER_THRESHOLD (Subtotal €${(orderSubtotal / 100).toFixed(2)} >= Threshold €${(threshold / 100).toFixed(2)})`,
          explanation: `Free delivery applied because order subtotal meets or exceeds €${(threshold / 100).toFixed(2)}.`,
          isFreeDelivery: true,
        };
      }
    }

    // 2. Evaluate Strategies
    switch (strategy) {
      case 'FREE':
        return {
          customerDeliveryFee: 0,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'FREE',
          appliedRule: 'FREE',
          explanation: 'Restaurant offers free delivery on all orders.',
          isFreeDelivery: true,
        };

      case 'FIXED': {
        const fee = Math.max(0, Math.round(params.fixedFee ?? 490));
        return {
          customerDeliveryFee: fee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'FIXED',
          appliedRule: `FIXED (€${(fee / 100).toFixed(2)})`,
          explanation: `Flat delivery rate of €${(fee / 100).toFixed(2)}.`,
          isFreeDelivery: fee === 0,
        };
      }

      case 'WOLT_COST': {
        const fee = woltCost;
        return {
          customerDeliveryFee: fee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'WOLT_COST',
          appliedRule: `WOLT_COST (€${(fee / 100).toFixed(2)})`,
          explanation: `Customer is charged exact Wolt carrier quote of €${(fee / 100).toFixed(2)}.`,
          isFreeDelivery: fee === 0,
        };
      }

      case 'WOLT_COST_MARKUP': {
        const markup = Math.max(0, Math.round(params.markupFee ?? 0));
        const fee = woltCost + markup;
        return {
          customerDeliveryFee: fee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'WOLT_COST_MARKUP',
          appliedRule: `WOLT_COST_MARKUP (€${(woltCost / 100).toFixed(2)} + €${(markup / 100).toFixed(2)})`,
          explanation: `Wolt carrier cost €${(woltCost / 100).toFixed(2)} with restaurant markup €${(markup / 100).toFixed(2)} totaling €${(fee / 100).toFixed(2)}.`,
          isFreeDelivery: fee === 0,
        };
      }

      case 'PERCENTAGE_MARKUP': {
        const multiplier = typeof params.percentageMultiplier === 'number' && params.percentageMultiplier > 0
          ? params.percentageMultiplier
          : 1.0;
        const fee = Math.max(0, Math.round(woltCost * multiplier));
        return {
          customerDeliveryFee: fee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'PERCENTAGE_MARKUP',
          appliedRule: `PERCENTAGE_MARKUP (€${(woltCost / 100).toFixed(2)} × ${multiplier})`,
          explanation: `Wolt carrier cost €${(woltCost / 100).toFixed(2)} multiplied by ${multiplier} = €${(fee / 100).toFixed(2)}.`,
          isFreeDelivery: fee === 0,
        };
      }

      case 'DISTANCE_BASED': {
        const tiers = params.distanceTiers || [];
        const dist = typeof distanceKm === 'number' ? distanceKm : 2.5; // fallback 2.5km if not specified

        // Sort ascending by maxKm
        const sortedTiers = [...tiers].sort((a, b) => a.maxKm - b.maxKm);
        const matchedTier = sortedTiers.find((t) => dist <= t.maxKm);

        const fee = matchedTier
          ? Math.max(0, Math.round(matchedTier.fee))
          : Math.max(0, Math.round(params.fallbackFee ?? 590));

        return {
          customerDeliveryFee: fee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'DISTANCE_BASED',
          appliedRule: `DISTANCE_BASED (${dist.toFixed(1)} km)`,
          explanation: matchedTier
            ? `Distance tier applied for ${dist.toFixed(1)} km: €${(fee / 100).toFixed(2)}.`
            : `Distance ${dist.toFixed(1)} km exceeds configured tiers, fallback rate €${(fee / 100).toFixed(2)} applied.`,
          isFreeDelivery: fee === 0,
        };
      }

      case 'FREE_OVER_THRESHOLD': {
        // Subtotal was below threshold (handled above), apply fallback fixed fee
        const fallback = Math.max(0, Math.round(params.fallbackFee ?? params.fixedFee ?? 490));
        return {
          customerDeliveryFee: fallback,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'FREE_OVER_THRESHOLD',
          appliedRule: `FREE_OVER_THRESHOLD_BASE (Subtotal €${(orderSubtotal / 100).toFixed(2)} < Threshold €${(threshold / 100).toFixed(2)})`,
          explanation: `Order below free threshold €${(threshold / 100).toFixed(2)}. Standard fee €${(fallback / 100).toFixed(2)} applied.`,
          isFreeDelivery: fallback === 0,
        };
      }

      default: {
        const defaultFee = Math.max(0, Math.round(params.fixedFee ?? 490));
        return {
          customerDeliveryFee: defaultFee,
          woltDeliveryCost: woltCost,
          pricingStrategy: 'FIXED',
          appliedRule: 'DEFAULT_FALLBACK',
          explanation: `Default delivery rate €${(defaultFee / 100).toFixed(2)} applied.`,
          isFreeDelivery: defaultFee === 0,
        };
      }
    }
  }
}
