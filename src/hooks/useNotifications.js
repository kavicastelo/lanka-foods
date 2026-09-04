import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notificationsApi";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";

export function useNotifications() {
    const queryClient = useQueryClient();
    const { user } = useMarketplaceUser();
    const seenNotificationIdsRef = useRef(new Set());
    const isFirstLoadRef = useRef(true);

    const query = useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            if (!user) return { notifications: [], unreadCount: 0 };
            return await notificationsApi.getNotifications();
        },
        enabled: Boolean(user),
        refetchInterval: 10000, // Poll every 10s for web & PWA live updates
    });

    const notifications = query.data?.notifications || [];

    // Trigger Native Browser Desktop Toast Notification when new unread notification arrives
    useEffect(() => {
        if (!notifications || notifications.length === 0) return;

        // On initial load, record existing IDs without triggering popups for historical notifications
        if (isFirstLoadRef.current) {
            notifications.forEach((n) => {
                const id = n._id || n.id;
                if (id) seenNotificationIdsRef.current.add(id);
            });
            isFirstLoadRef.current = false;
            return;
        }

        // For subsequent polling cycles, detect new incoming unread notifications
        notifications.forEach((n) => {
            const id = n._id || n.id;
            if (id && !seenNotificationIdsRef.current.has(id)) {
                seenNotificationIdsRef.current.add(id);

                if (!n.isRead && "Notification" in window && Notification.permission === "granted") {
                    try {
                        const notifPopup = new Notification(n.title || "LankaEats Notification", {
                            body: n.message || "",
                            icon: "/favicon.ico",
                            tag: id,
                        });
                        notifPopup.onclick = () => {
                            window.focus();
                            if (n.link) {
                                window.location.href = n.link;
                            }
                        };
                    } catch (e) {
                        console.warn("Desktop notification trigger failed:", e);
                    }
                }
            }
        });
    }, [notifications]);

    const markAsRead = useMutation({
        mutationFn: async (id) => {
            return await notificationsApi.markAsRead(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            return await notificationsApi.markAllAsRead();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const requestPushPermission = async () => {
        if (!("Notification" in window)) {
            console.warn("Web Notifications are not supported by this browser.");
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                // If serviceWorker is registered, also register PWA Push subscription
                if ("serviceWorker" in navigator) {
                    const reg = await navigator.serviceWorker.ready.catch(() => null);
                    if (reg && reg.pushManager) {
                        const sub = await reg.pushManager.getSubscription();
                        if (sub) {
                            const subJson = sub.toJSON();
                            if (subJson.endpoint && subJson.keys) {
                                await notificationsApi.subscribePush({
                                    endpoint: subJson.endpoint,
                                    keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
                                    userAgent: navigator.userAgent,
                                });
                            }
                        }
                    }
                }

                // Send test notification to confirm browser setup
                new Notification("LankaEats Notifications Enabled!", {
                    body: "You will now receive desktop notifications for order updates and alerts.",
                    icon: "/favicon.ico",
                });
                return true;
            }
            return false;
        } catch (err) {
            console.error("Failed to enable notifications:", err);
            return false;
        }
    };

    return {
        notifications,
        unreadCount: query.data?.unreadCount || 0,
        isLoading: query.isLoading,
        markAsRead: markAsRead.mutate,
        markAllAsRead: markAllAsRead.mutate,
        isMarkingRead: markAsRead.isPending || markAllAsRead.isPending,
        requestPushPermission,
        permissionStatus: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
    };
}
