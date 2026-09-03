import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
    cyan: "bg-cyan-100 text-cyan-700",
    green: "bg-green-100 text-green-700",
    slate: "bg-slate-200 text-slate-600",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
};

const ORDER_TONE = {
    received: "amber",
    accepted: "blue",
    preparing: "indigo",
    ready: "violet",
    out_for_delivery: "cyan",
    completed: "green",
    cancelled: "slate",
    rejected: "red",
};

const RESTAURANT_TONE = {
    active: "green",
    pending: "amber",
    suspended: "red",
    rejected: "slate",
    changes_requested: "orange",
};

const LABELS = {
    received: "Pending",
    out_for_delivery: "Out for Delivery",
    changes_requested: "Changes Requested",
};

const fmt = (s) => (LABELS[s] ? LABELS[s] : s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export default function StatusBadge({ status, kind = "order", className = "" }) {
    const map = kind === "restaurant" ? RESTAURANT_TONE : ORDER_TONE;
    const tone = map[status] || "slate";
    return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-700 capitalize", TONES[tone], className)}>{fmt(status)}</span>;
}