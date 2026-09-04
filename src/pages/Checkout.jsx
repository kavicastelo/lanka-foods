import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Store, Bike, Clock, CreditCard, Smartphone, Banknote, ArrowRight, ArrowLeft } from "lucide-react";
import { useMarketplace } from "@/context/MarketplaceContext";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";
import { usePlaceOrder, useRestaurantById, useCommissionConfig } from "@/hooks/useMarketplaceData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = ["Order type", "Date & time", "Details", "Payment"];

export default function Checkout() {
    const { cart, cartSubtotal, clearCart } = useMarketplace();
    const { user } = useMarketplaceUser();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const placeOrderMutation = usePlaceOrder();

    // Fetch restaurant data and platform config
    const { data: restaurant } = useRestaurantById(cart.restaurantId);
    const { data: commissionConfig } = useCommissionConfig();

    const [type, setType] = useState("pickup");
    const [when, setWhen] = useState("today");
    const [date, setDate] = useState("");
    const [slot, setSlot] = useState("");
    const [details, setDetails] = useState({ name: user?.user?.fullName || "", phone: user?.user?.phone || user?.data?.phone || "", email: user?.user?.email || "", address: "", instructions: "" });
    const [payment, setPayment] = useState("card");

    if (!restaurant || cart.items.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <h1 className="font-display text-2xl font-600">Your cart is empty</h1>
                <Link to="/restaurants" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-700 text-primary-foreground">Browse restaurants</Link>
            </div>
        );
    }

    const deliveryFee = type === "delivery" ? restaurant.deliveryFee : 0;
    const serviceFee = commissionConfig?.serviceFee ?? 0.99;
    const total = cartSubtotal + deliveryFee + serviceFee;

    const slots = restaurant.timeSlots || [];

    const dateOptions = [
        { id: "today", label: "Today", sub: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) },
        { id: "tomorrow", label: "Tomorrow", sub: new Date(Date.now() + 86400000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) },
    ];

    const canContinue = () => {
        if (step === 0) return !!type;
        if (step === 1) return !!when && !!slot;
        if (step === 2) return details.name && details.phone && details.email && (type === "pickup" || details.address);
        if (step === 3) return !!payment;
        return true;
    };

    const submit = async () => {
        placeOrderMutation.mutate(
            {
                restaurantId: restaurant.id,
                items: cart.items.map((i) => ({ menuItemId: i.id, quantity: i.qty, instructions: i.instructions || "" })),
                deliveryType: type,
                scheduledDate: when === "today" ? dateOptions[0].sub : when === "tomorrow" ? dateOptions[1].sub : date,
                scheduledTime: slot,
                deliveryAddress: details.address,
                instructions: details.instructions,
                paymentMethod: payment,
            },
            {
                onSuccess: (data) => {
                    clearCart();
                    navigate(`/order/${data.order.id}/confirmation`);
                },
            }
        );
    };

    return (
        <div className="mx-auto max-w-3xl px-6 py-10">
            <h1 className="font-display text-3xl font-600">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ordering from <span className="font-600 text-foreground">{restaurant.name}</span></p>

            {/* Stepper */}
            <div className="mt-6 flex items-center">
                {steps.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className="flex items-center gap-2">
                            <div className={cn("grid h-8 w-8 place-items-center rounded-full text-sm font-700 transition", i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-spice-gradient text-white" : "bg-secondary text-muted-foreground")}>
                                {i < step ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={cn("hidden text-sm font-600 sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                        </div>
                        {i < steps.length - 1 && <div className={cn("mx-2 h-0.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-border")} />}
                    </React.Fragment>
                ))}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
                {step === 0 && (
                    <div>
                        <h2 className="font-display text-xl font-600">How would you like to receive your order?</h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <Option selected={type === "pickup"} onClick={() => setType("pickup")} icon={Store} title="Pickup" desc={restaurant.address} meta={`Ready in ${restaurant.prepTime}`} />
                            <Option selected={type === "delivery"} onClick={() => setType("delivery")} icon={Bike} title="Delivery" desc={`Delivered to your address`} meta={`Fee €${restaurant.deliveryFee.toFixed(2)} · ~${restaurant.prepTime}`} />
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <div>
                        <h2 className="font-display text-xl font-600">Choose a date & time</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Chip active={when === "asap"} onClick={() => { setWhen("asap"); setSlot("ASAP"); }}>ASAP</Chip>
                            {dateOptions.map((d) => (
                                <Chip key={d.id} active={when === d.id} onClick={() => { setWhen(d.id); setSlot(""); }}>{d.label}</Chip>
                            ))}
                            <Chip active={when === "select"} onClick={() => { setWhen("select"); setSlot(""); }}>Select a date</Chip>
                        </div>
                        {when === "select" && (
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-4 w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
                        )}
                        <div className="mt-5">
                            <div className="flex items-center gap-2 text-sm font-600 text-muted-foreground"><Clock className="h-4 w-4" />Available {type} times</div>
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {slots.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSlot(s)}
                                        className={cn("rounded-xl border py-2.5 text-sm font-600 transition", slot === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Full name" value={details.name} onChange={(v) => setDetails({ ...details, name: v })} placeholder="Mika Korhonen" />
                        <Field label="Phone number" value={details.phone} onChange={(v) => setDetails({ ...details, phone: v })} placeholder="+358 40 123 4567" />
                        <Field label="Email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} placeholder="mika@email.com" type="email" full />
                        {type === "delivery" && <Field label="Delivery address" value={details.address} onChange={(v) => setDetails({ ...details, address: v })} placeholder="Street, postal code, city" full />}
                        <div className="sm:col-span-2">
                            <label className="text-sm font-600">Special instructions</label>
                            <textarea value={details.instructions} onChange={(e) => setDetails({ ...details, instructions: e.target.value })} rows={3} placeholder="Door code, allergies, etc." className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary" />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h2 className="font-display text-xl font-600">Payment method</h2>
                        <p className="mt-1 text-sm text-muted-foreground">No online payment processing — pay at pickup or arrange directly with the restaurant.</p>
                        <div className="mt-4 space-y-3">
                            <PayOption selected={payment === "card"} onClick={() => setPayment("card")} icon={CreditCard} title="Card" desc="Visa, Mastercard" />
                            <PayOption selected={payment === "mobile"} onClick={() => setPayment("mobile")} icon={Smartphone} title="Mobile payment" desc="MobilePay, Pivo" />
                            <PayOption selected={payment === "pickup"} onClick={() => setPayment("pickup")} icon={Banknote} title="Pay at pickup" desc="Cash or card at the restaurant" />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span><span className="font-600">€{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery fee</span><span className="font-600">{type === "delivery" ? `€${deliveryFee.toFixed(2)}` : "—"}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span><span className="font-600">€{serviceFee.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-600">Total</span><span className="font-display text-2xl font-700 text-primary">€{total.toFixed(2)}</span>
                </div>
            </div>

            {placeOrderMutation.isError && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {(/** @type {any} */ (placeOrderMutation.error))?.response?.data?.error || placeOrderMutation.error?.message || "Failed to place order"}
                </div>
            )}

            <div className="mt-6 flex items-center justify-between">
                <button
                    onClick={() => (step === 0 ? navigate("/cart") : setStep(step - 1))}
                    className="flex items-center gap-1.5 text-sm font-600 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Back to cart" : "Back"}
                </button>
                {step < 3 ? (
                    <Button onClick={() => setStep(step + 1)} disabled={!canContinue()} className="rounded-full bg-primary px-8 py-3 font-700 hover:opacity-90">
                        Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={submit} disabled={!canContinue() || placeOrderMutation.isPending} className="rounded-full bg-spice-gradient px-8 py-3 font-700 text-white hover:opacity-95">
                        {placeOrderMutation.isPending ? "Processing…" : `Place order · €${total.toFixed(2)}`}
                    </Button>
                )}
            </div>
        </div>
    );
}

function Option({ selected, onClick, icon: Icon, title, desc, meta }) {
    return (
        <button onClick={onClick} className={cn("flex items-start gap-4 rounded-2xl border p-5 text-left transition", selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary")}>
            <div className={cn("grid h-11 w-11 place-items-center rounded-xl", selected ? "bg-spice-gradient text-white" : "bg-secondary text-foreground")}><Icon className="h-5 w-5" /></div>
            <div>
                <div className="font-700">{title}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{desc}</div>
                <div className="mt-1 text-xs font-600 text-primary">{meta}</div>
            </div>
        </button>
    );
}

function Chip({ active, onClick, children }) {
    return <button onClick={onClick} className={cn("rounded-full border px-4 py-2 text-sm font-600 transition", active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = "text", full = false }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label className="text-sm font-600">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
    );
}

function PayOption({ selected, onClick, icon: Icon, title, desc }) {
    return (
        <button onClick={onClick} className={cn("flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition", selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary")}>
            <div className={cn("grid h-10 w-10 place-items-center rounded-xl", selected ? "bg-spice-gradient text-white" : "bg-secondary")}><Icon className="h-5 w-5" /></div>
            <div className="flex-1"><div className="font-700">{title}</div><div className="text-sm text-muted-foreground">{desc}</div></div>
            <div className={cn("grid h-5 w-5 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{selected && <Check className="h-3 w-3" />}</div>
        </button>
    );
}