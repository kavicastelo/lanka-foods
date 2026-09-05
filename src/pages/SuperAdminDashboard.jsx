import React, { useState, useMemo } from "react";
import { LayoutDashboard, Store, ClipboardList, Users, Star, DollarSign, Settings, TrendingUp, ShoppingBag, Check, X, Eye, Ban, RotateCcw, MessageSquare, Search, Plus } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useAllRestaurants, useRestaurantApplications, useAllReviews, useCommissionConfig, useDashboardMetrics, useApproveApplication, useRejectApplication, useRequestChanges, useSetRestaurantStatus, useSetCommissionRate, useAdminFinancialRecords, useSettleFinancialRecord, useAdminUsers, useUpdateUserStatus, useDeleteReview, useAdminOrders, useAdminInvoices, useGenerateInvoice, useMarkInvoicePaid } from "@/hooks/useMarketplaceData";

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "restaurants", label: "Restaurants", icon: Store },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "customers", label: "Customers", icon: Users },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings },
];

export default function SuperAdminDashboard() {
    const [tab, setTab] = useState("overview");
    const [detail, setDetail] = useState(null);

    const { data: restaurants = [] } = useAllRestaurants();
    const { data: applications = [] } = useRestaurantApplications();
    const { data: reviews = [] } = useAllReviews();
    const { data: users = [] } = useAdminUsers();
    const { data: allOrders = [] } = useAdminOrders();
    const { data: commissionConfig } = useCommissionConfig();
    const { data: metrics } = useDashboardMetrics("admin");

    const commissionRate = commissionConfig?.default_rate ?? 10;
    const monthlyData = metrics?.monthlyData || [];

    const restaurantRows = useMemo(() => {
        const live = restaurants.map((r) => {
            const ro = allOrders.filter((o) => o.restaurant_id === r.id && !["cancelled", "rejected"].includes(o.status));
            const gross = ro.reduce((s, o) => s + (o.total || 0), 0);
            const rate = r.commission_rate ?? commissionRate;
            const platform = +(gross * rate / 100).toFixed(2);
            return { ...r, orderCount: ro.length, gross, platform, restaurantRev: +(gross - platform).toFixed(2), rate, kind: "live" };
        });
        const pending = applications.filter((a) => a.status === "pending").map((p) => ({
            id: p.id, name: p.business_name, owner: p.owner_name, email: p.email, phone: p.phone,
            city: p.city, address: p.address, cuisines: p.cuisine ? p.cuisine.split(",").map(s => s.trim()) : [],
            description: p.description, status: "pending", rating: 0, reviewCount: 0, orderCount: 0,
            gross: 0, platform: 0, restaurantRev: 0, rate: commissionRate, kind: "pending",
            submitted: p.submitted_date,
        }));
        return [...live, ...pending];
    }, [restaurants, applications, allOrders, commissionRate]);

    const stats = useMemo(() => {
        const active = restaurants.filter((r) => r.status === "active").length;
        const pending = applications.filter((a) => a.status === "pending").length;
        const customerUsers = users.filter((u) => u.role === "CUSTOMER" || u.role === "USER");
        const customers = customerUsers.length > 0 ? customerUsers.length : (users.length || new Set(allOrders.map((o) => o.customer_id).filter(Boolean)).size);
        const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
        return {
            total: restaurants.length,
            active,
            pending,
            customers,
            totalOrders: allOrders.length,
            avg: avg.toFixed(2),
            commissionRate,
        };
    }, [restaurants, applications, allOrders, reviews, users, commissionRate]);

    const titles = {
        overview: ["Marketplace overview", "Performance across all restaurants"],
        restaurants: ["Restaurants", "Approve, suspend and manage restaurants"],
        orders: ["All orders", "Every order across the marketplace"],
        customers: ["Customers", "Registered customers and their activity"],
        reviews: ["Reviews", "Moderate customer reviews"],
        revenue: ["Platform revenue", "Commission, GMV and payouts"],
        settings: ["Platform settings", "Configure commission and marketplace options"],
    };

    return (
        <DashboardLayout nav={nav} active={tab} onNavigate={setTab} title={titles[tab][0]} subtitle={titles[tab][1]}>
            {tab === "overview" && <Overview stats={stats} monthlyData={monthlyData} rows={restaurantRows} onOpen={setDetail} />}
            {tab === "restaurants" && <Restaurants rows={restaurantRows} onOpen={setDetail} />}
            {tab === "orders" && <Orders orders={allOrders} restaurants={restaurants} />}
            {tab === "customers" && <Customers orders={allOrders} />}
            {tab === "reviews" && <Reviews reviews={reviews} restaurants={restaurants} />}
            {tab === "revenue" && <Revenue monthlyData={monthlyData} rows={restaurantRows} stats={stats} />}
            {tab === "settings" && <SettingsTab restaurants={restaurants} commissionRate={commissionRate} />}
            {detail && <DetailModal row={detail} onClose={() => setDetail(null)} />}
        </DashboardLayout>
    );
}

