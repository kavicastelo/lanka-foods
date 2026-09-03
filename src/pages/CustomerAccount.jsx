import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Heart, Star, User, ArrowRight } from "lucide-react";
import { useMyOrders, useMyReviews, useFavorites, useActiveRestaurants } from "@/hooks/useMarketplaceData";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";
import { menuApi } from "@/api/menuApi";
import StarRating from "@/components/StarRating";
import RestaurantCard from "@/components/RestaurantCard";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const tabs = [
    { id: "orders", label: "My Orders", icon: Package },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "profile", label: "Profile", icon: User },
];

const statusBadge = {
    received: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    preparing: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    out_for_delivery: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    rejected: "bg-red-100 text-red-700",
};

export default function CustomerAccount() {
    const { data: orders = [] } = useMyOrders();
    const { data: myReviews = [] } = useMyReviews();
    const { favoriteRestaurants, favoriteItems, toggleFavoriteItem } = useFavorites();
    const { data: restaurants = [] } = useActiveRestaurants();
    const { user } = useMarketplaceUser();
    const [tab, setTab] = useState("orders");
    const [favMenuItems, setFavMenuItems] = useState([]);

    const displayName = user?.user?.fullName || user?.user?.email || "User";
    const userPhone = user?.phone || user?.data?.phone || "";

    const favRestaurants = restaurants.filter((r) => favoriteRestaurants.includes(r.id));

    // Fetch favorite menu items
    React.useEffect(() => {
        if (favoriteItems.length === 0) {
            setFavMenuItems([]);
            return;
        }
        Promise.all(favoriteItems.map((id) => menuApi.getMenuItemById(id).catch(() => null)))
            .then((items) => setFavMenuItems(items.filter(Boolean)));
    }, [favoriteItems.join(",")]);

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-spice-gradient font-display text-2xl font-700 text-white shadow-warm">{displayName.slice(0, 2).toUpperCase()}</div>
                <div>
                    <h1 className="font-display text-2xl font-600">{displayName}</h1>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar border-b border-border">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn("flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-600 transition", tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    >
                        <t.icon className="h-4 w-4" /> {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {tab === "orders" && (
                    <div className="space-y-4">
                        {orders.length === 0 && <Empty text="No orders yet." />}
                        {orders.map((o) => {
                            const r = restaurants.find((x) => x.id === o.restaurantId) || {};
                            return (
                                <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-spice-gradient font-display font-700 text-white">{r?.logoText || "RE"}</div>
                                            <div>
                                                <div className="font-700">{r?.name || "Restaurant"}</div>
                                                <div className="text-xs text-muted-foreground">#{o.order_number} · {o.scheduled_date} · {o.scheduled_time}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("rounded-full px-3 py-1 text-xs font-700 capitalize", statusBadge[o.status])}>{o.status.replace(/_/g, " ")}</span>
                                            <span className="font-display text-lg font-700">€{(o.total || 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 text-sm text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</div>
                                    <div className="mt-4 flex gap-2">
                                        <Link to={`/order/${o.id}`} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-700 text-primary-foreground">Track order <ArrowRight className="h-3.5 w-3.5" /></Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === "favorites" && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="font-display text-lg font-600">Favorite restaurants</h3>
                            {favRestaurants.length === 0 ? <Empty text="No favorite restaurants yet." /> : (
                                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{favRestaurants.map((r) => <RestaurantCard key={r.id} restaurant={r} />)}</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-display text-lg font-600">Favorite dishes</h3>
                            {favMenuItems.length === 0 ? <Empty text="No favorite dishes yet. Tap the heart on any menu item." /> : (
                                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {favMenuItems.map((i) => {
                                        const r = restaurants.find((x) => x.id === i.restaurant_id);
                                        return (
                                            <div key={i.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3">
                                                <Image src={i.image_url} alt={i.name} fittingType="fill" className="h-16 w-16 rounded-xl" />
                                                <div className="flex-1">
                                                    <div className="font-600 text-sm">{i.name}</div>
                                                    <div className="text-xs text-muted-foreground">{r?.name}</div>
                                                    <div className="mt-1 flex items-center justify-between">
                                                        <span className="font-700 text-primary">€{i.price.toFixed(2)}</span>
                                                        <button onClick={() => toggleFavoriteItem(i.id)} className="text-muted-foreground hover:text-destructive"><Heart className="h-4 w-4 fill-primary text-primary" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === "reviews" && (
                    <div className="space-y-4">
                        {myReviews.length === 0 && <Empty text="You haven't submitted any reviews yet." />}
                        {myReviews.map((r) => {
                            const rest = restaurants.find((x) => x.id === r.restaurantId);
                            return (
                                <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                                    <div className="flex items-center justify-between">
                                        <Link to={`/restaurant/${rest?.slug}`} className="font-700">{rest?.name}</Link>
                                        <StarRating value={r.rating} size={14} />
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">"{r.text}"</p>
                                    <div className="mt-2 text-xs text-muted-foreground">{r.date}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === "profile" && (
                    <div className="max-w-xl space-y-5">
                        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
                            <ProfileField label="Full name" value={displayName} />
                            <ProfileField label="Phone" value={userPhone || "—"} />
                            <ProfileField label="Email" value={user?.email || "—"} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Empty({ text }) { return <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{text}</div>; }
function ProfileField({ label, value }) {
    return (
        <div>
            <div className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 font-600">{value}</div>
        </div>
    );
}