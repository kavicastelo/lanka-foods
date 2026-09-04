import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Heart, ShieldCheck, Users, Sparkles, MapPin, Star, ArrowRight } from "lucide-react";

export default function AboutUs() {
    return (
        <div className="space-y-16 py-10">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-spice-gradient px-6 py-20 text-white shadow-warm sm:px-12 lg:px-16">
                <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-black/20 blur-xl pointer-events-none" />
                <div className="relative mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-700 uppercase tracking-wider backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Connecting Flavors & Culture
                    </span>
                    <h1 className="mt-5 font-display text-4xl font-700 sm:text-5xl lg:text-6xl leading-tight">
                        Bringing Authentic Sri Lankan Cuisine to Finland
                    </h1>
                    <p className="mt-4 text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto font-400">
                        LankaEats was created with a single passionate goal: to bridge food lovers across Finland with the rich, aromatic spices and heritage of authentic Sri Lankan culinary traditions.
                    </p>
                </div>
            </section>

            {/* Story & Mission Section */}
            <section className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-2 items-center">
                <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-primary">
                        <UtensilsCrossed className="h-4 w-4" /> Our Story
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-600">From Home Kitchens to Your Doorstep</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Whether it’s sizzling Kottu Roti prepared fresh on the griddle, fragrant lamprais wrapped in banana leaf, crisp hopper bowls, or comforting dhal curry, finding real Sri Lankan taste in the Nordics used to be a challenge.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        LankaEats connects top Sri Lankan restaurants, specialty home chefs, and authentic food artisans across Helsinki, Espoo, Vantaa, and beyond into one seamless online food marketplace.
                    </p>
                    <div className="pt-2 flex items-center gap-4">
                        <Link to="/restaurants" className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-700 text-primary-foreground transition hover:opacity-90">
                            Explore Restaurants <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard icon={MapPin} number="4+" label="Finnish Cities" sub="Helsinki, Espoo, Vantaa, Tampere" />
                    <StatCard icon={Star} number="4.8★" label="Average Rating" sub="From authentic food lovers" />
                    <StatCard icon={Users} number="100%" label="Partner Support" sub="Empowering local food merchants" />
                    <StatCard icon={Heart} number="Fresh" label="Daily Ingredients" sub="Authentic spice recipes" />
                </div>
            </section>

            {/* Core Values Section */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="text-center max-w-2xl mx-auto">
                    <h2 className="font-display text-3xl font-600">What Drives LankaEats</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Our core commitments to our customers, restaurant partners, and community.</p>
                </div>
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <ValueCard
                        icon={Sparkles}
                        title="Uncompromised Authenticity"
                        description="We partner exclusively with chefs and kitchens that preserve genuine Sri Lankan flavor profiles, spices, and cooking techniques."
                    />
                    <ValueCard
                        icon={Users}
                        title="Empowering Local Merchants"
                        description="We provide independent restaurants and home chefs with digital tools to reach thousands of new customers effortlessly."
                    />
                    <ValueCard
                        icon={ShieldCheck}
                        title="Transparency & Quality"
                        description="From clear ingredient tags (Vegetarian, Halal, Catering) to verified customer feedback, we prioritize consumer trust."
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 text-center shadow-lg space-y-4">
                    <h3 className="font-display text-2xl sm:text-3xl font-600">Are you a food business owner?</h3>
                    <p className="max-w-xl mx-auto text-sm text-muted-foreground">
                        Join the LankaEats partner network today and start accepting pickup and delivery orders with zero hassle.
                    </p>
                    <div className="pt-2">
                        <Link to="/for-partners" className="inline-flex items-center gap-2 rounded-full bg-spice-gradient px-8 py-3.5 text-sm font-700 text-white shadow-warm transition hover:opacity-95">
                            Partner With Us <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatCard({ icon: Icon, number, label, sub }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-xs">
            <Icon className="h-6 w-6 text-primary" />
            <div className="font-display text-3xl font-700">{number}</div>
            <div className="text-sm font-600">{label}</div>
            <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
    );
}

function ValueCard({ icon: Icon, title, description }) {
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