function Card({ children, className = "" }) {
    return <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>{children}</div>;
}

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }) {
    return (
        <Card>
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className={cn("grid h-9 w-9 place-items-center rounded-xl", tone === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent")}><Icon className="h-4 w-4" /></div>
            </div>
            <div className="mt-2 font-display text-3xl font-700">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </Card>
    );
}

function Overview({ stats, monthlyData, rows, onOpen }) {
    const pieData = [
        { name: "Active", value: stats.active, color: "hsl(142 60% 38%)" },
        { name: "Pending", value: stats.pending, color: "hsl(32 88% 52%)" },
    ];
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Store} label="Total restaurants" value={stats.total} sub={`${stats.active} active`} />
                <StatCard icon={ShoppingBag} label="Pending approvals" value={stats.pending} sub="awaiting review" tone="accent" />
                <StatCard icon={Users} label="Total customers" value={stats.customers} sub="from orders" />
                <StatCard icon={Star} label="Avg. rating" value={`${stats.avg}★`} sub="marketplace" />
                <StatCard icon={ClipboardList} label="Total orders" value={stats.totalOrders} sub="all time" />
                <StatCard icon={TrendingUp} label="Commission rate" value={`${stats.commissionRate}%`} sub="platform" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <h3 className="font-700">Revenue trend</h3>
                    <p className="text-xs text-muted-foreground">Gross order value vs platform commission (last 6 months)</p>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 22% 90%)" />
                                <XAxis dataKey="month" stroke="hsl(20 10% 42%)" fontSize={12} />
                                <YAxis stroke="hsl(20 10% 42%)" fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="gross" name="Gross GMV" fill="hsl(142 60% 38%)" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="platform" name="Platform" fill="hsl(32 88% 52%)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-700">Restaurant status</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
            <Card>
                <div className="flex items-center justify-between">
                    <h3 className="font-700">Recently registered</h3>
                </div>
                <div className="mt-3 space-y-2">
                    {rows.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-2.5 text-sm">
                            <button onClick={() => onOpen(r)} className="flex items-center gap-3 text-left">
                                <span className="grid h-9 w-9 place-items-center rounded-lg bg-spice-gradient text-xs font-700 text-white">{(r.name || "RE").slice(0, 2).toUpperCase()}</span>
                                <div>
                                    <div className="font-600">{r.name}</div>
                                    <div className="text-xs text-muted-foreground">{r.city} · {r.owner}</div>
                                </div>
                            </button>
                            <StatusBadge status={r.status} kind="restaurant" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function Restaurants({ rows, onOpen }) {
    const approve = useApproveApplication();
    const reject = useRejectApplication();
    const requestChanges = useRequestChanges();
    const setStatus = useSetRestaurantStatus();

    return (
        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Restaurant</th>
                            <th className="px-4 py-3 font-600">Owner</th>
                            <th className="px-4 py-3 font-600">Location</th>
                            <th className="px-4 py-3 font-600">Status</th>
                            <th className="px-4 py-3 font-600">Rating</th>
                            <th className="px-4 py-3 font-600">Orders</th>
                            <th className="px-4 py-3 font-600">GMV</th>
                            <th className="px-4 py-3 font-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="border-t border-border">
                                <td className="px-4 py-3">
                                    <button onClick={() => onOpen(r)} className="font-600 hover:text-primary">{r.name}</button>
                                    <div className="text-xs text-muted-foreground">{r.email}</div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{r.owner}</td>
                                <td className="px-4 py-3 text-muted-foreground">{r.city}</td>
                                <td className="px-4 py-3"><StatusBadge status={r.status} kind="restaurant" /></td>
                                <td className="px-4 py-3">{r.rating ? `${r.rating}★` : "—"}</td>
                                <td className="px-4 py-3">{r.orderCount}</td>
                                <td className="px-4 py-3 font-600">€{(r.gross || 0).toFixed(0)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        <IconBtn icon={Eye} onClick={() => onOpen(r)} title="View" />
                                        {r.status === "pending" && (
                                            <>
                                                <IconBtn icon={Check} tone="primary" onClick={() => approve.mutate(r.id)} title="Approve" />
                                                <IconBtn icon={X} tone="danger" onClick={() => reject.mutate(r.id)} title="Reject" />
                                                <IconBtn icon={MessageSquare} onClick={() => requestChanges.mutate(r.id)} title="Request changes" />
                                            </>
                                        )}
                                        {r.status === "active" && <IconBtn icon={Ban} tone="danger" onClick={() => setStatus.mutate({ restaurantId: r.id, status: "suspended" })} title="Suspend" />}
                                        {r.status === "suspended" && <IconBtn icon={RotateCcw} tone="primary" onClick={() => setStatus.mutate({ restaurantId: r.id, status: "active" })} title="Reactivate" />}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function IconBtn({ icon: Icon, onClick, title, tone = "default" }) {
    return (
        <button onClick={onClick} title={title} className={cn("grid h-8 w-8 place-items-center rounded-lg border border-border transition", tone === "primary" && "border-primary bg-primary text-primary-foreground hover:opacity-90", tone === "danger" && "border-destructive/30 text-destructive hover:bg-destructive/10", tone === "default" && "hover:border-primary")}>
            <Icon className="h-4 w-4" />
        </button>
    );
}

function Orders({ orders, restaurants }) {
    const [f, setF] = useState({ restaurant: "", status: "", type: "", q: "" });
    const filtered = orders.filter((o) => {
        const rId = o.restaurantId || o.restaurant_id;
        const dType = o.deliveryType || o.delivery_type;
        const cName = o.customerName || o.customer_name || o.customer || "";

        if (f.restaurant && rId !== f.restaurant) return false;
        if (f.status && o.status !== f.status) return false;
        if (f.type && dType !== f.type) return false;
        if (f.q && !cName.toLowerCase().includes(f.q.toLowerCase())) return false;
        return true;
    });
    const select = "rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
    return (
        <Card className="p-0">
            <div className="flex flex-wrap gap-2 border-b border-border p-4">
                <select value={f.restaurant} onChange={(e) => setF({ ...f, restaurant: e.target.value })} className={select}>
                    <option value="">All restaurants</option>
                    {restaurants.map((r) => <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>)}
                </select>
                <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={select}>
                    <option value="">All statuses</option>
                    {["received", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "rejected"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={select}>
                    <option value="">All types</option>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                </select>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search customer" className={cn(select, "pl-9")} />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Order</th>
                            <th className="px-4 py-3 font-600">Restaurant</th>
                            <th className="px-4 py-3 font-600">Customer</th>
                            <th className="px-4 py-3 font-600">Date</th>
                            <th className="px-4 py-3 font-600">Type</th>
                            <th className="px-4 py-3 font-600">Amount</th>
                            <th className="px-4 py-3 font-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                                    No orders found matching the selected filters.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((o) => {
                                const rId = o.restaurantId || o.restaurant_id;
                                const rest = restaurants.find((r) => (r.id || r._id) === rId);
                                const restName = rest?.name || "Restaurant";
                                const custName = o.customerName || o.customer_name || o.customer || "Customer";
                                const orderNum = o.orderNumber || o.order_number || o.id;
                                const schedDate = o.scheduledDate || o.scheduled_date || o.date || "";
                                const schedTime = o.scheduledTime || o.scheduled_time || o.slot || "";
                                const dType = o.deliveryType || o.delivery_type || "delivery";

                                return (
                                    <tr key={o.id} className="border-t border-border">
                                        <td className="px-4 py-3 font-600">{orderNum}</td>
                                        <td className="px-4 py-3">{restName}</td>
                                        <td className="px-4 py-3">{custName}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{schedDate} {schedTime}</td>
                                        <td className="px-4 py-3 capitalize">{dType}</td>
                                        <td className="px-4 py-3 font-700">€{(o.total || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Customers({ orders }) {
    const { data: users = [] } = useAdminUsers();
    const updateUserStatus = useUpdateUserStatus();
    const [q, setQ] = useState("");

    const displayCustomers = useMemo(() => {
        if (users.length > 0) {
            return users
                .filter((u) => u.role === "CUSTOMER" || u.role === "USER")
                .map((u) => ({
                    id: u.id,
                    name: u.fullName || u.email.split("@")[0],
                    email: u.email,
                    phone: u.phone,
                    role: u.role,
                    orders: u.orderCount || 0,
                    spending: u.totalSpending || 0,
                    lastOrder: u.lastOrderAt ? u.lastOrderAt.slice(0, 10) : "—",
                    isActive: u.isActive !== false,
                }));
        }

        // Fallback to order aggregated list
        const map = {};
        orders.forEach((o) => {
            const key = o.customer_id;
            if (!key || key === "legacy-import") return;
            if (!map[key]) map[key] = { id: key, name: o.customer_name, email: o.customer_email || "", orders: 0, spending: 0, lastOrder: null, isActive: true };
            map[key].orders += 1;
            if (!["cancelled", "rejected"].includes(o.status)) map[key].spending += o.total || 0;
            if (!map[key].lastOrder || (o.placed_at || "") > map[key].lastOrder) map[key].lastOrder = o.placed_at;
        });
        return Object.values(map);
    }, [users, orders]);

    const filtered = displayCustomers.filter((c) => {
        if (!q) return true;
        const query = q.toLowerCase();
        return (c.name || "").toLowerCase().includes(query) || (c.email || "").toLowerCase().includes(query);
    });

    return (
        <Card className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search customers by name or email..."
                        className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Customer Name</th>
                            <th className="px-4 py-3 font-600">Email & Phone</th>
                            <th className="px-4 py-3 font-600">Total Orders</th>
                            <th className="px-4 py-3 font-600">Total Spending</th>
                            <th className="px-4 py-3 font-600">Last Order</th>
                            <th className="px-4 py-3 font-600">Account Status</th>
                            <th className="px-4 py-3 font-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                                    No registered customers found.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((c) => (
                                <tr key={c.id} className="border-t border-border">
                                    <td className="px-4 py-3 font-600">{c.name}</td>
                                    <td className="px-4 py-3">
                                        <div>{c.email}</div>
                                        {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                                    </td>
                                    <td className="px-4 py-3">{c.orders}</td>
                                    <td className="px-4 py-3 font-700">€{(c.spending || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastOrder}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600",
                                            c.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                                        )}>
                                            {c.isActive ? "Active" : "Suspended"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => updateUserStatus.mutate({ userId: c.id, isActive: !c.isActive })}
                                            disabled={updateUserStatus.isPending}
                                        >
                                            {c.isActive ? "Suspend Account" : "Activate Account"}
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Reviews({ reviews, restaurants }) {
    const deleteReview = useDeleteReview();

    return (
        <Card className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Restaurant</th>
                            <th className="px-4 py-3 font-600">Customer</th>
                            <th className="px-4 py-3 font-600">Rating</th>
                            <th className="px-4 py-3 font-600">Review</th>
                            <th className="px-4 py-3 font-600">Date</th>
                            <th className="px-4 py-3 font-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reviews.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-6 text-center text-muted-foreground">
                                    No customer reviews posted yet.
                                </td>
                            </tr>
                        ) : (
                            reviews.map((r) => (
                                <tr key={r.id} className="border-t border-border">
                                    <td className="px-4 py-3 font-600">
                                        {restaurants.find((x) => x.id === r.restaurantId || x.id === r.restaurant_id)?.name || r.restaurantName || r.restaurantId}
                                    </td>
                                    <td className="px-4 py-3">{r.author || r.authorName || r.author_name}</td>
                                    <td className="px-4 py-3">{r.rating}★</td>
                                    <td className="px-4 py-3 max-w-xs text-muted-foreground">"{r.text || r.comment}"</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                        {r.date || (r.createdAt ? r.createdAt.slice(0, 10) : "—")}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => deleteReview.mutate(r.id)}
                                            disabled={deleteReview.isPending}
                                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-600 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                        >
                                            {deleteReview.isPending ? "Removing…" : "Remove"}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function GenerateInvoiceModal({ restaurants, onClose }) {
    const generateInvoice = useGenerateInvoice();
    const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id || restaurants[0]?._id || "");
    const [periodStart, setPeriodStart] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
    const [subscriptionFee, setSubscriptionFee] = useState("0");
    const [notes, setNotes] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!restaurantId) {
            setErrorMsg("Please select a restaurant.");
            return;
        }
        generateInvoice.mutate(
            {
                restaurantId,
                periodStart,
                periodEnd,
                subscriptionFee: parseFloat(subscriptionFee) || 0,
                notes,
            },
            {
                onSuccess: () => onClose(),
                onError: (err) => setErrorMsg((/** @type {any} */ (err)).response?.data?.error?.message || (/** @type {any} */ (err)).message || "Failed to generate invoice"),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-700">Generate Periodic Invoice</h3>
                    <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
                </div>
                {errorMsg && <div className="rounded-lg bg-destructive/10 p-3 text-xs font-600 text-destructive">{errorMsg}</div>}
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1">Target Restaurant</label>
                        <select
                            value={restaurantId}
                            onChange={(e) => setRestaurantId(e.target.value)}
                            className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary"
                        >
                            {restaurants.map((r) => (
                                <option key={r.id || r._id} value={r.id || r._id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-600 text-muted-foreground mb-1">Period Start</label>
                            <input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-600 text-muted-foreground mb-1">Period End</label>
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1">Subscription Fee (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={subscriptionFee}
                            onChange={(e) => setSubscriptionFee(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1">Notes / Billing Memo</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Monthly commission + service fee summary..."
                            className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={generateInvoice.isPending}>
                            {generateInvoice.isPending ? "Generating..." : "Generate & Issue Invoice"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Revenue({ monthlyData, rows, stats }) {
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [showGenModal, setShowGenModal] = useState(false);
    const { data: recordsData } = useAdminFinancialRecords();
    const { data: invoices = [] } = useAdminInvoices();
    const markInvoicePaid = useMarkInvoicePaid();
    const settleMutation = useSettleFinancialRecord();
    const records = Array.isArray(recordsData) ? recordsData : (recordsData?.data || []);

    const totalGross = monthlyData.reduce((s, m) => s + (m.gross || 0), 0);
    const totalPlatform = monthlyData.reduce((s, m) => s + (m.platform || 0), 0);

    const getFeeTotal = (r) => r.platformFeeTotal ?? ((r.commissionAmount || 0) + (r.serviceFee || 0));
    const pendingCommissionSum = records.filter((r) => r.status === "PENDING").reduce((s, r) => s + getFeeTotal(r), 0);
    const settledCommissionSum = records.filter((r) => r.status === "SETTLED").reduce((s, r) => s + getFeeTotal(r), 0);

    const liveRestaurants = rows.filter((r) => r.kind === "live");

    return (
        <div className="space-y-6">
            {showGenModal && <GenerateInvoiceModal restaurants={liveRestaurants} onClose={() => setShowGenModal(false)} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={TrendingUp} label="Total GMV (6mo)" value={`€${totalGross.toLocaleString()}`} sub="gross order value" />
                <StatCard icon={DollarSign} label="Platform Revenue" value={`€${totalPlatform.toLocaleString()}`} sub={`${stats.commissionRate}% default rate`} />
                <Card className="border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                        <span className="text-sm font-600">Pending Fees Owed</span>
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-2xl font-800 text-amber-700 dark:text-amber-400">€{pendingCommissionSum.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-amber-600/80">Unsettled (Commission + Service Fee)</div>
                </Card>
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                        <span className="text-sm font-600">Settled Platform Fees</span>
                        <Check className="h-5 w-5" />
                    </div>
                    <div className="mt-2 text-2xl font-800 text-emerald-700 dark:text-emerald-400">€{settledCommissionSum.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-emerald-600/80">Collected & confirmed</div>
                </Card>
            </div>

            {/* Issued Monthly Invoices Control Section */}
            <Card className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                    <div>
                        <h3 className="font-700">Periodic Monthly Invoices</h3>
                        <p className="text-xs text-muted-foreground">Consolidated invoices issued to restaurants for commission, service fees & platform subscriptions.</p>
                    </div>
                    <Button onClick={() => setShowGenModal(true)} className="gap-2">
                        <Plus className="h-4 w-4" /> Generate Monthly Invoice
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-600">Invoice #</th>
                                <th className="px-4 py-3 font-600">Restaurant</th>
                                <th className="px-4 py-3 font-600">Billing Period</th>
                                <th className="px-4 py-3 font-600">Orders</th>
                                <th className="px-4 py-3 font-600">Gross GMV</th>
                                <th className="px-4 py-3 font-600">Commission</th>
                                <th className="px-4 py-3 font-600">Service Fee</th>
                                <th className="px-4 py-3 font-600">Total Due</th>
                                <th className="px-4 py-3 font-600">Status</th>
                                <th className="px-4 py-3 font-600">Payment Slip</th>
                                <th className="px-4 py-3 font-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
                                        No invoices generated yet. Click "Generate Monthly Invoice" above to create one.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="border-t border-border">
                                        <td className="px-4 py-3 font-700">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-3 font-600">{inv.restaurantName}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{inv.periodStart} to {inv.periodEnd}</td>
                                        <td className="px-4 py-3">{inv.orderCount}</td>
                                        <td className="px-4 py-3">€{(inv.grossSales / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-500">€{(inv.totalCommission / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">€{(inv.totalServiceFee / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-800 text-amber-600 dark:text-amber-400">€{(inv.totalAmountDue / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600",
                                                inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            {inv.paymentSlipUrl ? (
                                                <a href={inv.paymentSlipUrl} target="_blank" rel="noopener noreferrer" className="font-600 text-primary hover:underline flex items-center gap-1">
                                                    <Eye className="h-3.5 w-3.5" /> View Slip
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {inv.status !== "PAID" ? (
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => markInvoicePaid.mutate(inv.id)}
                                                    disabled={markInvoicePaid.isPending}
                                                >
                                                    Confirm Payment
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Paid on {inv.paidAt ? inv.paidAt.slice(0, 10) : ""}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <h3 className="font-700">Monthly revenue</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 22% 90%)" />
                                <XAxis dataKey="month" stroke="hsl(20 10% 42%)" fontSize={12} />
                                <YAxis stroke="hsl(20 10% 42%)" fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="gross" name="Gross GMV" stroke="hsl(142 60% 38%)" strokeWidth={2} />
                                <Line type="monotone" dataKey="platform" name="Platform" stroke="hsl(32 88% 52%)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h3 className="font-700">Orders by month</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 22% 90%)" />
                                <XAxis dataKey="month" stroke="hsl(20 10% 42%)" fontSize={12} />
                                <YAxis stroke="hsl(20 10% 42%)" fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="orders" name="Orders" fill="hsl(220 60% 50%)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                    <div>
                        <h3 className="font-700">Commission Settlement & Invoicing Control</h3>
                        <p className="text-xs text-muted-foreground">Manage and confirm restaurant commission payments. Orders continue normally without interruption.</p>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
                    >
                        <option value="ALL">All Settlement Statuses</option>
                        <option value="PENDING">Pending Settlement</option>
                        <option value="SETTLED">Settled / Paid</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-600">Date</th>
                                <th className="px-4 py-3 font-600">Order #</th>
                                <th className="px-4 py-3 font-600">Restaurant</th>
                                <th className="px-4 py-3 font-600">Order Subtotal</th>
                                <th className="px-4 py-3 font-600">Rate</th>
                                <th className="px-4 py-3 font-600">Commission Fee</th>
                                <th className="px-4 py-3 font-600">Service Fee</th>
                                <th className="px-4 py-3 font-600">Total Platform Fee</th>
                                <th className="px-4 py-3 font-600">Restaurant Net</th>
                                <th className="px-4 py-3 font-600">Status</th>
                                <th className="px-4 py-3 font-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.filter((r) => {
                                if (statusFilter === "PENDING") return r.status === "PENDING";
                                if (statusFilter === "SETTLED") return r.status === "SETTLED";
                                return true;
                            }).length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
                                        No financial commission records found.
                                    </td>
                                </tr>
                            ) : (
                                records.filter((r) => {
                                    if (statusFilter === "PENDING") return r.status === "PENDING";
                                    if (statusFilter === "SETTLED") return r.status === "SETTLED";
                                    return true;
                                }).map((rec) => {
                                    const feeTotal = getFeeTotal(rec);
                                    return (
                                        <tr key={rec.id} className="border-t border-border">
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : "—"}
                                            </td>
                                            <td className="px-4 py-3 font-600">#{rec.orderNumber || rec.orderId?.slice(-6)}</td>
                                            <td className="px-4 py-3 font-500">{rec.restaurantName || rec.restaurantId}</td>
                                            <td className="px-4 py-3">€{(rec.orderSubtotal || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{rec.commissionRateSnapshot || rec.commissionRate}%</td>
                                            <td className="px-4 py-3 font-500">€{(rec.commissionAmount || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">€{(rec.serviceFee || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 font-600 text-amber-600 dark:text-amber-400">€{feeTotal.toFixed(2)}</td>
                                            <td className="px-4 py-3 font-600 text-emerald-600 dark:text-emerald-400">€{(rec.restaurantNetAmount || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                {rec.status === "SETTLED" ? (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-600 text-emerald-700 dark:text-emerald-400">
                                                        Settled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-600 text-amber-700 dark:text-amber-400">
                                                        Pending Invoice
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {rec.status === "SETTLED" ? (
                                                    <span className="text-xs text-emerald-700 font-500 flex items-center gap-1 dark:text-emerald-400">
                                                        <Check className="h-3.5 w-3.5" /> Settled via Invoice
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground font-500">
                                                        Awaiting Monthly Invoice
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="p-0">
                <h3 className="px-5 pt-4 font-700">Revenue by restaurant</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-600">Restaurant</th>
                                <th className="px-4 py-3 font-600">Orders</th>
                                <th className="px-4 py-3 font-600">Gross sales</th>
                                <th className="px-4 py-3 font-600">Commission</th>
                                <th className="px-4 py-3 font-600">Restaurant payout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.filter((r) => r.kind === "live").map((r) => (
                                <tr key={r.id} className="border-t border-border">
                                    <td className="px-4 py-3 font-600">{r.name}</td>
                                    <td className="px-4 py-3">{r.orderCount}</td>
                                    <td className="px-4 py-3">€{(r.gross || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-primary font-600">{r.rate}% · €{(r.platform || 0).toFixed(2)}</td>
                                    <td className="px-4 py-3 font-700">€{(r.restaurantRev || 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function SettingsTab({ restaurants, commissionRate }) {
    const { data: commissionConfig } = useCommissionConfig();
    const [rate, setRate] = useState(commissionRate);
    const [fee, setFee] = useState(commissionConfig?.serviceFee ?? 0.99);
    const [overrides, setOverrides] = useState({});
    const setCommissionRate = useSetCommissionRate();
    const [savedDefault, setSavedDefault] = useState(false);

    React.useEffect(() => {
        if (commissionConfig) {
            setRate(commissionConfig.defaultRate ?? commissionRate);
            setFee(commissionConfig.serviceFee ?? 0.99);
        }
    }, [commissionConfig, commissionRate]);

    const saveDefault = () => {
        setCommissionRate.mutate({ rate, serviceFee: fee });
        setSavedDefault(true);
        setTimeout(() => setSavedDefault(false), 2000);
    };

    const saveOverride = (restaurantId, rRate) => {
        setCommissionRate.mutate({ rate: rRate, restaurantId });
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="font-700">Default platform commission</h3>
                <p className="text-sm text-muted-foreground">Applied to all restaurants without a custom rate.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <input type="number" min={0} max={50} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-28 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    <span className="text-2xl font-700">%</span>
                    <Button onClick={saveDefault} className="rounded-xl">Save</Button>
                    {savedDefault && <span className="text-sm font-600 text-primary">Saved</span>}
                    <span className="w-full text-sm text-muted-foreground">Example: €100 order → €{(100 * rate / 100).toFixed(2)} LankaEats, €{(100 - 100 * rate / 100).toFixed(2)} restaurant.</span>
                </div>
            </Card>

            <Card>
                <h3 className="font-700">Platform customer service fee</h3>
                <p className="text-sm text-muted-foreground">Fixed fee charged to customers per order to support platform technology and support.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-xl font-700">€</span>
                    <input type="number" step="0.05" min={0} max={50} value={fee} onChange={(e) => setFee(+e.target.value)} className="w-32 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    <Button onClick={saveDefault} className="rounded-xl">Save service fee</Button>
                    {savedDefault && <span className="text-sm font-600 text-primary">Saved</span>}
                </div>
            </Card>

            <Card className="p-0">
                <h3 className="px-5 pt-4 font-700">Per-restaurant commission overrides</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr><th className="px-4 py-3 font-600">Restaurant</th><th className="px-4 py-3 font-600">Current rate</th><th className="px-4 py-3 font-600">Custom rate</th><th className="px-4 py-3 font-600"></th></tr>
                        </thead>
                        <tbody>
                            {restaurants.map((r) => (
                                <tr key={r.id} className="border-t border-border">
                                    <td className="px-4 py-3 font-600">{r.name}</td>
                                    <td className="px-4 py-3">{r.commission_rate ?? commissionRate}%</td>
                                    <td className="px-4 py-3"><input type="number" min={0} max={50} value={overrides[r.id] ?? r.commission_rate ?? ""} onChange={(e) => setOverrides({ ...overrides, [r.id]: +e.target.value })} placeholder="default" className="w-24 rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary" /></td>
                                    <td className="px-4 py-3"><button onClick={() => saveOverride(r.id, overrides[r.id])} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-700 text-primary-foreground">Apply</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function DetailModal({ row, onClose }) {
    const approve = useApproveApplication();
    const reject = useRejectApplication();
    const requestChanges = useRequestChanges();
    const setStatus = useSetRestaurantStatus();
    const setCommissionRate = useSetCommissionRate();
    const [rate, setRate] = useState(row.commissionRate ?? row.commission_rate ?? "");
    const [savedRate, setSavedRate] = useState(false);

    const applyRate = () => {
        if (typeof rate === "number") {
            setCommissionRate.mutate({ rate, restaurantId: row.id });
            setSavedRate(true);
            setTimeout(() => setSavedRate(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-spice-gradient text-sm font-700 text-white">{(row.name || "RE").slice(0, 2).toUpperCase()}</span>
                        <div>
                            <h2 className="font-display text-lg font-700">{row.name}</h2>
                            <div className="text-sm text-muted-foreground">{row.owner} · {row.city}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={row.status} kind="restaurant" />
                        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><X className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Info label="Email" value={row.email} />
                    <Info label="Phone" value={row.phone} />
                    <Info label="Address" value={row.address} full />
                    <Info label="Cuisines" value={row.cuisines ? row.cuisines.join(", ") : row.cuisine} full />
                    <Info label="Description" value={row.description} full />
                </div>
                {row.kind === "live" && (
                    <>
                        <div className="mt-5 grid gap-3 sm:grid-cols-4">
                            <Mini label="Total orders" value={row.orderCount} />
                            <Mini label="Total revenue" value={`€${(row.gross || 0).toFixed(0)}`} />
                            <Mini label="Platform rev." value={`€${(row.platform || 0).toFixed(0)}`} />
                            <Mini label="Rating" value={row.rating ? `${row.rating}★` : "—"} />
                        </div>
                        <div className="mt-5 rounded-xl border border-border p-4">
                            <h4 className="font-700 text-sm">Commission Rate Override</h4>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    type="number"
                                    min={0}
                                    max={50}
                                    value={rate}
                                    onChange={(e) => setRate(+e.target.value)}
                                    placeholder="Default %"
                                    className="w-28 rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-primary"
                                />
                                <span className="font-700">%</span>
                                <Button size="sm" onClick={applyRate} disabled={setCommissionRate.isPending} className="h-8 rounded-lg text-xs">
                                    {setCommissionRate.isPending ? "Saving..." : "Save Rate"}
                                </Button>
                                {savedRate && <span className="text-xs font-600 text-primary">Saved!</span>}
                            </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            {row.status === "active" && (
                                <Button variant="destructive" size="sm" onClick={() => { setStatus.mutate({ restaurantId: row.id, status: "suspended" }); onClose(); }} className="rounded-xl">
                                    Suspend Restaurant
                                </Button>
                            )}
                            {row.status === "suspended" && (
                                <Button size="sm" onClick={() => { setStatus.mutate({ restaurantId: row.id, status: "active" }); onClose(); }} className="rounded-xl">
                                    Reactivate Restaurant
                                </Button>
                            )}
                        </div>
                    </>
                )}
                {row.status === "pending" && (
                    <div className="mt-6 flex gap-3">
                        <Button onClick={() => { approve.mutate(row.id); onClose(); }} className="rounded-xl">Approve restaurant</Button>
                        <Button variant="outline" onClick={() => { reject.mutate(row.id); onClose(); }} className="rounded-xl">Reject</Button>
                        <Button variant="outline" onClick={() => { requestChanges.mutate(row.id); onClose(); }} className="rounded-xl">Request changes</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function Info({ label, value, full = false }) {
    return (
        <div className={full ? "sm:col-span-2" : ""}>
            <div className="text-xs font-600 uppercase text-muted-foreground">{label}</div>
            <div className="text-sm font-600">{value || "—"}</div>
        </div>
    );
}

function Mini({ label, value }) {
    return <div className="rounded-xl bg-secondary/50 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-display text-lg font-700">{value}</div></div>;
}