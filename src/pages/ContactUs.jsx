import React, { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactApi } from "@/api/contactApi";

export default function ContactUs() {
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [form, setForm] = useState({
        name: "",
        email: "",
        category: "General Inquiry",
        subject: "",
        message: "",
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.message) return;
        setSubmitting(true);
        setErrorMsg("");
        try {
            await contactApi.submitForm(form);
            setSubmitted(true);
        } catch (err) {
            const error = /** @type {any} */ (err);
            setErrorMsg(error?.response?.data?.error || error?.message || "Failed to send message. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-16 py-10">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-spice-gradient px-6 py-16 text-white shadow-warm sm:px-12">
                <div className="relative mx-auto max-w-3xl text-center space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-700 uppercase tracking-wider backdrop-blur">
                        <MessageSquare className="h-3.5 w-3.5" /> We're Here to Help
                    </span>
                    <h1 className="font-display text-4xl font-700 sm:text-5xl">Contact LankaEats</h1>
                    <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto font-400">
                        Have a question about an order, restaurant partnership, or feedback? Send us a message and our team in Helsinki will respond promptly.
                    </p>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-3">
                {/* Contact Cards */}
                <div className="space-y-6 lg:col-span-1">
                    <h2 className="font-display text-2xl font-600">Get in Touch</h2>
                    <ContactCard
                        icon={Mail}
                        title="Customer Support"
                        info="support@lankaeats.fi"
                        sub="Response within 24 hours"
                    />
                    <ContactCard
                        icon={Phone}
                        title="Partner & Merchant Hotline"
                        info="+358 40 987 6543"
                        sub="Mon–Fri 09:00 – 17:00 (EET)"
                    />
                    <ContactCard
                        icon={MapPin}
                        title="Helsinki Hub"
                        info="Mannerheimintie 18, 00100 Helsinki"
                        sub="Finland"
                    />
                    <ContactCard
                        icon={Clock}
                        title="Service Hours"
                        info="10:00 – 22:00 Daily"
                        sub="Customer order assistance"
                    />
                </div>

                {/* Contact Form Container */}
                <div className="lg:col-span-2">
                    <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
                        {submitted ? (
                            <div className="py-12 text-center space-y-4">
                                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="font-display text-2xl font-600">Message Received!</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Thank you, <strong className="text-foreground">{form.name}</strong>. We’ve received your inquiry regarding "<span className="text-foreground font-600">{form.subject || form.category}</span>" and sent a confirmation to <strong className="text-foreground">{form.email}</strong>.
                                </p>
                                <div className="pt-4">
                                    <Button
                                        onClick={() => {
                                            setSubmitted(false);
                                            setForm({ name: "", email: "", category: "General Inquiry", subject: "", message: "" });
                                        }}
                                        variant="outline"
                                        className="rounded-full px-6 py-2 text-xs font-700"
                                    >
                                        Send Another Message
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <h2 className="font-display text-2xl font-600">Send Us a Message</h2>
                                    <p className="mt-1 text-sm text-muted-foreground">Fill out the form below and we’ll get back to you shortly.</p>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Your Name *</label>
                                        <input
                                            required
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => set("name", e.target.value)}
                                            placeholder="Nuwan Perera"
                                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Your Email *</label>
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => set("email", e.target.value)}
                                            placeholder="you@example.fi"
                                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Inquiry Category</label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => set("category", e.target.value)}
                                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary"
                                        >
                                            <option>General Inquiry</option>
                                            <option>Order Support</option>
                                            <option>Merchant Partnership</option>
                                            <option>Feedback / Suggestion</option>
                                            <option>Billing & Invoices</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Subject</label>
                                        <input
                                            type="text"
                                            value={form.subject}
                                            onChange={(e) => set("subject", e.target.value)}
                                            placeholder="Brief topic summary"
                                            className="mt-1.5 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-700 uppercase tracking-wide text-muted-foreground">Message *</label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={form.message}
                                        onChange={(e) => set("message", e.target.value)}
                                        placeholder="How can we help you today?"
                                        className="mt-1.5 w-full resize-none rounded-xl border border-border bg-secondary/30 p-4 text-sm outline-none focus:border-primary"
                                    />
                                </div>

                                {errorMsg && (
                                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-600 text-destructive">
                                        {errorMsg}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-spice-gradient px-8 py-3.5 text-sm font-700 text-white shadow-warm transition hover:opacity-95 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send Message"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ContactCard({ icon: Icon, title, info, sub }) {
    return (
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h3 className="text-xs font-700 uppercase tracking-wider text-muted-foreground">{title}</h3>
                <div className="mt-0.5 text-base font-600">{info}</div>
                <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
        </div>
    );
}
