import React from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Clock, Bike, Store, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useMarketplaceData";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

export default function RestaurantCard({ restaurant, variant: _variant = "grid" }) {
    const { favoriteRestaurants, toggleFavoriteRestaurant } = useFavorites();
    const fav = favoriteRestaurants.includes(restaurant.id);

    return (
        <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-warm">
            <div className="relative h-44 overflow-hidden">
                <Link to={`/restaurant/${restaurant.slug}`}>
                    <Image src={restaurant.cover} alt={restaurant.name} fittingType="fill" className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
                </Link>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <button
                    onClick={() => toggleFavoriteRestaurant(restaurant.id)}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:scale-110"
                >
                    <Heart className={cn("h-4 w-4", fav && "fill-primary text-primary")} />
                </button>
                <div className="absolute left-3 top-3 flex gap-1.5">
                    {restaurant.pickup && <Badge icon={Store}>Pickup</Badge>}
                    {restaurant.delivery && <Badge icon={Bike}>Delivery</Badge>}
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-spice-gradient font-display text-lg font-700 text-white shadow-warm">
                        {restaurant.logoText}
                    </div>
                </div>
                {!restaurant.open && (
                    <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-600 text-white backdrop-blur">
                        Closed now
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <Link to={`/restaurant/${restaurant.slug}`} className="font-display text-lg font-600 leading-tight hover:text-primary">
                        {restaurant.name}
                    </Link>
                    <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-sm font-700 text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {restaurant.rating ? restaurant.rating.toFixed(1) : "—"}
                    </div>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">({restaurant.reviewCount || 0} reviews) · {(restaurant.cuisines || []).join(", ")}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{restaurant.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{restaurant.prepTime}</span>
                    <span className="font-600 text-foreground">{restaurant.priceRange}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">Min order €{restaurant.minOrder}</span>
                    <Link to={`/restaurant/${restaurant.slug}`} className="rounded-full bg-primary px-4 py-1.5 text-xs font-700 text-primary-foreground transition hover:opacity-90">
                        View Menu
                    </Link>
                </div>
            </div>
        </div>
    );
}

function Badge({ icon: Icon, children }) {
    return (
        <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-600 text-foreground shadow-sm backdrop-blur">
            <Icon className="h-3 w-3" />
            {children}
        </span>
    );
}