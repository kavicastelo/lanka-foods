import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, Star, AlertCircle, Phone, Bike, ExternalLink } from "lucide-react";
import { useOrderById, useCreateReview } from "@/hooks/useMarketplaceData";
import { restaurantsApi } from "@/api/restaurantsApi";
import StarRating from "@/components/StarRating";
import OrderChatBox from "@/components/OrderChatBox";
import { WhatsAppIcon, getWhatsAppUrl } from "@/utils/communication";
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

    const isRejected = order.status === "rejected";
    const flow = order.delivery_type === "delivery" ? deliveryFlow : pickupFlow;
    const currentIdx = flow.findIndex((f) => f.id === order.status);
    const displayIdx = currentIdx >= 0 ? currentIdx : 0;

    const whatsappDefaultMsg = isRejected
        ? `Hi ${restaurant?.name || "Restaurant"}, I am messaging regarding my rejected order #${order.order_number || order.orderNumber}. Could you please advise?`
        : `Hi ${restaurant?.name || "Restaurant"}, I have an inquiry regarding my order #${order.order_number || order.orderNumber}.`;

    const whatsappUrl = getWhatsAppUrl(restaurant?.phone, whatsappDefaultMsg);

    const submitReview = () => {
        createReviewMutation.mutate(
            { orderId: order.id, rating, foodRating, text },
            {
                onSuccess: () => setReviewed(true),
                onError: (err) => {
                    const error = /** @type {any} */ (err);
                    alert(error?.response?.data?.error || error?.message || "Failed to submit review");
                },
            }
        );
    };

    return (
        <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl font-600">Track your order</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Order #{order.order_number} · {restaurant?.name}</p>
                </div>
                {isRejected ? (
                    <span className="rounded-full bg-destructive/10 px-3.5 py-1.5 text-sm font-700 text-destructive">
                        Order Rejected
                    </span>
                ) : (
                    <span className={cn("rounded-full px-3 py-1.5 text-sm font-700 capitalize", order.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {flow[displayIdx]?.label}
                    </span>
                )}
            </div>

            {/* WOLT COURIER TRACKING CARD (Section 30, 31) */}
            {(order.deliveryProvider === "WOLT" || order.delivery_provider === "WOLT" || order.trackingUrl || order.tracking_url) && (
                <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-white shadow-sm">
                                <Bike className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-700 text-sm text-foreground flex items-center gap-1.5">
                                    Wolt Drive Delivery
                                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-700 text-sky-800">
                                        Active Courier
                                    </span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Delivered on-demand by Wolt courier partner. Track your courier in real-time.
                                </p>
                            </div>
                        </div>
                        {(order.trackingUrl || order.tracking_url) && (
                            <a
                                href={order.trackingUrl || order.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-xs font-700 text-white shadow-sm transition hover:bg-sky-700 hover:shadow"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Track delivery on Wolt
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* REJECTION BANNER & TWO-WAY COMMUNICATION */}
            {isRejected ? (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6 text-foreground shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-display text-xl font-700 text-destructive">Order Rejected by Restaurant</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                We are sorry! {restaurant?.name || "The restaurant"} was unable to fulfill your order.
                            </p>

                            <div className="mt-3 rounded-xl border border-destructive/20 bg-card p-4 text-sm shadow-xs">
                                <span className="font-700 text-xs uppercase tracking-wider text-destructive block mb-1">
                                    Reason from Restaurant:
                                </span>
                                <p className="text-foreground font-500 italic">
                                    "{order.rejectionReason || "The kitchen is currently unable to accept this order."}"
                                </p>
                            </div>

                            {/* Direct Communication Action Buttons */}
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                {whatsappUrl && (
                                    <a
                                        href={whatsappUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-700 text-white shadow-sm transition hover:bg-emerald-700"
                                    >
                                        <WhatsAppIcon className="h-4 w-4" />
                                        Chat via WhatsApp
                                    </a>
                                )}
                                {restaurant?.phone && (
                                    <a
                                        href={`tel:${restaurant.phone}`}
                                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-700 text-foreground transition hover:border-primary"
                                    >
                                        <Phone className="h-4 w-4 text-primary" />
                                        Call {restaurant.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Timeline for active/completed orders */
                <div className="rounded-2xl border border-border bg-card p-6">
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
            )}

            {/* Order details */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Date" value={order.scheduled_date} />
                <Detail label="Time" value={order.scheduled_time} />
                <Detail label={order.delivery_type === "pickup" ? "Pickup" : "Delivery"} value={order.delivery_type === "pickup" ? restaurant?.city : order.delivery_address} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
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

            {/* Direct Order Chat & Communication */}
            <OrderChatBox order={order} currentRole="customer" title={`Direct Message with ${restaurant?.name || "Restaurant"}`} />

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
                                <p className="mt-2 text-sm text-red-600">{(/** @type {any} */ (createReviewMutation.error))?.response?.data?.error || "Failed to submit review"}</p>
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