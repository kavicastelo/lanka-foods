import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Instagram, Facebook } from "lucide-react";

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-border bg-secondary/40">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-spice-gradient text-white">
                            <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        <span className="font-display text-xl font-600">LankaEats Finland</span>
                    </div>
                    <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                        The home of authentic Sri Lankan food in Finland. Discover restaurants, home chefs and food stores near you.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <a className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground transition hover:text-primary" href="https://instagram.com" target="_blank" rel="noreferrer"><Instagram className="h-4 w-4" /></a>
                        <a className="grid h-9 w-9 place-items-center rounded-full bg-background text-muted-foreground transition hover:text-primary" href="https://facebook.com" target="_blank" rel="noreferrer"><Facebook className="h-4 w-4" /></a>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-700">Marketplace</h4>
                    <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                        <li><Link to="/restaurants" className="hover:text-primary">Browse restaurants</Link></li>
                        <li><Link to="/restaurants" className="hover:text-primary">Categories & Cuisines</Link></li>
                        <li><Link to="/for-partners" className="hover:text-primary">List your food business</Link></li>
                        <li><Link to="/account" className="hover:text-primary">My account & orders</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-700">For Partners</h4>
                    <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                        <li><Link to="/for-partners" className="hover:text-primary">Why partner with us</Link></li>
                        <li><Link to="/partner" className="hover:text-primary">Partner application form</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-sm font-700">Company & Legal</h4>
                    <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                        <li><Link to="/about" className="hover:text-primary">About us</Link></li>
                        <li><Link to="/contact" className="hover:text-primary">Contact us</Link></li>
                        <li><Link to="/terms" className="hover:text-primary">Terms & Conditions</Link></li>
                        <li><Link to="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} LankaEats Finland. Made with 🤍 for Sri Lankan food lovers.
            </div>
        </footer>
    );
}