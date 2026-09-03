import React, { useState } from "react";
import { X, Plus, Minus, Leaf, Fish } from "lucide-react";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { useMarketplace } from "@/context/MarketplaceContext";

export default function FoodItemModal({ item, restaurant, onClose }) {
    const { addToCart } = useMarketplace();
    const [qty, setQty] = useState(1);
    const [instructions, setInstructions] = useState("");

    if (!item) return null;

    const handleAdd = () => {
        addToCart(restaurant.id, item, qty, instructions);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur transition hover:scale-110">
                    <X className="h-5 w-5" />
                </button>
                <div className="relative h-56 sm:h-64">
                    <Image src={item.image} alt={item.name} fittingType="fill" className="h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {item.popular && (
                        <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-700 text-accent-foreground">★ Popular</span>
                    )}
                </div>
                <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="font-display text-2xl font-600">{item.name}</h2>
                            <div className="mt-1.5 flex items-center gap-2">
                                {item.veg ? (
                                    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-600 text-green-700"><Leaf className="h-3 w-3" />Vegetarian</span>
                                ) : (
                                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-600 text-red-700"><Fish className="h-3 w-3" />Contains meat/fish</span>
                                )}
                            </div>
                        </div>
                        <span className="font-display text-2xl font-700 text-primary">€{item.price.toFixed(2)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <Info label="Preparation" value={restaurant.prepTime} />
                        <Info label="Category" value={item.categoryName} />
                    </div>

                    <div className="mt-5">
                        <label className="text-sm font-600">Special instructions</label>
                        <textarea
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Any special requests? e.g. extra spicy, no onion"
                            rows={3}
                            className="mt-2 w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm outline-none focus:border-primary"
                        />
                    </div>

                    <div className="mt-5 flex items-center gap-4">
                        <div className="flex items-center gap-1 rounded-full border border-border p-1">
                            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-700">{qty}</span>
                            <button onClick={() => setQty((q) => q + 1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        <Button onClick={handleAdd} className="flex-1 rounded-full bg-primary py-3 text-base font-700 hover:opacity-90" disabled={!item.available}>
                            {item.available ? `Add to cart · €${(item.price * qty).toFixed(2)}` : "Currently unavailable"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="rounded-xl bg-secondary/50 p-3">
            <div className="text-[11px] font-600 uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-500">{value}</div>
        </div>
    );
}