import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, MapPin, Clock, Phone, Bike, Store, Heart, Plus, Leaf, Check, ChevronRight, Settings, MessageSquare } from "lucide-react";
import { useMarketplace } from "@/context/MarketplaceContext";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";
import { useRestaurantBySlug, useRestaurantMenu, useRestaurantReviews, useFavorites, computeRestaurantStats, useCreateReview } from "@/hooks/useMarketplaceData";
import { Image } from "@/components/ui/image";
import StarRating from "@/components/StarRating";
import FoodItemModal from "@/components/FoodItemModal";
import { cn } from "@/lib/utils";

export default function RestaurantStorefront() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useMarketplace();
    const { favoriteRestaurants, toggleFavoriteRestaurant } = useFavorites();
    const { user, marketplaceRole } = useMarketplaceUser();
    const { data: restaurant, isLoading } = useRestaurantBySlug(slug);
    const [activeItem, setActiveItem] = useState(null);
    const [activeCat, setActiveCat] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const { data: categories = [] } = useRestaurantMenu(slug);
    const { data: reviews = [] } = useRestaurantReviews(restaurant?.id);

    if (isLoading) {
        return <div className="mx-auto max-w-3xl px-6 py-32 text-center text-muted-foreground">Loading restaurant…</div>;
    }

    if (!restaurant || ["suspended", "rejected"].includes(restaurant.status)) {
        return (
            <div className="mx-auto max-w-3xl px-6 py-32 text-center">
                <h1 className="font-display text-3xl font-600">{restaurant ? "Restaurant unavailable" : "Restaurant not found"}</h1>
                <p className="mt-2 text-muted-foreground">{restaurant ? "This restaurant is currently not accepting orders." : "The restaurant you're looking for doesn't exist."}</p>
                <Link to="/restaurants" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-700 text-primary-foreground">Browse restaurants</Link>
            </div>
        );
    }

    const fav = favoriteRestaurants.includes(restaurant.id);
    const stats = computeRestaurantStats(reviews);
    const scrollToCat = (name) => {
        setActiveCat(name);
        document.getElementById(`cat-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleOpenFeedback = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        setShowFeedbackModal(true);
    };

    return (
        <div>
            {/* Cover */}
            <div className="relative h-56 sm:h-72 lg:h-80">
                <Image src={restaurant.cover} alt={restaurant.name} fittingType="fill" className="h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30" />
                <div className="absolute inset-x-0 top-4 mx-auto flex max-w-7xl items-center gap-2 px-6 text-sm text-white/80">
                    <Link to="/" className="hover:text-white">Home</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <Link to="/restaurants" className="hover:text-white">Restaurants</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-white">{restaurant.name}</span>
                </div>
            </div>

            <div className="relative z-10 mx-auto -mt-16 sm:-mt-20 max-w-7xl px-4 sm:px-6">
                <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-lg">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-spice-gradient font-display text-3xl font-700 text-white shadow-warm">
                            {restaurant.logoText}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h1 className="font-display text-3xl font-600">{restaurant.name}</h1>
                                    <p className="mt-1 text-sm text-muted-foreground">{(restaurant.cuisines || []).join(" · ")} · {restaurant.priceRange}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => toggleFavoriteRestaurant(restaurant.id)} className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-primary">
                                        <Heart className={cn("h-5 w-5", fav && "fill-primary text-primary")} />
                                    </button>
                                    {marketplaceRole === "RESTAURANT_ADMIN" && (user?.restaurant_id || user?.data?.restaurant_id) === restaurant.id && (
                                        <Link to="/restaurant/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-border transition hover:border-primary" title="Owner dashboard">
                                            <Settings className="h-5 w-5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{restaurant.description}</p>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-700 text-amber-700">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
                                    <span className="font-400 text-amber-600/70">({stats.reviewCount})</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" />{restaurant.address}</span>
                                <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" />{restaurant.hours}</span>
                                <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-4 w-4" />{restaurant.phone}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {restaurant.pickup && <Badge icon={Store} tone="green">Pickup available</Badge>}
                                {restaurant.delivery && <Badge icon={Bike} tone="blue">Delivery · €{restaurant.deliveryFee.toFixed(2)}</Badge>}
                                {restaurant.halal && <Badge tone="purple">Halal</Badge>}
                                {restaurant.catering && <Badge tone="amber">Catering</Badge>}
                                <Badge tone={restaurant.open ? "green" : "red"}>{restaurant.open ? "Open now" : "Closed"}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category nav */}
                {categories.length > 0 && (
                    <div className="sticky top-16 z-30 mt-6 -mx-6 overflow-x-auto no-scrollbar bg-background/85 px-6 py-3 backdrop-blur">
                        <div className="flex gap-2">
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => scrollToCat(c.name)}
                                    className={cn(
                                        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-600 transition",
                                        activeCat === c.name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"
                                    )}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Menu */}
                <div className="mt-6 grid gap-10 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        {categories.map((c) => (
                            <div key={c.id} id={`cat-${c.name}`} className="scroll-mt-32 border-b border-border py-6 last:border-0">
                                <h2 className="font-display text-2xl font-600">{c.name}</h2>
                                <div className="mt-4 grid gap-4">
                                    {c.items.map((item) => (
                                        <div key={item.id} className="flex gap-3 sm:gap-4 rounded-2xl border border-border bg-card p-3 sm:p-4 transition hover:shadow-sm">
                                            <button onClick={() => setActiveItem({ ...item, categoryName: c.name })} className="relative h-20 w-20 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl">
                                                <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full" />
                                                {!item.available && <div className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-600 text-white">Unavailable</div>}
                                            </button>
                                            <div className="flex flex-1 min-w-0 flex-col">
                                                <div className="flex items-start justify-between gap-2">
                                                    <button onClick={() => setActiveItem({ ...item, categoryName: c.name })} className="min-w-0 flex-1 text-left">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-600 text-sm sm:text-base line-clamp-1">{item.name}</span>
                                                            {item.veg && <Leaf className="h-3.5 w-3.5 shrink-0 text-green-600" />}
                                                        </div>
                                                        <p className="mt-0.5 line-clamp-2 text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                                                    </button>
                                                    <span className="shrink-0 font-display text-base sm:text-lg font-700 text-primary">€{item.price.toFixed(2)}</span>
                                                </div>
                                                <div className="mt-auto flex items-center justify-between pt-2 gap-2">
                                                    {item.popular ? <span className="text-[11px] sm:text-xs font-600 text-accent truncate">★ Popular choice</span> : <span />}
                                                    <button
                                                        onClick={() => addToCart(restaurant.id, { ...item, categoryName: c.name }, 1, "", restaurant.name)}
                                                        disabled={!item.available}
                                                        className="ml-auto flex items-center gap-1 shrink-0 rounded-full bg-primary px-3 sm:px-4 py-1.5 text-xs font-700 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" /> Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reviews sidebar */}
                    <aside className="lg:sticky lg:top-32 lg:h-fit">
                        <div className="rounded-2xl border border-border bg-card p-5">
                            <div className="flex items-center justify-between">
                                <h3 className="font-display text-lg font-600">Ratings & reviews</h3>
                                <button
                                    onClick={handleOpenFeedback}
                                    className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-700 text-primary-foreground hover:opacity-90"
                                >
                                    <MessageSquare className="h-3.5 w-3.5" /> Write Review
                                </button>
                            </div>
                            <div className="mt-3 flex items-center gap-3">
                                <div className="font-display text-4xl font-700">{stats.rating > 0 ? stats.rating.toFixed(1) : "—"}</div>
                                <div>
                                    <StarRating value={stats.rating} size={16} />
                                    <div className="mt-0.5 text-xs text-muted-foreground">{stats.reviewCount} reviews</div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {[5, 4, 3, 2, 1].map((s, idx) => {
                                    const count = stats.breakdown[idx];
                                    const pct = stats.reviewCount > 0 ? (count / stats.reviewCount) * 100 : 0;
                                    return (
                                        <div key={s} className="flex items-center gap-2 text-xs">
                                            <span className="w-6 text-muted-foreground">{s}★</span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="w-8 text-right text-muted-foreground">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-5 space-y-4">
                                {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
                                {reviews.map((r) => (
                                    <div key={r.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-600">{r.author}</span>
                                            {r.verified && <span className="flex items-center gap-1 text-[11px] font-600 text-green-600"><Check className="h-3 w-3" />Verified Order</span>}
                                        </div>
                                        <StarRating value={r.rating} size={13} className="mt-1" />
                                        <p className="mt-1.5 text-sm text-muted-foreground">"{r.text}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <div className="h-16" />
            {activeItem && <FoodItemModal item={activeItem} restaurant={restaurant} onClose={() => setActiveItem(null)} />}
            {showFeedbackModal && <StorefrontReviewModal restaurant={restaurant} onClose={() => setShowFeedbackModal(false)} />}
        </div>
    );
}

function StorefrontReviewModal({ restaurant, onClose }) {
    const createReview = useCreateReview();
    const [rating, setRating] = useState(5);
    const [foodRating, setFoodRating] = useState(5);
    const [text, setText] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        createReview.mutate(
            { restaurantId: restaurant.id, rating, foodRating, text },
            {
                onSuccess: () => {
                    alert("Thank you for your feedback!");
                    onClose();
                },
                onError: (err) => {
                    const error = /** @type {any} */ (err);
                    alert(error?.response?.data?.error || error?.message || "Failed to submit review");
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-700">Write Review for {restaurant?.name}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-600">Overall Rating</label>
                        <StarRating value={rating} size={24} interactive onChange={setRating} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-600">Food Rating</label>
                        <StarRating value={foodRating} size={24} interactive onChange={setFoodRating} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-600">Your Feedback</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            rows={3}
                            placeholder="Share details of your experience with this restaurant..."
                            className="mt-1 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs font-700">Cancel</button>
                        <button type="submit" disabled={createReview.isPending} className="rounded-full bg-primary px-5 py-2 text-xs font-700 text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            {createReview.isPending ? "Submitting..." : "Submit Review"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Badge({ icon: Icon = null, tone = "gray", children }) {
    const tones = {
        green: "bg-green-50 text-green-700",
        blue: "bg-blue-50 text-blue-700",
        purple: "bg-purple-50 text-purple-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
        gray: "bg-secondary text-foreground",
    };
    return (
        <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-600", tones[tone])}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
        </span>
    );
}