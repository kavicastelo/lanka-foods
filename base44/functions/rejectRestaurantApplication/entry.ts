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

        if (application.status === "approved") {
            return Response.json({ error: "Application already approved" }, { status: 400 });
        }

        const updated = await base44.asServiceRole.entities.RestaurantApplication.update(
            applicationId,
            { status: "rejected" }
        );

        return Response.json({ application: updated });
    } catch (error) {
        const status = error.status || 500;
        return Response.json({ error: error.message }, { status });
    }
}