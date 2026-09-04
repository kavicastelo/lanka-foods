import React, { useState, useEffect } from "react";
import { Download, X, UtensilsCrossed, Share, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "lankaeats_pwa_banner_dismissed_until";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // 1. Check if already installed / running in standalone mode
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
        if (isStandalone) {
            return;
        }

        // 2. Check 24-hour dismissal timestamp in localStorage
        const checkDismissal = () => {
            const dismissedUntil = localStorage.getItem(DISMISS_KEY);
            if (dismissedUntil) {
                const timestamp = parseInt(dismissedUntil, 10);
                if (!isNaN(timestamp) && Date.now() < timestamp) {
                    return true; // Still within 24-hour dismissal period
                }
            }
            return false; // Dismissal expired or never dismissed
        };

        if (checkDismissal()) {
            return;
        }

        // 3. Detect iOS browser
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIos(isIosDevice);

        if (isIosDevice) {
            // iOS Safari does not fire beforeinstallprompt event
            setVisible(true);
        }

        // 4. Listen for Chrome/Edge/Android beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            if (!checkDismissal()) {
                setVisible(true);
            }
        };

        const handleAppInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
            localStorage.removeItem(DISMISS_KEY);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const handleDismiss = () => {
        const dismissUntil = Date.now() + DISMISS_DURATION_MS;
        localStorage.setItem(DISMISS_KEY, dismissUntil.toString());
        setVisible(false);
    };

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            localStorage.removeItem(DISMISS_KEY);
        } else {
            // If user declined the prompt, dismiss for 24h
            const dismissUntil = Date.now() + DISMISS_DURATION_MS;
            localStorage.setItem(DISMISS_KEY, dismissUntil.toString());
        }

        setDeferredPrompt(null);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-5 duration-300">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
                {/* Background decorative subtle gradient accent */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-spice-gradient opacity-15 blur-2xl pointer-events-none" />

                <div className="flex items-start gap-3.5">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-spice-gradient text-white shadow-warm">
                        <UtensilsCrossed className="h-6 w-6" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5">
                            <h4 className="font-display text-sm font-700 tracking-tight">Install LankaEats App</h4>
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            {isIos
                                ? "Tap Share below and select 'Add to Home Screen' for instant order tracking & offline access."
                                : "Get real-time order tracking, instant notifications, and faster ordering on your phone."}
                        </p>

                        {!isIos && deferredPrompt && (
                            <div className="mt-3 flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleInstallClick}
                                    className="bg-spice-gradient text-white hover:opacity-90 shadow-warm font-600 rounded-xl text-xs h-8 px-3.5"
                                >
                                    <Download className="mr-1.5 h-3.5 w-3.5" /> Install App
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDismiss}
                                    className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-xl"
                                >
                                    Not Now
                                </Button>
                            </div>
                        )}

                        {isIos && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-600 text-primary bg-primary/10 px-2.5 py-1 rounded-lg w-fit">
                                <Share className="h-3.5 w-3.5" /> Tap Share → Add to Home Screen
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition focus:outline-none"
                        title="Dismiss banner for 24 hours"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
