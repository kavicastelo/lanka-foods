import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Heart, Star, User, ArrowRight, MessageSquare } from "lucide-react";
import { useMyOrders, useMyReviews, useFavorites, useActiveRestaurants, useCreateReview } from "@/hooks/useMarketplaceData";
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
    const [selectedFeedbackOrder, setSelectedFeedbackOrder] = useState(null);

    const displayName = user?.user?.fullName || user?.user?.email || "User";
    const userPhone = user?.user?.phone || user?.data?.phone || "";

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
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <Link to={`/order/${o.id}`} className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-700 text-primary-foreground hover:opacity-90">Track order <ArrowRight className="h-3.5 w-3.5" /></Link>
                                        {o.status === "completed" && (
                                            <button
                                                onClick={() => setSelectedFeedbackOrder({ order: o, restaurant: r })}
                                                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-4 py-2 text-xs font-700 hover:border-primary"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5 text-primary" /> Leave Feedback
                                            </button>
                                        )}
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
                        {myReviews.length === 0 && <Empty text="You haven't submitted any reviews or feedback yet." />}
                        {myReviews.map((r) => {
                            const rest = restaurants.find((x) => String(x.id) === String(r.restaurantId) || String(x._id) === String(r.restaurantId)) || {};
                            return (
                                <div key={r.id || r._id} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-spice-gradient font-display text-sm font-700 text-white">
                                                {rest?.logoText || rest?.name?.slice(0, 2)?.toUpperCase() || "RE"}
                                            </div>
                                            <div>
                                                {rest?.slug ? (
                                                    <Link to={`/restaurant/${rest.slug}`} className="font-700 hover:text-primary transition">
                                                        {rest.name || "Restaurant"}
                                                    </Link>
                                                ) : (
                                                    <span className="font-700">{rest.name || "Restaurant"}</span>
                                                )}
                                                <div className="text-xs text-muted-foreground">{r.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-secondary/30 px-3 py-1.5 rounded-full">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-muted-foreground font-600">Overall:</span>
                                                <StarRating value={r.rating} size={14} />
                                            </div>
                                            {r.foodRating && (
                                                <div className="flex items-center gap-1 border-l border-border pl-3">
                                                    <span className="text-xs text-muted-foreground font-600">Food:</span>
                                                    <StarRating value={r.foodRating} size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {r.text ? (
                                        <p className="text-sm leading-relaxed text-foreground/90 italic">"{r.text}"</p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No written comment provided.</p>
                                    )}
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
                            <ProfileField label="Email" value={user?.user?.email || "—"} />
                        </div>
                    </div>
                )}
            </div>

            {selectedFeedbackOrder && (
                <FeedbackModal
                    order={selectedFeedbackOrder.order}
                    restaurant={selectedFeedbackOrder.restaurant}
                    onClose={() => setSelectedFeedbackOrder(null)}
                />
            )}
        </div>
    );
}

function FeedbackModal({ order, restaurant, onClose }) {
    const createReview = useCreateReview();
    const [rating, setRating] = useState(5);
    const [foodRating, setFoodRating] = useState(5);
    const [text, setText] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        createReview.mutate(
            { orderId: order.id, rating, foodRating, text },
            {
                onSuccess: () => {
                    alert("Thank you for your feedback!");
                    onClose();
                },
                onError: (err) => {
                    const error = /** @type {any} */ (err);
                    alert(error?.response?.data?.error || error?.message || "Failed to submit feedback");
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-700">Leave Feedback for {restaurant?.name || "Order"}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-600">Overall Rating</label>
                        <StarRating value={rating} size={24} interactive onChange={setRating} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-600">Food Quality</label>
                        <StarRating value={foodRating} size={24} interactive onChange={setFoodRating} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-600">Your Comments & Feedback</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                            placeholder="Share your thoughts about your meal and service..."
                            className="mt-1 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs font-700">Cancel</button>
                        <button type="submit" disabled={createReview.isPending} className="rounded-full bg-primary px-5 py-2 text-xs font-700 text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            {createReview.isPending ? "Submitting..." : "Submit Feedback"}
                        </button>
                    </div>
                </form>
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