import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Store } from "lucide-react";
import { useSubmitApplication } from "@/hooks/useMarketplaceData";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";
import { cities, businessTypes } from "@/lib/constants";

export default function BecomePartner() {
    const { user } = useMarketplaceUser();
    const submitMutation = useSubmitApplication();
    const [form, setForm] = useState({
        name: "", owner: "", email: user?.email || "", phone: "", type: "Restaurant", city: "Helsinki", address: "", cuisine: "", description: "", pickup: true, delivery: true,
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = (e) => {
        e.preventDefault();
        submitMutation.mutate(
            {
                business_name: form.name,
                owner_name: form.owner,
                email: form.email,
                phone: form.phone,
                city: form.city,
                address: form.address,
                business_type: form.type,
                cuisine: form.cuisine,
                description: form.description,
                pickup: form.pickup,
                delivery: form.delivery,
            },
            {
                onError: (err) => {
                    alert(err?.response?.data?.error || err?.message || "Failed to submit application");
                },
            }
        );
    };

    if (submitMutation.isSuccess) {
        return (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100"><CheckCircle2 className="h-11 w-11 text-green-600" /></div>
                <h1 className="mt-5 font-display text-3xl font-600">Application received!</h1>
                <p className="mt-2 text-muted-foreground">Your application will be reviewed by LankaEats before your store goes live. We'll contact you at <span className="font-600 text-foreground">{form.email}</span> within 2–3 business days.</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link to="/" className="rounded-full border border-border px-6 py-3 text-sm font-700 hover:border-primary">Back to home</Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <section className="relative overflow-hidden bg-spice-gradient px-6 py-16 text-white">
                <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                <div className="relative mx-auto max-w-3xl">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-600 uppercase tracking-widest backdrop-blur"><Store className="h-3.5 w-3.5" /> Partner with LankaEats</span>
                    <h1 className="mt-4 font-display text-4xl font-600">List Your Food Business</h1>
                    <p className="mt-3 max-w-xl text-white/90">Get your own online store on LankaEats, reach customers across Finland and manage everything from one dashboard.</p>
                </div>
            </section>

            <form onSubmit={submit} className="mx-auto max-w-3xl px-6 py-10">
                <div className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
                    <Field label="Business name" value={form.name} onChange={(v) => set("name", v)} placeholder="Colombo Spice House" full />
                    <Field label="Owner name" value={form.owner} onChange={(v) => set("owner", v)} placeholder="Nuwan Perera" />
                    <Field label="Email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@business.fi" type="email" />
                    <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+358 40 123 4567" />
                    <div>
                        <label className="text-sm font-600">Business type</label>
                        <select value={form.type} onChange={(e) => set("type", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary">
                            {businessTypes.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-600">Municipality</label>
                        <select value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary">
                            {cities.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <Field label="Address" value={form.address} onChange={(v) => set("address", v)} placeholder="Street, postal code" full />
                    <Field label="Cuisine / categories" value={form.cuisine} onChange={(v) => set("cuisine", v)} placeholder="Rice & Curry, Kottu, Hoppers" full />
                    <div className="sm:col-span-2">
                        <label className="text-sm font-600">Description</label>
                        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Tell customers about your food…" className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/30 p-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="sm:col-span-2 flex gap-6">
                        <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={form.pickup} onChange={(e) => set("pickup", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Pickup available</label>
                        <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={form.delivery} onChange={(e) => set("delivery", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Delivery available</label>
                    </div>
                </div>

                {submitMutation.isError && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        {submitMutation.error?.response?.data?.error || submitMutation.error?.message || "Failed to submit application"}
                    </div>
                )}

                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    Your application will be reviewed by LankaEats before your store goes live.
                </div>

                <button type="submit" disabled={submitMutation.isPending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-spice-gradient py-3.5 text-base font-700 text-white shadow-warm hover:opacity-95 disabled:opacity-50">
                    {submitMutation.isPending ? "Submitting…" : "Submit application"} <ArrowRight className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = "text", full }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <label className="text-sm font-600">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
    );
}