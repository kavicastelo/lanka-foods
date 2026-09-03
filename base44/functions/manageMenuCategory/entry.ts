import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, verifyRestaurantOwnership } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const { action, restaurantId, categoryId, name, sortOrder } = body;

        if (!action || !restaurantId) {
            return Response.json({ error: "Missing action or restaurantId" }, { status: 400 });
        }

        // --- Verify ownership (throws if not owner or admin) ---
        await verifyRestaurantOwnership(base44, restaurantId, user);

        if (action === "create") {
            if (!name) {
                return Response.json({ error: "Missing category name" }, { status: 400 });
            }
            const category = await base44.asServiceRole.entities.MenuCategory.create({
                restaurant_id: restaurantId,
                name,
                sort_order: sortOrder || 0,
            });
            return Response.json({ category });
        }

        if (action === "update") {
            if (!categoryId) {
                return Response.json({ error: "Missing categoryId" }, { status: 400 });
            }
            const category = await base44.asServiceRole.entities.MenuCategory.get(categoryId);
            if (!category || category.restaurant_id !== restaurantId) {
                return Response.json({ error: "Category not found or wrong restaurant" }, { status: 404 });
            }
            const patch = {};
            if (name) patch.name = name;
            if (typeof sortOrder === "number") patch.sort_order = sortOrder;
            const updated = await base44.asServiceRole.entities.MenuCategory.update(categoryId, patch);
            return Response.json({ category: updated });
        }

        if (action === "delete") {
            if (!categoryId) {
                return Response.json({ error: "Missing categoryId" }, { status: 400 });
            }
            const category = await base44.asServiceRole.entities.MenuCategory.get(categoryId);
            if (!category || category.restaurant_id !== restaurantId) {
                return Response.json({ error: "Category not found or wrong restaurant" }, { status: 404 });
            }
            // Delete menu items in this category first
            const items = await base44.asServiceRole.entities.MenuItem.filter({
                category_id: categoryId,
            });
            if (items.length > 0) {
                await base44.asServiceRole.entities.MenuItem.deleteMany({
                    category_id: categoryId,
                });
            }
            await base44.asServiceRole.entities.MenuCategory.delete(categoryId);
            return Response.json({ deleted: true });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}