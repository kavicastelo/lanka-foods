import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { requireAuth } from "../../shared/auth.ts";

export default async function (req) {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireAuth(base44);

        const body = await req.json();
        const {
            business_name,
            owner_name,
            email,
            phone,
            city,
            address,
            business_type,
            cuisine,
            description,
            pickup,
            delivery,
            logo_url,
            cover_url,
        } = body;

        if (!business_name || !owner_name || !email) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- Prevent duplicate active applications ---
        const existing = await base44.asServiceRole.entities.RestaurantApplication.filter({
            applicant_user_id: user.id,
            status: "pending",
        });
        if (existing.length > 0) {
            return Response.json(
                { error: "You already have a pending application" },
                { status: 400 }
            );
        }

        // --- Create application (user-scoped — RLS create allows applicant_user_id == user.id) ---
        const application = await base44.entities.RestaurantApplication.create({
            business_name,
            owner_name,
            email,
            phone: phone || "",
            city: city || "",
            address: address || "",
            business_type: business_type || "",
            cuisine: cuisine || "",
            description: description || "",
            pickup: pickup ?? true,
            delivery: delivery ?? true,
            logo_url: logo_url || "",
            cover_url: cover_url || "",
            status: "pending",
            submitted_date: new Date().toISOString().slice(0, 10),
            applicant_user_id: user.id, // server-derived from session
        });

        return Response.json({ application });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}