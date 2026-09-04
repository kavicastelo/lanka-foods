import React from "react";
import { FileText, ShieldAlert, Scale, Clock, CheckCircle } from "lucide-react";

export default function TermsAndConditions() {
    return (
        <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
            {/* Header */}
            <div className="border-b border-border pb-8 space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-widest text-primary">
                    <Scale className="h-4 w-4" /> Legal Framework
                </div>
                <h1 className="font-display text-4xl font-700">Terms and Conditions</h1>
                <p className="text-sm text-muted-foreground">
                    Effective Date: September 1, 2026 | LankaEats Finland Operations
                </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-8 text-muted-foreground leading-relaxed text-sm">
                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" /> 1. Introduction & Acceptance
                    </h2>
                    <p>
                        Welcome to LankaEats Finland ("LankaEats", "we", "us", or "our"). By accessing or using our online marketplace website, mobile interfaces, or partner portals, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using our platform services.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> 2. Platform Services & Merchant Relationship
                    </h2>
                    <p>
                        LankaEats acts as an intermediary online food marketplace enabling customers to browse menus, order food for pickup or delivery, and submit payments to independent partner restaurants and food merchants located in Finland.
                    </p>
                    <p>
                        Each merchant is solely responsible for food preparation, ingredient disclosure (including allergen information), food safety, hygiene standards, and fulfillment timeliness.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" /> 3. User Accounts & Responsibilities
                    </h2>
                    <p>
                        To place orders or register as a partner, you must provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" /> 4. Pricing, Payments & Invoicing
                    </h2>
                    <p>
                        All menu prices are displayed in Euros (€) and include applicable Finnish Value Added Tax (ALV/VAT). Delivery fees, service charges, and min-order thresholds are calculated transparently prior to checkout.
                    </p>
                    <p>
                        Payments are processed securely via verified payment gateways. Merchant partner settlements are conducted periodically in accordance with issued period financial invoices.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" /> 5. Cancellations & Refund Policy
                    </h2>
                    <p>
                        Once an order is accepted by the merchant kitchen, cancellations may not be guaranteed if food preparation has commenced. In the event of missing items, order quality issues, or failed deliveries, customers may contact LankaEats support or submit a review for prompt investigation and resolution.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="font-display text-xl font-600 text-foreground flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" /> 6. Intellectual Property & Governing Law
                    </h2>
                    <p>
                        All platform software, design tokens, logos, and original content remain the exclusive property of LankaEats Finland. These terms shall be governed by and construed in accordance with the laws of Finland, without regard to its conflict of law provisions.
                    </p>
                </section>
            </div>

            {/* Footer Note */}
            <div className="rounded-2xl border border-border bg-card p-6 text-xs text-muted-foreground">
                For legal inquiries or terms clarification, please contact our legal team at <a href="mailto:legal@lankaeats.fi" className="text-primary font-600 hover:underline">legal@lankaeats.fi</a>.
            </div>
        </div>
    );
}
