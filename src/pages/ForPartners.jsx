import React from "react";
import { Link } from "react-router-dom";
import { Store, TrendingUp, ShieldCheck, Clock, CheckCircle2, ArrowRight, HelpCircle, FileText } from "lucide-react";

export default function ForPartners() {
    const faqs = [
        {
            q: "What types of businesses can join LankaEats?",
            a: "We welcome licensed restaurants, food stores, specialty caterers, and certified home kitchens operating across Finland.",
        },
        {
            q: "How do payouts and invoice settlements work?",
            a: "LankaEats issues consolidated period invoices with automated VAT breakdown and commission calculations. Payouts are settled directly to your Finnish bank account.",
        },
        {
            q: "Can I offer both Pickup and Delivery?",
            a: "Yes! You can choose to enable Pickup only, Delivery only, or both, as well as set your custom delivery radius and minimum order value.",
        },
        {
            q: "How long does the application approval take?",
            a: "Our team reviews new applications within 1–2 business days. Once approved, you get instant access to your Restaurant Admin Dashboard.",
        },
    ];

    return (
        <div className="space-y-16 py-10">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-spice-gradient px-6 py-20 text-white shadow-warm sm:px-12 lg:px-16">
                <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative mx-auto max-w-3xl text-center space-y-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-700 uppercase tracking-wider backdrop-blur">
                        <Store className="h-3.5 w-3.5" /> For Restaurant Owners & Chefs
                    </span>
                    <h1 className="font-display text-4xl font-700 sm:text-5xl lg:text-6xl leading-tight">
                        Grow Your Food Business Across Finland
                    </h1>
                    <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto font-400">
                        Join the premier Sri Lankan food marketplace in the Nordics. Connect with thousands of hungry customers, manage menus, track sales, and receive seamless automated payouts.
                    </p>
                    <div className="pt-4 flex flex-wrap justify-center gap-4">
                        <Link to="/partner" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-700 text-foreground shadow-lg transition hover:bg-slate-100">
                            Apply Now <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Why Partner With Us Grid */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="font-display text-3xl font-600">Why Partner With LankaEats?</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Built specifically for food merchants to scale efficiently with maximum control.</p>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard
                        icon={TrendingUp}
                        title="Reach New Customers"
                        description="Expand beyond your neighborhood. Tap into a dedicated audience seeking Sri Lankan food across Helsinki, Espoo, Vantaa, and Tampere."
                    />
                    <FeatureCard
                        icon={ShieldCheck}
                        title="Transparent Invoicing"
                        description="Track sales, commission rates, and period invoices in real-time. Upload payment slips and manage settlement history effortlessly."
                    />
                    <FeatureCard
                        icon={Clock}
                        title="Full Menu & Hours Control"
                        description="Easily toggle dish availability, update prices on the fly, set pickup/delivery options, and configure custom preparation times."
                    />
                </div>
            </section>

            {/* 3 Step Onboarding Flow */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm">
                    <h2 className="font-display text-3xl font-600 text-center">3 Simple Steps to Get Started</h2>
                    <div className="mt-10 grid gap-8 md:grid-cols-3">
                        <StepCard
                            step="01"
                            title="Submit Application"
                            description="Fill out our quick 2-minute partner application with your business details and location."
                        />
                        <StepCard
                            step="02"
                            title="Setup Your Store"
                            description="Access your dedicated dashboard, customize your store cover, upload your logo, and add your menu items."
                        />
                        <StepCard
                            step="03"
                            title="Receive Orders"
                            description="Start accepting pickup & delivery orders immediately. Manage live order statuses from kitchen to delivery."
                        />
                    </div>
                </div>
            </section>

            {/* Partner FAQ Section */}
            <section className="mx-auto max-w-4xl px-6 space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-primary">
                        <HelpCircle className="h-4 w-4" /> Partner FAQ
                    </div>
                    <h2 className="mt-2 font-display text-3xl font-600">Frequently Asked Questions</h2>
                </div>

                <div className="grid gap-4">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="rounded-2xl border border-border bg-card p-6 space-y-2">
                            <h3 className="font-display text-lg font-600 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                {faq.q}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed pl-7">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bottom CTA Banner */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="rounded-3xl bg-secondary/60 border border-border p-8 sm:p-12 text-center space-y-4">
                    <FileText className="h-10 w-10 text-primary mx-auto" />
                    <h3 className="font-display text-2xl sm:text-3xl font-600">Ready to list your restaurant or kitchen?</h3>
                    <p className="max-w-xl mx-auto text-sm text-muted-foreground">
                        Our partner onboarding team is ready to help you set up your store and go live.
                    </p>
                    <div className="pt-2">
                        <Link to="/partner" className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-700 text-primary-foreground shadow-md transition hover:opacity-90">
                            Start Application <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-600">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}

function StepCard({ step, title, description }) {
    return (
        <div className="relative space-y-3">
            <div className="font-display text-4xl font-700 text-primary/30">{step}</div>
            <h3 className="font-display text-xl font-600">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
