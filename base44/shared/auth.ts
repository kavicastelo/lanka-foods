// Shared auth and validation utilities for backend functions.
// Imported by functions as: import { ... } from "../../shared/auth.ts";

export async function requireAuth(base44) {
    const user = await base44.auth.me();
    if (!user) {
        const err = new Error("Unauthorized");
        err.status = 401;
        throw err;
    }
    return user;
}

export function requireAdmin(user) {
    if (user.role !== "admin") {
        const err = new Error("Admin access required");
        err.status = 403;
        throw err;
    }
}

/**
 * Verifies that the authenticated user owns the target restaurant (or is admin).
 * Returns the restaurant record on success; throws on failure.
 * Uses service role to read the restaurant regardless of RLS (needed for
 * suspended/pending restaurants that non-admin RLS would hide).
 */
export async function verifyRestaurantOwnership(base44, restaurantId, user) {
    const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurantId);
    if (!restaurant) {
        const err = new Error("Restaurant not found");
        err.status = 404;
        throw err;
    }
    if (user.role !== "admin" && restaurant.owner_id !== user.id) {
        const err = new Error("Permission denied: not restaurant owner");
        err.status = 403;
        throw err;
    }
    return restaurant;
}

// Order status state machine — legal transitions only.
export const VALID_TRANSITIONS = {
    received: ["accepted", "rejected", "cancelled"],
    accepted: ["preparing", "cancelled", "rejected"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "completed", "cancelled"],
    out_for_delivery: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
    rejected: [],
};

export function isValidTransition(fromStatus, toStatus) {
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
}