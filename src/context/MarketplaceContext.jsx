import React, { createContext, useContext, useState, useCallback } from "react";

// MarketplaceContext now ONLY manages client-side cart state.
// All business data (restaurants, orders, reviews, etc.) comes from
// the real Base44 database via useMarketplaceData hooks.

const MarketplaceContext = createContext(null);
export const useMarketplace = () => useContext(MarketplaceContext);

export function MarketplaceProvider({ children }) {
    const [cart, setCart] = useState({ restaurantId: null, items: [] });

    const addToCart = useCallback((restaurantId, item, qty = 1, instructions = "") => {
        setCart((prev) => {
            if (prev.restaurantId && prev.restaurantId !== restaurantId) {
                return { restaurantId, items: [{ ...item, qty, instructions }] };
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

    const updateQty = useCallback((itemId, qty) => {
        setCart((prev) => {
            if (qty <= 0) return { ...prev, items: prev.items.filter((i) => i.id !== itemId) };
            return { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, qty } : i)) };
        });
    }, []);

    const removeItem = useCallback((itemId) => {
        setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }));
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

    return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}