import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { restaurantsApi } from "@/api/restaurantsApi";
import { Button } from "@/components/ui/button";

// MarketplaceContext manages client-side cart state and single-restaurant order enforcement.
const MarketplaceContext = createContext(null);
export const useMarketplace = () => useContext(MarketplaceContext);

export function MarketplaceProvider({ children }) {
    const [cart, setCart] = useState({ restaurantId: null, items: [] });
    const [pendingSwitch, setPendingSwitch] = useState(null);
    const [existingRestaurantName, setExistingRestaurantName] = useState("");

    // Fetch existing restaurant name when switch is pending
    useEffect(() => {
        if (pendingSwitch && cart.restaurantId) {
            restaurantsApi.getRestaurantById(cart.restaurantId)
                .then((r) => setExistingRestaurantName(r?.name || "another restaurant"))
                .catch(() => setExistingRestaurantName("another restaurant"));
        }
    }, [pendingSwitch, cart.restaurantId]);

    const addToCart = useCallback((restaurantId, item, qty = 1, instructions = "", restaurantName = "") => {
        setCart((prev) => {
            if (prev.restaurantId && prev.restaurantId !== restaurantId && prev.items.length > 0) {
                setPendingSwitch({ restaurantId, item, qty, instructions, restaurantName });
                return prev;
            }
            const items = prev.restaurantId === restaurantId ? [...prev.items] : [];
            const existing = items.find((i) => i.id === item.id);
            if (existing) {
                existing.qty += qty;
                if (instructions) existing.instructions = instructions;
            } else {
                items.push({ ...item, qty, instructions });
            }
            return { restaurantId, items };
        });
    }, []);

    const confirmSwitch = useCallback(() => {
        if (!pendingSwitch) return;
        const { restaurantId, item, qty, instructions } = pendingSwitch;
        setCart({
            restaurantId,
            items: [{ ...item, qty, instructions }],
        });
        setPendingSwitch(null);
    }, [pendingSwitch]);

    const cancelSwitch = useCallback(() => {
        setPendingSwitch(null);
    }, []);

    const updateQty = useCallback((itemId, qty) => {
        setCart((prev) => {
            if (qty <= 0) {
                const newItems = prev.items.filter((i) => i.id !== itemId);
                return { restaurantId: newItems.length > 0 ? prev.restaurantId : null, items: newItems };
            }
            return { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, qty } : i)) };
        });
    }, []);

    const removeItem = useCallback((itemId) => {
        setCart((prev) => {
            const newItems = prev.items.filter((i) => i.id !== itemId);
            return { restaurantId: newItems.length > 0 ? prev.restaurantId : null, items: newItems };
        });
    }, []);

    const clearCart = useCallback(() => setCart({ restaurantId: null, items: [] }), []);

    const cartCount = cart.items.reduce((n, i) => n + i.qty, 0);
    const cartSubtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0);

    const value = {
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
    };

    return (
        <MarketplaceContext.Provider value={value}>
            {children}

            {/* Restaurant Switch Confirmation Modal */}
            {pendingSwitch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl">
                        <button
                            onClick={cancelSwitch}
                            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-center font-display text-xl font-700">Create new order?</h3>
                        <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                            Your cart currently contains items from <span className="font-600 text-foreground">{existingRestaurantName}</span>. Adding items from <span className="font-600 text-foreground">{pendingSwitch.restaurantName || "this new restaurant"}</span> will clear your current cart.
                        </p>
                        <div className="mt-6 flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={cancelSwitch}
                                className="flex-1 rounded-full border-border font-600"
                            >
                                Keep existing cart
                            </Button>
                            <Button
                                onClick={confirmSwitch}
                                className="flex-1 rounded-full bg-primary font-700 text-primary-foreground hover:opacity-90"
                            >
                                Clear & add item
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </MarketplaceContext.Provider>
    );
}