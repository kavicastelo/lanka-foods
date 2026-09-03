import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth, requireAdmin } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);
        requireAdmin(user);

        const body = await req.json();
        const { applicationId } = body;

        if (!applicationId) {
            return Response.json({ error: "Missing applicationId" }, { status: 400 });
        }

        const application = await base44.asServiceRole.entities.RestaurantApplication.get(
            applicationId
        );
        if (!application) {
            return Response.json({ error: "Application not found" }, { status: 404 });
        }

        // --- Idempotency: if already approved, return existing restaurant ---
        if (application.status === "approved") {
            const slug = application.business_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
            const existing = await base44.asServiceRole.entities.Restaurant.filter({ slug });
            if (existing.length > 0) {
                return Response.json({
                    restaurant: existing[0],
                    application,
                    message: "Already approved",
                });
            }
            return Response.json({ application, message: "Approved but restaurant not found" });
        }

        if (application.status !== "pending" && application.status !== "changes_requested") {
            return Response.json(
                { error: `Application is ${application.status}, cannot approve` },
                { status: 400 }
            );
        }

        // --- Generate slug ---
        const slug = application.business_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // --- Check for existing restaurant with this slug (partial-failure recovery) ---
        const existingRestaurants = await base44.asServiceRole.entities.Restaurant.filter({
            slug,
        });
        let restaurant;

        if (existingRestaurants.length > 0) {
            restaurant = existingRestaurants[0];
            // Ensure owner_id is correct
            if (restaurant.owner_id !== application.applicant_user_id) {
                restaurant = await base44.asServiceRole.entities.Restaurant.update(restaurant.id, {
                    owner_id: application.applicant_user_id,
                    status: "active",
                });
            }
        } else {
            // --- Create restaurant ---
            restaurant = await base44.asServiceRole.entities.Restaurant.create({
                name: application.business_name,
                slug,
                owner_id: application.applicant_user_id, // server-set, not client
                city: application.city || "Helsinki",
                address: application.address || "",
                phone: application.phone || "",
                email: application.email || "",
                description: application.description || "",
                cuisines: application.cuisine
                    ? application.cuisine.split(",").map((s) => s.trim()).filter(Boolean)
                    : [],
                price_range: "€€",
                prep_time: "20-30 min",
                min_order: 15,
                pickup: application.pickup ?? true,
                delivery: application.delivery ?? true,
                is_open: true,
                hours: "11:00 - 21:00",
                time_slots: ["11:00", "12:00", "17:00", "18:00", "19:00"],
                status: "active",
                featured: false,
                logo_text: application.business_name.slice(0, 2).toUpperCase(),
                cover_image_url: application.cover_url || "",
            });
        }

        // --- Link user to restaurant (set restaurant_id on user profile) ---
        try {
            await base44.asServiceRole.entities.User.update(application.applicant_user_id, {
                restaurant_id: restaurant.id,
            });
        } catch (e) {
            // Log but don't fail — restaurant is created, user can be linked on retry
            console.error("Failed to update user restaurant_id:", e.message);
        }

        // --- Mark application as approved ---
        await base44.asServiceRole.entities.RestaurantApplication.update(applicationId, {
            status: "approved",
        });

        return Response.json({ restaurant, application, message: "Approved successfully" });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}