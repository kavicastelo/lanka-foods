import React, { useState, useMemo } from "react";
import { LayoutDashboard, Store, ClipboardList, Users, Star, DollarSign, Settings, TrendingUp, ShoppingBag, Check, X, Eye, Ban, RotateCcw, MessageSquare, Search } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useAllRestaurants, useRestaurantApplications, useAllReviews, useCommissionConfig, useDashboardMetrics, useApproveApplication, useRejectApplication, useRequestChanges, useSetRestaurantStatus, useSetCommissionRate } from "@/hooks/useMarketplaceData";
import { ordersApi } from "@/api/ordersApi";
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
    const { data: commissionConfig } = useCommissionConfig();
    const { data: metrics } = useDashboardMetrics("admin");
    const [allOrders, setAllOrders] = useState([]);

    // Fetch all orders (admin can read all)
    React.useEffect(() => {
        ordersApi.getOrders().then((res) => setAllOrders(res.orders || res || [])).catch(() => { });
    }, []);

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
        const customers = new Set(allOrders.map((o) => o.customer_id).filter(Boolean)).size;
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
    }, [restaurants, applications, allOrders, reviews, commissionRate]);

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
        if (f.restaurant && o.restaurant_id !== f.restaurant) return false;
        if (f.status && o.status !== f.status) return false;
        if (f.type && o.delivery_type !== f.type) return false;
        if (f.q && !(o.customer_name || "").toLowerCase().includes(f.q.toLowerCase())) return false;
        return true;
    });
    const select = "rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
    return (
        <Card className="p-0">
            <div className="flex flex-wrap gap-2 border-b border-border p-4">
                <select value={f.restaurant} onChange={(e) => setF({ ...f, restaurant: e.target.value })} className={select}>
                    <option value="">All restaurants</option>
                    {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
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
                        {filtered.map((o) => (
                            <tr key={o.id} className="border-t border-border">
                                <td className="px-4 py-3 font-600">{o.order_number}</td>
                                <td className="px-4 py-3">{restaurants.find((r) => r.id === o.restaurant_id)?.name}</td>
                                <td className="px-4 py-3">{o.customer_name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{o.scheduled_date} {o.scheduled_time}</td>
                                <td className="px-4 py-3 capitalize">{o.delivery_type}</td>
                                <td className="px-4 py-3 font-700">€{(o.total || 0).toFixed(2)}</td>
                                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Customers({ orders }) {
    const customers = useMemo(() => {
        const map = {};
        orders.forEach((o) => {
            const key = o.customer_id;
            if (!key || key === "legacy-import") return;
            if (!map[key]) map[key] = { id: key, name: o.customer_name, email: o.customer_email || "", orders: 0, spending: 0, lastOrder: null };
            map[key].orders += 1;
            if (!["cancelled", "rejected"].includes(o.status)) map[key].spending += o.total || 0;
            if (!map[key].lastOrder || (o.placed_at || "") > map[key].lastOrder) map[key].lastOrder = o.placed_at;
        });
        return Object.values(map);
    }, [orders]);

    return (
        <Card className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Customer</th>
                            <th className="px-4 py-3 font-600">Email</th>
                            <th className="px-4 py-3 font-600">Orders</th>
                            <th className="px-4 py-3 font-600">Total spending</th>
                            <th className="px-4 py-3 font-600">Last order</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((c) => (
                            <tr key={c.id} className="border-t border-border">
                                <td className="px-4 py-3 font-600">{c.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                                <td className="px-4 py-3">{c.orders}</td>
                                <td className="px-4 py-3 font-700">€{c.spending.toFixed(2)}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{c.lastOrder ? c.lastOrder.slice(0, 10) : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Reviews({ reviews, restaurants }) {
    const [removing, setRemoving] = useState(null);
    const removeReview = async (id) => {
        setRemoving(id);
        try {
            alert("Review removed");
            window.location.reload();
        } catch (_e) {
            alert("Failed to delete review");
        }
        setRemoving(null);
    };
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
                        {reviews.map((r) => (
                            <tr key={r.id} className="border-t border-border">
                                <td className="px-4 py-3 font-600">{restaurants.find((x) => x.id === r.restaurantId)?.name || r.restaurantId}</td>
                                <td className="px-4 py-3">{r.author}</td>
                                <td className="px-4 py-3">{r.rating}★</td>
                                <td className="px-4 py-3 max-w-xs text-muted-foreground">"{r.text}"</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">{r.date}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => removeReview(r.id)} disabled={removing === r.id} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-600 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                                        {removing === r.id ? "Removing…" : "Remove"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Revenue({ monthlyData, rows, stats }) {
    const totalGross = monthlyData.reduce((s, m) => s + (m.gross || 0), 0);
    const totalPlatform = monthlyData.reduce((s, m) => s + (m.platform || 0), 0);
    const totalOrders = monthlyData.reduce((s, m) => s + (m.orders || 0), 0);
    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={TrendingUp} label="Total GMV (6mo)" value={`€${totalGross.toLocaleString()}`} sub="gross order value" />
                <StatCard icon={DollarSign} label="Platform revenue" value={`€${totalPlatform.toLocaleString()}`} sub={`${stats.commissionRate}% commission`} />
                <StatCard icon={ClipboardList} label="Orders (6mo)" value={totalOrders} sub={totalOrders > 0 ? `avg €${(totalGross / totalOrders).toFixed(2)}` : ""} />
                <StatCard icon={Store} label="Active restaurants" value={stats.active} sub="earning" />
            </div>
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
    const [rate, setRate] = useState(commissionRate);
    const [overrides, setOverrides] = useState({});
    const setCommissionRate = useSetCommissionRate();
    const [savedDefault, setSavedDefault] = useState(false);

    const saveDefault = () => {
        setCommissionRate.mutate({ rate });
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
                <div className="mt-4 flex items-center gap-3">
                    <input type="number" min={0} max={50} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-28 rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary" />
                    <span className="text-2xl font-700">%</span>
                    <Button onClick={saveDefault} className="rounded-xl">Save</Button>
                    {savedDefault && <span className="text-sm font-600 text-primary">Saved</span>}
                    <span className="text-sm text-muted-foreground">Example: €100 order → €{(100 * rate / 100).toFixed(2)} LankaEats, €{(100 - 100 * rate / 100).toFixed(2)} restaurant.</span>
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
                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                        <Mini label="Total orders" value={row.orderCount} />
                        <Mini label="Total revenue" value={`€${(row.gross || 0).toFixed(0)}`} />
                        <Mini label="Platform rev." value={`€${(row.platform || 0).toFixed(0)}`} />
                        <Mini label="Rating" value={row.rating ? `${row.rating}★` : "—"} />
                    </div>
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