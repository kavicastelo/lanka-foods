import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, requireAdmin } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);
        requireAdmin(user);

        const body = await req.json();
        const { restaurantId, status } = body;

        if (!restaurantId || !status) {
            return Response.json({ error: "Missing restaurantId or status" }, { status: 400 });
        }

        const validStatuses = ["active", "suspended", "rejected", "pending"];
        if (!validStatuses.includes(status)) {
            return Response.json({ error: "Invalid status" }, { status: 400 });
        }

        const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurantId);
        if (!restaurant) {
            return Response.json({ error: "Restaurant not found" }, { status: 404 });
        }

        const updated = await base44.asServiceRole.entities.Restaurant.update(restaurantId, {
            status,
            is_open: status === "active",
        });

        return Response.json({ restaurant: updated });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}