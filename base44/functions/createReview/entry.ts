import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const { orderId, rating, foodRating, text } = body;

        if (!orderId || typeof rating !== "number" || rating < 1 || rating > 5) {
            return Response.json({ error: "Missing orderId or invalid rating (1-5)" }, { status: 400 });
        }

        // --- Fetch order (service role for full record) ---
        const order = await base44.asServiceRole.entities.Order.get(orderId);
        if (!order) {
            return Response.json({ error: "Order not found" }, { status: 404 });
        }

        // --- Verify order belongs to the authenticated customer ---
        if (order.customer_id !== user.id) {
            return Response.json(
                { error: "Permission denied: order does not belong to you" },
                { status: 403 }
            );
        }

        // --- Verify order status is completed ---
        if (order.status !== "completed") {
            return Response.json(
                { error: "Can only review completed orders" },
                { status: 400 }
            );
        }

        // --- Check for existing review for this order ---
        const existingReviews = await base44.asServiceRole.entities.Review.filter({
            order_id: orderId,
        });
        if (existingReviews.length > 0) {
            return Response.json(
                { error: "You have already reviewed this order" },
                { status: 400 }
            );
        }

        // --- Create review (user-scoped — RLS create allows author_id == user.id) ---
        const review = await base44.entities.Review.create({
            restaurant_id: order.restaurant_id, // server-derived from order
            order_id: orderId,
            author_id: user.id, // server-derived from session
            author_name: user.full_name || user.email,
            rating,
            food_rating: typeof foodRating === "number" ? foodRating : rating,
            text: text || "",
            is_verified: true, // server-set, linked to completed order
        });

        return Response.json({ review });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}