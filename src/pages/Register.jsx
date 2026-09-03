import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Store, User, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { authApi } from "@/api/authApi";
import { applicationsApi } from "@/api/applicationsApi";
import { safeReturnTo } from "@/lib/authReturnTo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Register() {
    const [tab, setTab] = useState("customer");
    const [step, setStep] = useState("form"); // form | done
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [appSubmitted, setAppSubmitted] = useState(false);

    const [c, setC] = useState({ name: "", email: "", phone: "", password: "" });
    const [r, setR] = useState({ name: "", owner: "", email: "", phone: "", address: "", city: "Helsinki", cuisine: "", description: "", pickup: true, delivery: true, password: "" });
    const [otp, setOtp] = useState("");

    const verifyOtp = async (e) => {
        e.preventDefault();
    };

    const returnTo = safeReturnTo();
    const input = "w-full rounded-xl border border-border bg-card py-2.5 px-4 text-sm outline-none focus:border-primary";

    const submitCustomer = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authApi.register({
                email: c.email,
                password: c.password,
                fullName: c.name,
                phone: c.phone,
                role: 'CUSTOMER',
            });
            window.location.href = returnTo;
        } catch (err) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    const submitRestaurant = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            // Register user as Customer first, then submit partner application
            await authApi.register({
                email: r.email,
                password: r.password,
                fullName: r.owner,
                phone: r.phone,
                role: 'CUSTOMER',
            });

            await applicationsApi.apply({
                businessName: r.name,
                ownerName: r.owner,
                email: r.email,
                phone: r.phone,
                city: r.city,
                address: r.address,
                cuisineType: r.cuisine || "Sri Lankan",
                description: r.description || "Authentic Sri Lankan food supplier",
            });

            setAppSubmitted(true);
            setStep("done");
        } catch (err) {
            setError(err.message || "Registration or application failed");
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
    };

    // --- Done state (restaurant application submitted) ---
    if (step === "done" && appSubmitted) {
        return (
            <div className="grid min-h-screen place-items-center bg-secondary/30 px-6">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><UtensilsCrossed className="h-7 w-7" /></div>
                    <h1 className="mt-4 font-display text-2xl font-700">Application submitted</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Your restaurant application is now under review. You can sign in as a customer, but your restaurant goes live once the LankaEats team approves it.</p>
                    <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-700 text-primary-foreground">Back to home</Link>
                </div>
            </div>
        );
    }

    // --- OTP step ---
    if (step === "otp") {
        const email = tab === "customer" ? c.email : r.email;
        return (
            <div className="grid min-h-screen place-items-center bg-secondary/30 px-6 py-12">
                <div className="w-full max-w-md">
                    <Link to="/" className="mb-6 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white"><UtensilsCrossed className="h-5 w-5" /></div>
                        <span className="font-display text-xl font-700">LankaEats Finland</span>
                    </Link>
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-7 w-7" /></div>
                        <h1 className="mt-4 text-center font-display text-2xl font-700">Verify your email</h1>
                        <p className="mt-1 text-center text-sm text-muted-foreground">We sent a verification code to {email}. Enter it below.</p>
                        {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                        <form onSubmit={verifyOtp} className="mt-5 space-y-4">
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter verification code"
                                className="w-full rounded-xl border border-border bg-card py-3 px-4 text-center text-lg tracking-widest outline-none focus:border-primary"
                                autoFocus
                                required
                            />
                            <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-700">
                                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : <>Verify & continue <ArrowRight className="h-4 w-4" /></>}
                            </Button>
                        </form>
                        <button onClick={resendOtp} className="mt-4 w-full text-center text-sm text-primary hover:underline">Resend code</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Form step ---
    return (
        <div className="grid min-h-screen place-items-center bg-secondary/30 px-6 py-12">
            <div className="w-full max-w-lg">
                <Link to="/" className="mb-6 flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white"><UtensilsCrossed className="h-5 w-5" /></div>
                    <span className="font-display text-xl font-700">LankaEats Finland</span>
                </Link>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <h1 className="font-display text-2xl font-700">Create your account</h1>
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-1">
                        <button onClick={() => setTab("customer")} className={cn("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-700 transition", tab === "customer" ? "bg-card shadow-sm" : "text-muted-foreground")}><User className="h-4 w-4" /> Customer</button>
                        <button onClick={() => setTab("restaurant")} className={cn("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-700 transition", tab === "restaurant" ? "bg-card shadow-sm" : "text-muted-foreground")}><Store className="h-4 w-4" /> Restaurant</button>
                    </div>

                    {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                    {tab === "customer" ? (
                        <form onSubmit={submitCustomer} className="mt-5 space-y-4">
                            <Field label="Full name"><input required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} className={input} placeholder="Mika Korhonen" /></Field>
                            <Field label="Email"><input required type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className={input} placeholder="you@example.com" /></Field>
                            <Field label="Phone"><input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} className={input} placeholder="+358 ..." /></Field>
                            <Field label="Password"><input required type="password" value={c.password} onChange={(e) => setC({ ...c, password: e.target.value })} className={input} placeholder="••••••••" /></Field>
                            <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-700">
                                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <>Create customer account <ArrowRight className="h-4 w-4" /></>}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={submitRestaurant} className="mt-5 space-y-4">
                            <Field label="Restaurant name"><input required value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} className={input} placeholder="Galle Garden Kitchen" /></Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Owner name"><input required value={r.owner} onChange={(e) => setR({ ...r, owner: e.target.value })} className={input} placeholder="Nuwan Perera" /></Field>
                                <Field label="City"><input value={r.city} onChange={(e) => setR({ ...r, city: e.target.value })} className={input} /></Field>
                            </div>
                            <Field label="Email"><input required type="email" value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} className={input} placeholder="orders@restaurant.fi" /></Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Phone"><input value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} className={input} placeholder="+358 ..." /></Field>
                                <Field label="Cuisines"><input value={r.cuisine} onChange={(e) => setR({ ...r, cuisine: e.target.value })} className={input} placeholder="Rice & Curry, Hoppers" /></Field>
                            </div>
                            <Field label="Address"><input value={r.address} onChange={(e) => setR({ ...r, address: e.target.value })} className={input} placeholder="Street, postal code, city" /></Field>
                            <Field label="Description"><textarea value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} rows={2} className={input} /></Field>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={r.pickup} onChange={(e) => setR({ ...r, pickup: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Pickup</label>
                                <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={r.delivery} onChange={(e) => setR({ ...r, delivery: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Delivery</label>
                            </div>
                            <Field label="Password"><input required type="password" value={r.password} onChange={(e) => setR({ ...r, password: e.target.value })} className={input} placeholder="••••••••" /></Field>
                            <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-700">
                                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <>Submit restaurant application <ArrowRight className="h-4 w-4" /></>}
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">Your restaurant goes live once the LankaEats team approves it.</p>
                        </form>
                    )}
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-700 text-primary hover:underline">Sign in</Link></p>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="text-sm font-600">{label}</label>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}