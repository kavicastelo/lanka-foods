import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await base44.auth.resetPasswordRequest(email);
            // Always show generic success — the API hides whether the email exists
            setSent(true);
        } catch (err) {
            // Per the auth contract, always show generic success even on error
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid min-h-screen place-items-center bg-secondary/30 px-6 py-12">
            <div className="w-full max-w-md">
                <Link to="/login" className="mb-6 flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white"><UtensilsCrossed className="h-5 w-5" /></div>
                    <span className="font-display text-xl font-700">LankaEats Finland</span>
                </Link>
                <div className="rounded-2xl border border-border bg-card p-6">
                    {sent ? (
                        <div className="text-center">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-700"><CheckCircle2 className="h-7 w-7" /></div>
                            <h1 className="mt-4 font-display text-xl font-700">Check your email</h1>
                            <p className="mt-2 text-sm text-muted-foreground">If an account exists for {email}, we've sent a password reset link.</p>
                            <Link to="/login" className="mt-4 inline-block text-sm font-700 text-primary hover:underline">Back to sign in</Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="font-display text-xl font-700">Reset your password</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                            {error && <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                            <form onSubmit={submit} className="mt-5 space-y-4">
                                <div>
                                    <label className="text-sm font-600">Email</label>
                                    <div className="relative mt-1.5">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary" placeholder="you@example.com" />
                                    </div>
                                </div>
                                <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-700">
                                    {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : "Send reset link"}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
                <p className="mt-4 text-center text-sm text-muted-foreground"><Link to="/login" className="hover:underline">Back to sign in</Link></p>
            </div>
        </div>
    );
}