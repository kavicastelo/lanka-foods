import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, verifyRestaurantOwnership } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const {
            action,
            restaurantId,
            itemId,
            categoryId,
            name,
            description,
            price,
            imageUrl,
            isVegetarian,
            isAvailable,
            isPopular,
            sortOrder,
        } = body;

        if (!action || !restaurantId) {
            return Response.json({ error: "Missing action or restaurantId" }, { status: 400 });
        }

        // --- Verify ownership (throws if not owner or admin) ---
        await verifyRestaurantOwnership(base44, restaurantId, user);

        if (action === "create") {
            if (!name || typeof price !== "number" || !categoryId) {
                return Response.json(
                    { error: "Missing name, price, or categoryId" },
                    { status: 400 }
                );
            }
            // Verify category belongs to this restaurant
            const category = await base44.asServiceRole.entities.MenuCategory.get(categoryId);
            if (!category || category.restaurant_id !== restaurantId) {
                return Response.json(
                    { error: "Category not found or wrong restaurant" },
                    { status: 404 }
                );
            }
            const item = await base44.asServiceRole.entities.MenuItem.create({
                restaurant_id: restaurantId,
                category_id: categoryId,
                name,
                description: description || "",
                price,
                image_url: imageUrl || "",
                is_vegetarian: isVegetarian || false,
                is_available: isAvailable ?? true,
                is_popular: isPopular || false,
                sort_order: sortOrder || 0,
            });
            return Response.json({ item });
        }

        if (action === "update") {
            if (!itemId) {
                return Response.json({ error: "Missing itemId" }, { status: 400 });
            }
            const item = await base44.asServiceRole.entities.MenuItem.get(itemId);
            if (!item || item.restaurant_id !== restaurantId) {
                return Response.json({ error: "Item not found or wrong restaurant" }, { status: 404 });
            }
            const patch = {};
            if (name) patch.name = name;
            if (description !== undefined) patch.description = description;
            if (typeof price === "number") patch.price = price;
            if (imageUrl !== undefined) patch.image_url = imageUrl;
            if (typeof isVegetarian === "boolean") patch.is_vegetarian = isVegetarian;
            if (typeof isAvailable === "boolean") patch.is_available = isAvailable;
            if (typeof isPopular === "boolean") patch.is_popular = isPopular;
            if (typeof sortOrder === "number") patch.sort_order = sortOrder;
            if (categoryId) {
                // Verify new category belongs to same restaurant
                const cat = await base44.asServiceRole.entities.MenuCategory.get(categoryId);
                if (!cat || cat.restaurant_id !== restaurantId) {
                    return Response.json(
                        { error: "Category not found or wrong restaurant" },
                        { status: 404 }
                    );
                }
                patch.category_id = categoryId;
            }
            const updated = await base44.asServiceRole.entities.MenuItem.update(itemId, patch);
            return Response.json({ item: updated });
        }

        if (action === "delete") {
            if (!itemId) {
                return Response.json({ error: "Missing itemId" }, { status: 400 });
            }
            const item = await base44.asServiceRole.entities.MenuItem.get(itemId);
            if (!item || item.restaurant_id !== restaurantId) {
                return Response.json({ error: "Item not found or wrong restaurant" }, { status: 404 });
            }
            await base44.asServiceRole.entities.MenuItem.delete(itemId);
            return Response.json({ deleted: true });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}