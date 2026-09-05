import React, { useState, useEffect } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PwaUpdatePrompt() {
    const [waitingWorker, setWaitingWorker] = useState(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        // 1. Listen for controlling Service Worker changes to reload page cleanly
        let refreshing = false;
        const handleControllerChange = () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        };
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        // 2. Check existing ServiceWorker registrations
        navigator.serviceWorker.getRegistration().then((reg) => {
            if (!reg) return;

            // If a worker is already waiting to activate
            if (reg.waiting && navigator.serviceWorker.controller) {
                setWaitingWorker(reg.waiting);
                setUpdateAvailable(true);
            }

            // Listen for newly installed ServiceWorker updates
            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (!newWorker) return;

                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        setWaitingWorker(newWorker);
                        setUpdateAvailable(true);
                    }
                });
            });
        });

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }
        setUpdateAvailable(false);
    };

    const handleDismiss = () => {
        setUpdateAvailable(false);
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] mx-auto max-w-md animate-in slide-in-from-top-5 duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
                {/* Background ambient accent */}
                <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

                <div className="flex items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                        <RefreshCw className="h-5 w-5 animate-spin-slow" />
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                            <h4 className="font-display text-sm font-700 tracking-tight">App Update Available</h4>
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            A fresh update for LankaEats is ready. Update now to get the latest features and bug fixes!
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleUpdate}
                                className="bg-primary text-primary-foreground hover:opacity-90 shadow-sm font-600 rounded-xl text-xs h-8 px-3.5"
                            >
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Update Now
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDismiss}
                                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-xl"
                            >
                                Later
                            </Button>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition focus:outline-none"
                        title="Dismiss update alert"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
