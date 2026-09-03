import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowRight, Store, Bike, Star, TrendingUp } from "lucide-react";
import { useActiveRestaurants, useGlobalCategories } from "@/hooks/useMarketplaceData";
import { IMG, cities } from "@/lib/constants";
import RestaurantCard from "@/components/RestaurantCard";
import { Image } from "@/components/ui/image";

export default function Home() {
    const { data: restaurants = [], isLoading } = useActiveRestaurants();
    const { data: categories = [] } = useGlobalCategories();
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [city, setCity] = useState("Helsinki");

    const featured = restaurants.filter((r) => r.featured && r.status === "active");

    const explore = (e) => {
        e.preventDefault();
        navigate(`/restaurants${q || city !== "Helsinki" ? `?q=${encodeURIComponent(q)}&city=${city}` : ""}`);
    };

    return (
        <div>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0">
                    <Image src={IMG.hero} alt="Sri Lankan food" fittingType="fill" className="h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
                </div>
                <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-600 uppercase tracking-widest text-white backdrop-blur">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Authentic · Local · Fresh
                        </span>
                        <h1 className="mt-5 font-display text-4xl font-600 leading-[1.05] text-white text-balance sm:text-5xl lg:text-6xl">
                            Discover the taste of Asia
                        </h1>
                        <p className="mt-5 max-w-xl text-lg text-white/85">
                            Find Sri Lankan restaurants, home chefs and food stores near you. Browse menus, order online and enjoy authentic Sri Lankan food.
                        </p>

                        <form onSubmit={explore} className="mt-8 rounded-2xl bg-white p-2 shadow-2xl sm:flex sm:items-center">
                            <div className="flex items-center gap-2 border-b border-border px-3 py-2 sm:border-b-0 sm:border-r">
                                <MapPin className="h-5 w-5 text-primary" />
                                <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-transparent text-sm font-600 outline-none">
                                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-1 items-center gap-2 px-3 py-2">
                                <Search className="h-5 w-5 text-muted-foreground" />
                                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search restaurants or dishes" className="w-full bg-transparent text-sm outline-none" />
                            </div>
                            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-spice-gradient px-6 py-3 text-sm font-700 text-white shadow-warm transition hover:opacity-95 sm:w-auto">
                                Explore Food <ArrowRight className="h-4 w-4" />
                            </button>
                        </form>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to="/restaurants" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-600 text-white backdrop-blur transition hover:bg-white/20">
                                Explore Food
                            </Link>
                            <Link to="/partner" className="rounded-full bg-white px-5 py-2.5 text-sm font-700 text-primary transition hover:bg-white/90">
                                List Your Food Business
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats strip */}
            <section className="border-b border-border bg-card">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-8 sm:grid-cols-4">
                    <Stat icon={Store} value={`${restaurants.length}+`} label="Food businesses" />
                    <Stat icon={Bike} value="2 cities" label="Delivery areas" />
                    <Stat icon={Star} value="4.7★" label="Average rating" />
                    <Stat icon={TrendingUp} value="1,200+" label="Orders delivered" />
                </div>
            </section>

            {/* Categories */}
            <section className="mx-auto max-w-7xl px-6 py-16">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="font-display text-3xl font-600">Browse by category</h2>
                        <p className="mt-1 text-muted-foreground">From rice & curry to kottu, hoppers and sweets.</p>
                    </div>
                    <Link to="/restaurants" className="hidden text-sm font-600 text-primary hover:underline sm:block">View all</Link>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {categories.map((c) => (
                        <Link
                            key={c.id}
                            to={`/restaurants?cat=${c.name}`}
                            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-warm"
                        >
                            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-spice-gradient/10 text-2xl transition group-hover:scale-110">
                                {c.image_url}
                            </div>
                            <div>
                                <div className="text-sm font-600">{c.name}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Featured */}
            <section className="mx-auto max-w-7xl px-6 pb-16">
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="font-display text-3xl font-600">Featured restaurants</h2>
                        <p className="mt-1 text-muted-foreground">Hand-picked Sri Lankan favourites loved by the community.</p>
                    </div>
                    <Link to="/restaurants" className="hidden text-sm font-600 text-primary hover:underline sm:block">See all restaurants</Link>
                </div>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {isLoading && <p className="text-muted-foreground">Loading restaurants…</p>}
                    {featured.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}
                </div>
            </section>

            {/* Partner CTA */}
            <section className="mx-auto max-w-7xl px-6 pb-20">
                <div className="relative overflow-hidden rounded-3xl bg-spice-gradient px-8 py-14 text-white sm:px-14">
                    <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                    <div className="absolute -bottom-16 right-24 h-56 w-56 rounded-full bg-white/10" />
                    <div className="relative max-w-xl">
                        <h2 className="font-display text-3xl font-600 sm:text-4xl">Run a Sri Lankan food business in Finland?</h2>
                        <p className="mt-3 text-white/90">Join LankaEats and get your own online store, reach more customers and manage orders from one dashboard.</p>
                        <Link to="/partner" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-700 text-primary transition hover:bg-white/90">
                            List Your Food Business <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Stat({ icon: Icon, value, label }) {
    return (
        <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <div className="font-display text-xl font-700">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}