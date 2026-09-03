import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const { restaurantId, scope } = body;

        const isAdmin = user.role === "admin";

        if (scope === "restaurant") {
            // --- Restaurant dashboard metrics ---
            if (!restaurantId) {
                return Response.json({ error: "Missing restaurantId" }, { status: 400 });
            }

            // Verify ownership (unless admin)
            const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurantId);
            if (!restaurant) {
                return Response.json({ error: "Restaurant not found" }, { status: 404 });
            }
            if (!isAdmin && restaurant.owner_id !== user.id) {
                return Response.json(
                    { error: "Permission denied: not restaurant owner" },
                    { status: 403 }
                );
            }

            // Fetch orders for this restaurant
            const orders = await base44.asServiceRole.entities.Order.filter({
                restaurant_id: restaurantId,
            });

            // Fetch reviews for this restaurant
            const reviews = await base44.asServiceRole.entities.Review.filter({
                restaurant_id: restaurantId,
            });

            // Fetch menu items
            const menuItems = await base44.asServiceRole.entities.MenuItem.filter({
                restaurant_id: restaurantId,
            });

            // Calculate metrics
            const completedOrders = orders.filter((o) => o.status === "completed");
            const totalRevenue = completedOrders.reduce((s, o) => s + (o.total || 0), 0);

            // Monthly aggregation (last 6 months)
            const now = new Date();
            const monthlyData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
                const monthOrders = orders.filter((o) => {
                    const orderDate = (o.placed_at || o.created_date || "").slice(0, 7);
                    return orderDate === monthKey;
                });
                const monthCompleted = monthOrders.filter((o) => o.status === "completed");
                const monthGross = monthCompleted.reduce((s, o) => s + (o.total || 0), 0);
                monthlyData.push({
                    month: d.toLocaleString("en", { month: "short" }),
                    orders: monthOrders.length,
                    gross: +monthGross.toFixed(2),
                });
            }

            // Top selling items
            const itemMap = {};
            completedOrders.forEach((o) => {
                // We need order items — fetch them
            });
            // Fetch order items for completed orders
            const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
                restaurant_id: restaurantId,
            });
            orderItems.forEach((oi) => {
                if (!itemMap[oi.name]) itemMap[oi.name] = 0;
                itemMap[oi.name] += oi.quantity;
            });
            const topItems = Object.entries(itemMap)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            // Order status distribution
            const statusMap = {};
            orders.forEach((o) => {
                const s = o.status.replace(/_/g, " ");
                statusMap[s] = (statusMap[s] || 0) + 1;
            });
            const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

            // Average rating
            const avgRating =
                reviews.length > 0
                    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                    : 0;

            return Response.json({
                totalOrders: orders.length,
                completedOrders: completedOrders.length,
                totalRevenue: +totalRevenue.toFixed(2),
                avgRating: +avgRating.toFixed(2),
                reviewCount: reviews.length,
                menuItemCount: menuItems.length,
                monthlyData,
                topItems,
                statusData,
            });
        }

        // --- Admin dashboard metrics ---
        if (!isAdmin) {
            return Response.json({ error: "Admin access required" }, { status: 403 });
        }

        const restaurants = await base44.asServiceRole.entities.Restaurant.list();
        const orders = await base44.asServiceRole.entities.Order.list();
        const reviews = await base44.asServiceRole.entities.Review.list();
        const applications = await base44.asServiceRole.entities.RestaurantApplication.list();
        const configs = await base44.asServiceRole.entities.CommissionConfig.list();
        const commissionRate = configs.length > 0 ? configs[0].default_rate : 10;

        const activeRestaurants = restaurants.filter((r) => r.status === "active");
        const pendingApplications = applications.filter((a) => a.status === "pending");

        // Monthly aggregation (last 6 months)
        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7);
            const monthOrders = orders.filter((o) => {
                const orderDate = (o.placed_at || o.created_date || "").slice(0, 7);
                return orderDate === monthKey;
            });
            const monthCompleted = monthOrders.filter((o) => o.status === "completed");
            const monthGross = monthCompleted.reduce((s, o) => s + (o.total || 0), 0);
            const platformRev = +(monthGross * commissionRate / 100).toFixed(2);
            monthlyData.push({
                month: d.toLocaleString("en", { month: "short" }),
                orders: monthOrders.length,
                gross: +monthGross.toFixed(2),
                platform: platformRev,
                restaurant: +(monthGross - platformRev).toFixed(2),
            });
        }

        // Revenue by restaurant
        const restaurantRevenue = restaurants.map((r) => {
            const ro = orders.filter((o) => o.restaurant_id === r.id && !["cancelled", "rejected"].includes(o.status));
            const gross = ro.reduce((s, o) => s + (o.total || 0), 0);
            const rate = r.commission_rate ?? commissionRate;
            const platform = +(gross * rate / 100).toFixed(2);
            return {
                id: r.id,
                name: r.name,
                orderCount: ro.length,
                gross: +gross.toFixed(2),
                platform,
                restaurantRev: +(gross - platform).toFixed(2),
                rate,
            };
        });

        // Average rating
        const avgRating =
            reviews.length > 0
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : 0;

        return Response.json({
            totalRestaurants: restaurants.length,
            activeRestaurants: activeRestaurants.length,
            pendingApplications: pendingApplications.length,
            totalOrders: orders.length,
            totalReviews: reviews.length,
            avgRating: +avgRating.toFixed(2),
            commissionRate,
            monthlyData,
            restaurantRevenue,
        });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}