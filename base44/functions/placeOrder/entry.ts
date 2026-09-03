import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const {
            restaurantId,
            items,
            deliveryType,
            scheduledDate,
            scheduledTime,
            deliveryAddress,
            instructions,
            paymentMethod,
        } = body;

        // --- Input validation ---
        if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!["pickup", "delivery"].includes(deliveryType)) {
            return Response.json({ error: "Invalid delivery type" }, { status: 400 });
        }

        // --- Fetch restaurant (service role for full record) ---
        const restaurant = await base44.asServiceRole.entities.Restaurant.get(restaurantId);
        if (!restaurant) {
            return Response.json({ error: "Restaurant not found" }, { status: 404 });
        }
        if (restaurant.status !== "active") {
            return Response.json({ error: "Restaurant is not currently accepting orders" }, { status: 400 });
        }
        if (!restaurant.is_open) {
            return Response.json({ error: "Restaurant is currently closed" }, { status: 400 });
        }

        // --- Validate delivery type supported ---
        if (deliveryType === "delivery" && !restaurant.delivery) {
            return Response.json({ error: "Restaurant does not offer delivery" }, { status: 400 });
        }
        if (deliveryType === "pickup" && !restaurant.pickup) {
            return Response.json({ error: "Restaurant does not offer pickup" }, { status: 400 });
        }
        if (deliveryType === "delivery" && !deliveryAddress) {
            return Response.json({ error: "Delivery address required" }, { status: 400 });
        }

        // --- Fetch all menu items for this restaurant (service role) ---
        const allMenuItems = await base44.asServiceRole.entities.MenuItem.filter({
            restaurant_id: restaurantId,
        });
        const menuItemMap = {};
        allMenuItems.forEach((mi) => {
            menuItemMap[mi.id] = mi;
        });

        // --- Validate items and compute subtotal server-side ---
        let subtotal = 0;
        const orderItems = [];

        for (const reqItem of items) {
            const { menuItemId, quantity, instructions: itemInstructions } = reqItem;
            if (!menuItemId || !quantity || quantity < 1) {
                return Response.json({ error: "Invalid item in order" }, { status: 400 });
            }
            const menuItem = menuItemMap[menuItemId];
            if (!menuItem) {
                return Response.json({ error: `Menu item not found: ${menuItemId}` }, { status: 400 });
            }
            if (menuItem.restaurant_id !== restaurantId) {
                return Response.json(
                    { error: `Menu item does not belong to this restaurant: ${menuItemId}` },
                    { status: 400 }
                );
            }
            if (!menuItem.is_available) {
                return Response.json({ error: `Menu item not available: ${menuItem.name}` }, { status: 400 });
            }

            const lineTotal = menuItem.price * quantity;
            subtotal += lineTotal;

            orderItems.push({
                menu_item_id: menuItemId,
                name: menuItem.name, // snapshot
                price: menuItem.price, // server-verified snapshot
                quantity,
                instructions: itemInstructions || "",
                customer_id: user.id,
                restaurant_id: restaurantId,
            });
        }

        // --- Calculate fees server-side ---
        const deliveryFee = deliveryType === "delivery" ? restaurant.delivery_fee || 0 : 0;
        const serviceFee = 0.99; // platform service fee
        const total = subtotal + deliveryFee + serviceFee;

        // --- Enforce minimum order ---
        if (restaurant.min_order && subtotal < restaurant.min_order) {
            return Response.json(
                { error: `Order does not meet minimum of €${restaurant.min_order}` },
                { status: 400 }
            );
        }

        // --- Generate order number server-side ---
        const existingOrders = await base44.asServiceRole.entities.Order.list();
        const orderNumber = "LE-" + (10234 + existingOrders.length + 1);

        // --- Create order (user-scoped — RLS create allows customer_id == user.id) ---
        const order = await base44.entities.Order.create({
            order_number: orderNumber,
            restaurant_id: restaurantId,
            customer_id: user.id, // server-derived from session
            customer_name: user.full_name || user.email,
            customer_phone: user.phone || user.data?.phone || "",
            customer_email: user.email,
            delivery_type: deliveryType,
            status: "received", // initial status
            subtotal,
            delivery_fee: deliveryFee,
            service_fee: serviceFee,
            total,
            scheduled_date: scheduledDate || "",
            scheduled_time: scheduledTime || "",
            delivery_address: deliveryAddress || "",
            instructions: instructions || "",
            payment_method: paymentMethod || "pickup",
            payment_status: "pending", // no payment processing
            placed_at: new Date().toISOString(),
        });

        // --- Create order items (user-scoped — RLS create allows customer_id == user.id) ---
        const createdItems = await base44.entities.OrderItem.bulkCreate(
            orderItems.map((oi) => ({ ...oi, order_id: order.id }))
        );

        return Response.json({ order, orderItems: createdItems });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}