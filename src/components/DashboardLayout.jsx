import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, LogOut, ExternalLink } from "lucide-react";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";
import { authApi } from "@/api/authApi";
import NotificationCenter from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ nav, active, onNavigate, title, subtitle = null, actions = null, children = null }) {
    const { user } = useMarketplaceUser();

    const handleLogout = () => {
        authApi.logout();
        window.location.href = "/";
    };

    const displayName = user?.user?.fullName || user?.user?.email || "User";

    return (
        <div className="min-h-screen bg-secondary/30">
            <div className="mx-auto flex max-w-7xl">
                <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
                    <Link to="/" className="mb-6 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white shadow-warm">
                            <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        <div className="leading-none">
                            <span className="font-display text-lg font-600 tracking-tight">LankaEats</span>
                            <span className="ml-1 text-[10px] font-600 uppercase tracking-widest text-primary">Panel</span>
                        </div>
                    </Link>
                    <nav className="flex-1 space-y-1">
                        {nav.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => onNavigate(n.id)}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-600 transition",
                                    active === n.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                                )}
                            >
                                <n.icon className="h-4 w-4" /> {n.label}
                            </button>
                        ))}
                    </nav>
                    <div className="mt-auto border-t border-border pt-3">
                        <div className="rounded-xl bg-secondary/60 p-3">
                            <div className="text-sm font-700">{displayName}</div>
                            <div className="text-[11px] text-muted-foreground">{user?.email}</div>
                        </div>
                        <Link to="/" className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-600 text-muted-foreground hover:bg-secondary">
                            <ExternalLink className="h-3.5 w-3.5" /> View marketplace
                        </Link>
                        <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-600 text-destructive hover:bg-destructive/10">
                            <LogOut className="h-3.5 w-3.5" /> Logout
                        </button>
                    </div>
                </aside>

                <div className="min-w-0 flex-1">
                    <header className="border-b border-border bg-card px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="font-display text-xl font-700">{title}</h1>
                                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <NotificationCenter />
                                {actions}
                            </div>
                        </div>
                    </header>
                    <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 no-scrollbar lg:hidden">
                        {nav.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => onNavigate(n.id)}
                                className={cn(
                                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-600 transition",
                                    active === n.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                                )}
                            >
                                <n.icon className="h-3.5 w-3.5" /> {n.label}
                            </button>
                        ))}
                    </div>
                    <main className="p-6">{children}</main>
                </div>
            </div>
        </div>
    );
}