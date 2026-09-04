import React from "react";
import { Shield, Lock, Eye, Database, UserCheck } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
            {/* Header */}
            <div className="border-b border-border pb-8 space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-primary">
                    <Shield className="h-4 w-4" /> GDPR & Data Protection
                </div>
                <h1 className="font-display text-4xl font-700">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground">
                    Effective Date: September 1, 2026 | LankaEats Finland Data Notice
                </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">
                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" /> 1. Commitment to Privacy
                    </h2>
                    <p>
                        LankaEats Finland ("LankaEats") is committed to respecting and protecting the privacy rights of all visitors, customers, and merchant partners. This Privacy Policy details how we collect, store, process, and safeguard personal data in compliance with the EU General Data Protection Regulation (GDPR) and Finnish data protection laws.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" /> 2. Information We Collect
                    </h2>
                    <p>We may collect and process the following categories of data:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong className="text-foreground">Account & Contact Information:</strong> Name, email address, phone number, and account credentials when registering or placing an order.</li>
                        <li><strong className="text-foreground">Fulfillment Details:</strong> Delivery address, pickup preference, and special order instructions.</li>
                        <li><strong className="text-foreground">Merchant Data:</strong> Business name, Tax ID / Y-tunnus, banking details for payment slip verification, and owner contacts.</li>
                        <li><strong className="text-foreground">Technical Data:</strong> IP address, device type, browser settings, and local storage state used for cart persistence.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" /> 3. How We Use Your Data
                    </h2>
                    <p>Your personal data is strictly processed for legitimate operational purposes:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>Facilitating food ordering, payment processing, and merchant kitchen communication.</li>
                        <li>Sending real-time order status updates and delivery tracking notifications.</li>
                        <li>Issuing merchant financial invoices and auditing period settlements.</li>
                        <li>Improving application performance, UX responsiveness, and security defenses.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-primary" /> 4. Data Sharing & Third Parties
                    </h2>
                    <p>
                        We do not sell or rent personal data to third-party advertisers. Data is shared exclusively with necessary service partners (e.g., partner restaurants fulfilling your food order, verified payment gateway providers, and cloud hosting infrastructure).
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" /> 5. Your Rights Under GDPR
                    </h2>
                    <p>As a data subject in the EU/Finland, you possess the right to:</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>Request access to the personal data we hold about you.</li>
                        <li>Request correction of inaccurate or incomplete information.</li>
                        <li>Request erasure of your personal data ("Right to be Forgotten").</li>
                        <li>Withdraw consent for optional communications at any time.</li>
                    </ul>
                </section>
            </div>

            {/* Footer Note */}
            <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
                To exercise your GDPR privacy rights or contact our Data Protection Officer, email <a href="mailto:privacy@lankaeats.fi" className="text-primary font-600 hover:underline">privacy@lankaeats.fi</a>.
            </div>
        </div>
    );
}
