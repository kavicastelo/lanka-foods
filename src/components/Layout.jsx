import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Layout() {
    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden w-full max-w-full">
            <Navbar />
            <main className="flex-1 w-full max-w-full">
                <Outlet />
            </main>
            <Footer />
        </div>

    );
}