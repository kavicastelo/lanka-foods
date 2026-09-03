import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, requireAdmin } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);
        requireAdmin(user);

        const body = await req.json();
        const { rate, restaurantId } = body;

        if (typeof rate !== "number" || rate < 0 || rate > 50) {
            return Response.json({ error: "Rate must be a number between 0 and 50" }, { status: 400 });
        }

        // --- Per-restaurant override ---
        if (restaurantId) {
            const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurantId);
            if (!restaurant) {
                return Response.json({ error: "Restaurant not found" }, { status: 404 });
            }
            const updated = await base44.asServiceRole.entities.Restaurant.update(restaurantId, {
                commission_rate: rate,
            });
            return Response.json({ restaurant: updated });
        }

        // --- Default platform commission ---
        const configs = await base44.asServiceRole.entities.CommissionConfig.list();
        if (configs.length === 0) {
            // Create if not exists
            const config = await base44.asServiceRole.entities.CommissionConfig.create({
                default_rate: rate,
                updated_by: user.id,
                updated_date: new Date().toISOString(),
            });
            return Response.json({ config });
        }

        const config = await base44.asServiceRole.entities.CommissionConfig.update(configs[0].id, {
            default_rate: rate,
            updated_by: user.id,
            updated_date: new Date().toISOString(),
        });

        return Response.json({ config });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}