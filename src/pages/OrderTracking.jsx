import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import { useOrderById, useCreateReview } from "@/hooks/useMarketplaceData";
import { restaurantsApi } from "@/api/restaurantsApi";
import StarRating from "@/components/StarRating";
import { cn } from "@/lib/utils";

const pickupFlow = [
    { id: "received", label: "Order Received" },
    { id: "accepted", label: "Accepted" },
    { id: "preparing", label: "Preparing" },
    { id: "ready", label: "Ready for Pickup" },
    { id: "completed", label: "Completed" },
];
const deliveryFlow = [
    { id: "received", label: "Order Received" },
    { id: "accepted", label: "Accepted" },
    { id: "preparing", label: "Preparing" },
    { id: "out_for_delivery", label: "Out for Delivery" },
    { id: "completed", label: "Delivered" },
];

export default function OrderTracking() {
    const { id } = useParams();
    const { data: order, isLoading } = useOrderById(id);
    const createReviewMutation = useCreateReview();
    const [restaurant, setRestaurant] = useState(null);
    const [reviewed, setReviewed] = useState(false);
    const [rating, setRating] = useState(5);
    const [foodRating, setFoodRating] = useState(5);
    const [text, setText] = useState("");

    useEffect(() => {
        const restId = order?.restaurantId || order?.restaurant_id;
        if (restId) {
            restaurantsApi.getRestaurantById(restId).then(setRestaurant).catch(() => { });
        }
    }, [order?.restaurantId, order?.restaurant_id]);

    if (isLoading) {
        return <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Loading order…</div>;
    }

    if (!order) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <h1 className="font-display text-2xl font-600">Order not found</h1>
                <Link to="/account" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-700 text-primary-foreground">My orders</Link>
            </div>
        );
    }

    const flow = order.delivery_type === "delivery" ? deliveryFlow : pickupFlow;
    const currentIdx = flow.findIndex((f) => f.id === order.status);
    const displayIdx = currentIdx >= 0 ? currentIdx : 0;

    const submitReview = () => {
        createReviewMutation.mutate(
            { orderId: order.id, rating, foodRating, text },
            {
                onSuccess: () => setReviewed(true),
                onError: (err) => {
                    alert(err?.response?.data?.error || err?.message || "Failed to submit review");
                },
            }
        );
    };

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-600">Track your order</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Order #{order.order_number} · {restaurant?.name}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1.5 text-sm font-700 capitalize", order.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {flow[displayIdx]?.label}
                </span>
            </div>

            {/* Timeline */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-col gap-0">
                    {flow.map((f, i) => {
                        const done = i < displayIdx;
                        const active = i === displayIdx;
                        return (
                            <div key={f.id} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={cn("grid h-10 w-10 place-items-center rounded-full border-2 transition", done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground")}>
                                        {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-700">{i + 1}</span>}
                                    </div>
                                    {i < flow.length - 1 && <div className={cn("my-1 w-0.5 flex-1 rounded-full", i < displayIdx ? "bg-primary" : "bg-border")} style={{ minHeight: 36 }} />}
                                </div>
                                <div className="pb-6 pt-1.5">
                                    <div className={cn("font-600", active && "text-primary")}>{f.label}</div>
                                    {active && <div className="mt-0.5 text-sm text-muted-foreground">{order.status === "completed" ? "Done — enjoy your meal!" : "In progress…"}</div>}
                                    {done && <div className="mt-0.5 text-sm text-green-600">Completed</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Order details */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Detail label="Date" value={order.scheduled_date} />
                <Detail label="Time" value={order.scheduled_time} />
                <Detail label={order.delivery_type === "pickup" ? "Pickup" : "Delivery"} value={order.delivery_type === "pickup" ? restaurant?.city : order.delivery_address} />
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-700">Order items</h3>
                <div className="mt-3 space-y-2">
                    {order.items.map((i, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{i.qty}× {i.name}</span>
                            <span className="font-600">€{(i.price * i.qty).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-700">Total</span>
                    <span className="font-display text-xl font-700 text-primary">€{order.total.toFixed(2)}</span>
                </div>
            </div>

            {/* Rate */}
            {order.status === "completed" && (
                <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                    {reviewed || createReviewMutation.isSuccess ? (
                        <div className="text-center">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100"><Star className="h-7 w-7 fill-green-600 text-green-600" /></div>
                            <h3 className="mt-3 font-display text-xl font-600">Thanks for your review!</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Your feedback helps the community.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="font-display text-xl font-600">Rate your experience</h3>
                            <p className="mt-1 text-sm text-muted-foreground">How was your order from {restaurant?.name}?</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-secondary/40 p-4">
                                    <div className="text-sm font-600">Overall rating</div>
                                    <StarRating value={rating} size={28} interactive onChange={setRating} className="mt-2" />
                                </div>
                                <div className="rounded-xl bg-secondary/40 p-4">
                                    <div className="text-sm font-600">Food rating</div>
                                    <StarRating value={foodRating} size={28} interactive onChange={setFoodRating} className="mt-2" />
                                </div>
                            </div>
                            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Share your thoughts (optional)" className="mt-4 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary" />
                            <button onClick={submitReview} disabled={createReviewMutation.isPending} className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-700 text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                {createReviewMutation.isPending ? "Submitting…" : "Submit review"}
                            </button>
                            {createReviewMutation.isError && (
                                <p className="mt-2 text-sm text-red-600">{createReviewMutation.error?.response?.data?.error || "Failed to submit review"}</p>
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <Link to="/account" className="flex-1 rounded-full border border-border px-6 py-3 text-center text-sm font-700 hover:border-primary">My orders</Link>
                <Link to="/restaurants" className="flex-1 rounded-full bg-primary px-6 py-3 text-center text-sm font-700 text-primary-foreground hover:opacity-90">Order more</Link>
            </div>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <div>
                <div className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="text-sm font-600">{value || "—"}</div>
            </div>
        </div>
    );
}