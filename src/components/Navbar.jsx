import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Heart, Search, Menu, X, UtensilsCrossed, LogOut, LayoutDashboard, User } from "lucide-react";
import { useMarketplace } from "@/context/MarketplaceContext";
import { useMarketplaceUser, roleHome } from "@/lib/marketplaceAuth";
import { useFavorites } from "@/hooks/useMarketplaceData";
import { authApi } from "@/api/authApi";
import { cn } from "@/lib/utils";

const guestLinks = [
    { label: "Home", to: "/" },
    { label: "Restaurants", to: "/restaurants" },
    { label: "Become a Partner", to: "/partner" },
];

import NotificationCenter from '@/components/NotificationCenter';

export default function Navbar() {
    const { cartCount } = useMarketplace();
    const { favoriteRestaurants } = useFavorites();
    const { user, marketplaceRole } = useMarketplaceUser();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = marketplaceRole === "SUPER_ADMIN" || marketplaceRole === "RESTAURANT_ADMIN";
    const links = marketplaceRole === "CUSTOMER" || !user ? guestLinks : [{ label: "Marketplace", to: "/" }];

    const submitSearch = (e) => {
        e.preventDefault();
        navigate(`/restaurants${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        setOpen(false);
    };

    const handleLogout = () => {
        authApi.logout();
        window.location.href = "/";
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white shadow-warm">
                        <UtensilsCrossed className="h-5 w-5" />
                    </div>
                    <div className="leading-none">
                        <span className="font-display text-xl font-600 tracking-tight">LankaEats</span>
                        <span className="ml-1 text-[10px] font-600 uppercase tracking-widest text-primary">Finland</span>
                    </div>
                </Link>

                {!isAdmin && (
                    <nav className="hidden items-center gap-1 lg:flex">
                        {links.map((l) => (
                            <Link key={l.label} to={l.to} className={cn("rounded-lg px-3 py-2 text-sm font-500 transition-colors hover:bg-secondary", location.pathname === l.to && "text-primary")}>
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                )}

                {!isAdmin && (
                    <form onSubmit={submitSearch} className="ml-auto hidden items-center md:flex">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants or dishes" className="w-56 rounded-full border border-border bg-secondary/50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:bg-background lg:w-72" />
                        </div>
                    </form>
                )}

                <div className={cn("flex items-center gap-1", !isAdmin && "ml-auto md:ml-2")}>
                    {isAdmin && (
                        <Link to={roleHome(marketplaceRole)} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-700 text-primary-foreground">
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                    )}

                    {!user && (
                        <>
                            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-600 hover:bg-secondary sm:block">Sign in</Link>
                            <Link to="/register" className="hidden rounded-full bg-primary px-4 py-2 text-sm font-700 text-primary-foreground sm:block">Get started</Link>
                        </>
                    )}

                    {marketplaceRole === "CUSTOMER" && (
                        <>
                            <Link to="/account" className="relative hidden rounded-full p-2.5 transition hover:bg-secondary sm:block" title="Favorites">
                                <Heart className="h-5 w-5" />
                                {favoriteRestaurants.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-700 text-primary-foreground">{favoriteRestaurants.length}</span>}
                            </Link>
                            <Link to="/account" className="hidden rounded-full p-2.5 transition hover:bg-secondary sm:block" title="My account"><User className="h-5 w-5" /></Link>
                        </>
                    )}

                    {!isAdmin && (
                        <Link to="/cart" className="relative rounded-full p-2.5 transition hover:bg-secondary" title="Cart">
                            <ShoppingBag className="h-5 w-5" />
                            {cartCount > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-700 text-primary-foreground">{cartCount}</span>}
                        </Link>
                    )}

                    {user && (
                        <button onClick={handleLogout} className="hidden items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-600 hover:border-primary sm:flex">
                            <LogOut className="h-4 w-4" /> Logout
                        </button>
                    )}

                    <button onClick={() => setOpen((o) => !o)} className="rounded-full p-2.5 transition hover:bg-secondary lg:hidden">
                        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
                    {!isAdmin && (
                        <form onSubmit={submitSearch} className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants or dishes" className="w-full rounded-full border border-border bg-secondary/50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary" />
                        </form>
                    )}
                    <div className="grid gap-1">
                        {links.map((l) => <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-500 hover:bg-secondary">{l.label}</Link>)}
                        {isAdmin && <Link to={roleHome(marketplaceRole)} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-500 hover:bg-secondary">Dashboard</Link>}
                        {marketplaceRole === "CUSTOMER" && <Link to="/account" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-500 hover:bg-secondary">My Account</Link>}
                        {!user && <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-500 hover:bg-secondary">Sign in</Link>}
                        {!user && <Link to="/register" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-500 hover:bg-secondary">Get started</Link>}
                        {user && <button onClick={() => { handleLogout(); setOpen(false); }} className="rounded-lg px-3 py-2.5 text-left text-sm font-500 text-destructive hover:bg-secondary">Logout</button>}
                    </div>
                </div>
            )}
        </header>
    );
}