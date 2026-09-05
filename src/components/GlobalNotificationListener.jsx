import { useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/use-toast";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";

export default function GlobalNotificationListener() {
    const { user } = useMarketplaceUser();
    const { notifications } = useNotifications();
    const { toast } = useToast();
    const notifiedIdsRef = useRef(new Set());
    const isFirstRunRef = useRef(true);

    useEffect(() => {
        if (!user || !notifications || notifications.length === 0) return;

        // Skip popping up toasts for historical notifications on initial mount
        if (isFirstRunRef.current) {
            notifications.forEach((n) => {
                const id = n._id || n.id;
                if (id) notifiedIdsRef.current.add(id);
            });
            isFirstRunRef.current = false;
            return;
        }

        // Trigger live in-app Toast alert for newly arrived unread notifications
        notifications.forEach((n) => {
            const id = n._id || n.id;
            if (id && !notifiedIdsRef.current.has(id)) {
                notifiedIdsRef.current.add(id);

                if (!n.isRead) {
                    toast({
                        title: n.title || "LankaEats Alert",
                        description: n.message || "",
                    });
                }
            }
        });
    }, [user, notifications, toast]);

    return null;
}
