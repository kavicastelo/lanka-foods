import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingBag, ArrowLeft, Bike, Store } from "lucide-react";
import { useMarketplace } from "@/context/MarketplaceContext";
import { useRestaurantById } from "@/hooks/useMarketplaceData";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

export default function Cart() {
    const { cart, cartSubtotal, updateQty, removeItem, clearCart } = useMarketplace();
    const { data: cartRestaurant } = useRestaurantById(cart.restaurantId);
    const navigate = useNavigate();

    const serviceFee = cartSubtotal ? 0.99 : 0;
    const total = cartSubtotal + serviceFee;

    if (cart.items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary">
                    <ShoppingBag className="h-9 w-9 text-muted-foreground" />
                </div>
                <h1 className="mt-5 font-display text-2xl font-600">Your cart is empty</h1>
                <p className="mt-1 text-muted-foreground">Browse restaurants and add some delicious Sri Lankan food.</p>
                <Link to="/restaurants" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-700 text-primary-foreground">Explore restaurants</Link>
            </div>
        );
    }

    if (!cartRestaurant) {
        return <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted-foreground">Loading restaurant…</div>;
    }

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <Link to={`/restaurant/${cartRestaurant.slug}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-600 text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Continue shopping
            </Link>
            <h1 className="font-display text-3xl font-600">Your cart</h1>
            <p className="mt-1 text-sm text-muted-foreground">All items are from <span className="font-600 text-foreground">{cartRestaurant.name}</span>. A cart holds items from one restaurant at a time.</p>

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="overflow-hidden rounded-2xl border border-border bg-card">
                        {cart.items.map((item, i) => (
                            <div key={item.id} className={`flex gap-4 p-4 ${i > 0 ? "border-t border-border" : ""}`}>
                                <Image src={item.image} alt={item.name} fittingType="fill" className="h-20 w-20 shrink-0 rounded-xl" />
                                <div className="flex flex-1 flex-col">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-600">{item.name}</div>
                                            {item.instructions && <div className="mt-0.5 text-xs italic text-muted-foreground">"{item.instructions}"</div>}
                                        </div>
                                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground transition hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between pt-2">
                                        <div className="flex items-center gap-1 rounded-full border border-border p-1">
                                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"><Minus className="h-3.5 w-3.5" /></button>
                                            <span className="w-7 text-center text-sm font-700">{item.qty}</span>
                                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"><Plus className="h-3.5 w-3.5" /></button>
                                        </div>
                                        <span className="font-700">€{(item.price * item.qty).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={clearCart} className="mt-3 text-sm font-600 text-muted-foreground hover:text-destructive">Clear cart</button>
                </div>

                <aside className="h-fit rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-display text-lg font-600">Order summary</h3>
                    <div className="mt-4 space-y-2.5 text-sm">
                        <Row label="Subtotal" value={`€${cartSubtotal.toFixed(2)}`} />
                        <Row label="Service fee" value={`€${serviceFee.toFixed(2)}`} />
                        <Row label="Delivery fee" value="Calculated at checkout" muted />
                        <div className="border-t border-border pt-3">
                            <Row label="Estimated total" value={`€${total.toFixed(2)}`} bold />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1"><Store className="h-3 w-3" />Pickup</span>
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1"><Bike className="h-3 w-3" />Delivery</span>
                    </div>
                    <Button onClick={() => navigate("/checkout")} className="mt-5 w-full rounded-full bg-primary py-3 text-base font-700 hover:opacity-90">
                        Proceed to checkout
                    </Button>
                </aside>
            </div>
        </div>
    );
}

function Row({ label, value, bold, muted }) {
    return (
        <div className="flex items-center justify-between">
            <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
            <span className={bold ? "font-display text-xl font-700" : "font-600"}>{value}</span>
        </div>
    );
}