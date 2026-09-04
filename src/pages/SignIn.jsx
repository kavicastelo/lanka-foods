import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { authApi } from "@/api/authApi";
import { safeReturnTo } from "@/lib/authReturnTo";
import { Button } from "@/components/ui/button";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const returnTo = safeReturnTo();

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await authApi.login(email, password);
            window.location.href = returnTo;
        } catch (err) {
            setError(err.message || "Invalid email or password");
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <div className="relative hidden lg:block">
                <img src="/images/hero.webp" alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />
                <div className="absolute bottom-0 p-10 text-white">
                    <div className="flex items-center gap-2">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-spice-gradient"><UtensilsCrossed className="h-5 w-5" /></div>
                        <span className="font-display text-2xl font-700">LankaEats Finland</span>
                    </div>
                    <p className="mt-3 max-w-md text-white/85">The multi-restaurant marketplace for Sri Lankan food businesses across Finland. Sign in to manage your restaurant, orders and customers.</p>
                </div>
            </div>

            <div className="flex items-center justify-center bg-secondary/30 px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-6 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white"><UtensilsCrossed className="h-5 w-5" /></div>
                        <span className="font-display text-xl font-700">LankaEats Finland</span>
                    </div>
                    <h1 className="font-display text-2xl font-700">Welcome back</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Sign in to your LankaEats account.</p>

                    {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <div>
                            <label className="text-sm font-600">Email</label>
                            <div className="relative mt-1.5">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary" />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-600">Password</label>
                            <div className="relative mt-1.5">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary" />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-700">
                            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        New to LankaEats? <Link to="/register" className="font-700 text-primary hover:underline">Create an account</Link>
                    </p>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        <Link to="/forgot-password" className="hover:underline">Forgot password?</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}