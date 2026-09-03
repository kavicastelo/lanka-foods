import React from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, Calendar, Clock, MapPin, Receipt, ArrowRight } from "lucide-react";
import { useOrderById, useRestaurantById } from "@/hooks/useMarketplaceData";

export default function OrderConfirmation() {
    const { id } = useParams();
    const { data: order, isLoading } = useOrderById(id);
    const { data: restaurant } = useRestaurantById(order?.restaurant_id);

    if (isLoading) {
        return <div className="mx-auto max-w-2xl px-6 py-24 text-center text-muted-foreground">Loading order…</div>;
    }

    if (!order) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <h1 className="font-display text-2xl font-600">Order not found</h1>
                <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-700 text-primary-foreground">Home</Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-6 py-16">
            <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-11 w-11 text-green-600" />
                </div>
                <h1 className="mt-5 font-display text-3xl font-600">Order Confirmed!</h1>
                <p className="mt-1 text-muted-foreground">Your order has been placed successfully.</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-700">
                    <Receipt className="h-4 w-4 text-primary" /> Order #{order.order_number}
                </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-spice-gradient font-display text-lg font-700 text-white">{restaurant?.logoText || "RE"}</div>
                    <div>
                        <div className="font-700">{restaurant?.name || "Restaurant"}</div>
                        <div className="text-sm text-muted-foreground">{restaurant?.city}</div>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Info icon={Calendar} label="Date" value={order.scheduled_date} />
                    <Info icon={Clock} label="Time" value={order.scheduled_time} />
                    <Info icon={MapPin} label={order.delivery_type === "pickup" ? "Pickup at" : "Delivery to"} value={order.delivery_type === "pickup" ? restaurant?.address : order.delivery_address} />
                </div>

                <div className="mt-5 border-t border-border pt-4">
                    <h3 className="text-sm font-700">Items</h3>
                    <div className="mt-2 space-y-2">
                        {order.items.map((i, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{i.qty}× {i.name}</span>
                                <span className="font-600">€{(i.price * i.qty).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <span className="font-700">Total</span>
                        <span className="font-display text-2xl font-700 text-primary">€{order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link to={`/order/${order.id}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-700 text-primary-foreground hover:opacity-90">
                    View Order <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/restaurants" className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-700 hover:border-primary">
                    Back to Marketplace
                </Link>
            </div>
        </div>
    );
}

function Info({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3 rounded-xl bg-secondary/40 p-3">
            <Icon className="mt-0.5 h-4 w-4 text-primary" />
            <div>
                <div className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-sm font-600">{value || "—"}</div>
            </div>
        </div>
    );
}