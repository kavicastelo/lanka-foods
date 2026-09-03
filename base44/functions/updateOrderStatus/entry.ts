import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, isValidTransition } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const { orderId, newStatus } = body;

        if (!orderId || !newStatus) {
            return Response.json({ error: "Missing orderId or newStatus" }, { status: 400 });
        }

        // Fetch order (service role for full record regardless of RLS)
        const order = await base44.asServiceRole.entities.Order.get(orderId);
        if (!order) {
            return Response.json({ error: "Order not found" }, { status: 404 });
        }

        // --- Verify ownership: must be the restaurant owner or admin ---
        if (user.role !== "admin") {
            const restaurant = await base44.asServiceRole.entities.Restaurant.get(order.restaurant_id);
            if (!restaurant || restaurant.owner_id !== user.id) {
                return Response.json(
                    { error: "Permission denied: not restaurant owner" },
                    { status: 403 }
                );
            }
        }

        // --- Validate state machine transition ---
        if (!isValidTransition(order.status, newStatus)) {
            return Response.json(
                { error: `Invalid transition: ${order.status} → ${newStatus}` },
                { status: 400 }
            );
        }

        // --- Update order status (service role — function does its own auth) ---
        const updated = await base44.asServiceRole.entities.Order.update(orderId, {
            status: newStatus,
        });

        return Response.json({ order: updated });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}