import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, PackageCheck, ShoppingBag, FileText, CreditCard, Store, AlertCircle, Star, Sparkles } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const { notifications, unreadCount, markAsRead, markAllAsRead, isMarkingRead, requestPushPermission, sendTestPush, permissionStatus } = useNotifications();
    const [sendingTest, setSendingTest] = useState(false);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleItemClick = (n) => {
        if (!n.isRead) {
            markAsRead(n._id || n.id);
        }
        setOpen(false);
        if (n.link) {
            navigate(n.link);
        }
    };

    const handleEnablePush = async () => {
        const granted = await requestPushPermission();
        if (granted) {
            // Permission granted
        }
    };

    const handleSendTestPush = async () => {
        try {
            setSendingTest(true);
            await sendTestPush();
        } catch (e) {
            console.error("Test push error:", e);
        } finally {
            setSendingTest(false);
        }
    };


    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-primary focus:outline-none"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-700 text-primary-foreground shadow-xs animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute -right-2 sm:right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3">

                    <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-display text-base font-700">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-700 text-primary">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                disabled={isMarkingRead}
                                className="flex items-center gap-1 text-xs font-600 text-primary hover:underline disabled:opacity-50"
                            >
                                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 no-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                <Bell className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id || n.id}
                                    onClick={() => handleItemClick(n)}
                                    className={cn(
                                        "flex items-start gap-3 rounded-xl p-3 text-left transition cursor-pointer hover:bg-secondary/60",
                                        !n.isRead ? "bg-primary/5 font-500" : "bg-card"
                                    )}
                                >
                                    <div className="mt-0.5">
                                        <NotificationIcon type={n.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-700 truncate">{n.title}</span>
                                            <span className="text-[10px] text-muted-foreground shrink-0">{formatTimeAgo(n.createdAt)}</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
                                    </div>
                                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-border pt-2 flex justify-between items-center text-[11px] text-muted-foreground">
                        {permissionStatus === "granted" ? (
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-600 dark:text-emerald-400 font-600 flex items-center gap-1">
                                    ✓ Desktop Alerts Active
                                </span>
                                <button
                                    onClick={handleSendTestPush}
                                    disabled={sendingTest}
                                    className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary font-600 px-2 py-0.5 rounded-full transition disabled:opacity-50"
                                >
                                    {sendingTest ? "Sending..." : "Test Push"}
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleEnablePush} className="hover:text-primary underline font-600">
                                Enable Desktop Alerts
                            </button>
                        )}
                        <span>LankaEats Live</span>
                    </div>
                </div>
            )}
        </div>
    );
}


function NotificationIcon({ type }) {
    switch (type) {
        case "ORDER_STATUS":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700"><PackageCheck className="h-4 w-4" /></div>;
        case "NEW_ORDER":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-green-100 text-green-700"><ShoppingBag className="h-4 w-4" /></div>;
        case "INVOICE_ISSUED":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-purple-100 text-purple-700"><FileText className="h-4 w-4" /></div>;
        case "PAYMENT_SLIP_UPLOADED":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700"><CreditCard className="h-4 w-4" /></div>;
        case "APPLICATION_APPROVED":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-green-100 text-green-700"><Store className="h-4 w-4" /></div>;
        case "APPLICATION_REJECTED":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-red-100 text-red-700"><AlertCircle className="h-4 w-4" /></div>;
        case "NEW_REVIEW":
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700"><Star className="h-4 w-4" /></div>;
        default:
            return <div className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-foreground"><Sparkles className="h-4 w-4" /></div>;
    }
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
