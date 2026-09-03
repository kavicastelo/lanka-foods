import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useActiveRestaurants } from "@/hooks/useMarketplaceData";
import { cities } from "@/lib/constants";
import RestaurantCard from "@/components/RestaurantCard";
import { cn } from "@/lib/utils";

const sortOptions = [
    { id: "recommended", label: "Recommended" },
    { id: "rating", label: "Rating" },
    { id: "popular", label: "Most Popular" },
    { id: "fastest", label: "Fastest" },
    { id: "newest", label: "Newest" },
];

export default function Restaurants() {
    const { data: restaurants = [], isLoading } = useActiveRestaurants();
    const [params, setParams] = useSearchParams();
    const [showFilters, setShowFilters] = useState(false);

    const q = params.get("q") || "";
    const city = params.get("city") || "";
    const cat = params.get("cat") || "";
    const sort = params.get("sort") || "recommended";

    const filters = {
        minRating: Number(params.get("rating") || 0),
        pickup: params.get("pickup") === "1",
        delivery: params.get("delivery") === "1",
        openNow: params.get("open") === "1",
        veg: params.get("veg") === "1",
        halal: params.get("halal") === "1",
        catering: params.get("catering") === "1",
    };

    const setParam = (key, val) => {
        const next = new URLSearchParams(params);
        if (val === "" || val === null) next.delete(key);
        else next.set(key, val);
        setParams(next);
    };

    const toggle = (key) => setParam(key, params.get(key) === "1" ? "" : "1");

    const filtered = useMemo(() => {
        let list = restaurants.filter((r) => {
            if (r.status !== "active") return false;
            if (q && !(`${r.name} ${(r.cuisines || []).join(" ")} ${r.description || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
            if (city && r.city !== city) return false;
            if (cat && !(r.cuisines || []).includes(cat)) return false;
            if (filters.minRating && (r.rating || 0) < filters.minRating) return false;
            if (filters.pickup && !r.pickup) return false;
            if (filters.delivery && !r.delivery) return false;
            if (filters.openNow && !r.open) return false;
            if (filters.veg && !(r.cuisines || []).includes("Vegetarian")) return false;
            if (filters.halal && !r.halal) return false;
            if (filters.catering && !r.catering) return false;
            return true;
        });
        list = [...list].sort((a, b) => {
            switch (sort) {
                case "rating": return (b.rating || 0) - (a.rating || 0);
                case "popular": return (b.reviewCount || 0) - (a.reviewCount || 0);
                case "fastest": return (a.prepTime || "").localeCompare(b.prepTime || "");
                case "newest": return new Date(b.created_date) - new Date(a.created_date);
                default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
            }
        });
        return list;
    }, [restaurants, q, city, cat, sort, JSON.stringify(filters)]);

    const activeCount = Object.values(filters).filter(Boolean).length + (city ? 1 : 0) + (cat ? 1 : 0);

    const clearAll = () => setParams(q ? `?q=${encodeURIComponent(q)}` : "");

    return (
        <div className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-6">
                <h1 className="font-display text-3xl font-600">Sri Lankan Food Near You</h1>
                <p className="mt-1 text-muted-foreground">{filtered.length} restaurants found{city ? ` in ${city}` : " across Finland"}.</p>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={q}
                    onChange={(e) => setParam("q", e.target.value)}
                    placeholder="Search restaurants or dishes"
                    className="w-full rounded-full border border-border bg-card py-3 pl-12 pr-4 text-sm outline-none focus:border-primary"
                />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                <button
                    onClick={() => setShowFilters((s) => !s)}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-600 hover:border-primary"
                >
                    <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">{activeCount}</span>}
                </button>
                <select value={city} onChange={(e) => setParam("city", e.target.value)} className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-600 outline-none">
                    <option value="">All locations</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sort} onChange={(e) => setParam("sort", e.target.value)} className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-600 outline-none">
                    {sortOptions.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
                </select>
                {["pickup", "delivery", "open", "veg", "halal", "catering"].map((f) => (
                    <button
                        key={f}
                        onClick={() => toggle(f)}
                        className={cn(
                            "shrink-0 rounded-full border px-4 py-2 text-sm font-600 capitalize transition",
                            params.get(f) === "1" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"
                        )}
                    >
                        {f === "open" ? "Open now" : f === "veg" ? "Vegetarian" : f}
                    </button>
                ))}
                {activeCount > 0 && (
                    <button onClick={clearAll} className="shrink-0 rounded-full px-3 py-2 text-sm font-600 text-primary hover:underline">Clear all</button>
                )}
            </div>

            {showFilters && (
                <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Minimum rating</label>
                        <div className="mt-2 flex gap-2">
                            {[0, 4, 4.5, 4.8].map((r) => (
                                <button key={r} onClick={() => setParam("rating", r || "")} className={cn("rounded-full border px-3 py-1.5 text-sm font-600", filters.minRating === r ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                                    {r === 0 ? "Any" : `${r}+`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-600 uppercase tracking-wide text-muted-foreground">Category</label>
                        <select value={cat} onChange={(e) => setParam("cat", e.target.value)} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none">
                            <option value="">All cuisines</option>
                            {["Rice & Curry", "Kottu", "Hoppers", "Short Eats", "Biriyani", "Seafood", "Vegetarian", "Desserts", "Cakes", "Snacks", "Catering"].map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            )}

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading && <p className="text-muted-foreground">Loading restaurants…</p>}
                {filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
            </div>
            {filtered.length === 0 && !isLoading && (
                <div className="mt-16 text-center">
                    <p className="text-lg font-600">No restaurants match your filters.</p>
                    <button onClick={clearAll} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-700 text-primary-foreground">Clear filters</button>
                </div>
            )}
        </div>
    );
}