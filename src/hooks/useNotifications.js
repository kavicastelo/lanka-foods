import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notificationsApi";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useNotifications() {
    const queryClient = useQueryClient();
    const { user } = useMarketplaceUser();
    const seenNotificationIdsRef = useRef(new Set());
    const isFirstLoadRef = useRef(true);

    const userId = user?.id || user?.user?.id;

    const query = useQuery({
        queryKey: ["notifications", userId],
        queryFn: async () => {
            if (!user) return { notifications: [], unreadCount: 0 };
            return await notificationsApi.getNotifications();
        },
        enabled: Boolean(user),
        refetchInterval: 8000, // Poll every 8s for live notifications
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
                // Perform PWA Web Push subscription with VAPID key for background notifications
                if ("serviceWorker" in navigator) {
                    const reg = await navigator.serviceWorker.ready.catch(() => null);
                    if (reg && reg.pushManager) {
                        try {
                            const vapidPublicKey = await notificationsApi.getVapidPublicKey();
                            if (vapidPublicKey) {
                                const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
                                let sub = await reg.pushManager.getSubscription();
                                if (!sub) {
                                    sub = await reg.pushManager.subscribe({
                                        userVisibleOnly: true,
                                        applicationServerKey,
                                    });
                                }
                                const subJson = sub.toJSON();
                                if (subJson.endpoint && subJson.keys) {
                                    await notificationsApi.subscribePush({
                                        endpoint: subJson.endpoint,
                                        keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
                                        userAgent: navigator.userAgent,
                                    });
                                }
                            }
                        } catch (err) {
                            console.warn("Web Push Subscription failed:", err);
                        }
                    }
                }

                // Send test notification to confirm browser setup
                new Notification("LankaEats Notifications Enabled!", {
                    body: "You will now receive notifications even when LankaEats is in the background or closed.",
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

    // Auto-sync existing push subscription when authenticated user loads app
    useEffect(() => {
        if (!user || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        const syncExistingPushSubscription = async () => {
            if (!("serviceWorker" in navigator)) return;
            const reg = await navigator.serviceWorker.ready.catch(() => null);
            if (!reg || !reg.pushManager) return;

            try {
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
            } catch (err) {
                console.warn("Background push auto-sync failed:", err);
            }
        };

        syncExistingPushSubscription();
    }, [user]);

    const sendTestPush = async () => {
        try {
            return await notificationsApi.sendTestPush();
        } catch (err) {
            console.error("Failed to trigger test push notification:", err);
            throw err;
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
        sendTestPush,
        permissionStatus: typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
    };
}

