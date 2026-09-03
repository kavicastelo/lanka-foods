import React, { useState, useMemo } from "react";
import { ClipboardList, ListOrdered, UtensilsCrossed, Settings, DollarSign, Star, Plus, Trash2, Check, Clock, AlertCircle, TrendingUp, ShoppingBag, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useMyRestaurant, useRestaurantMenu, useRestaurantOrders, useRestaurantReviews, useUpdateOrderStatus, useManageMenuCategory, useManageMenuItem, useDashboardMetrics, useCommissionConfig } from "@/hooks/useMarketplaceData";
import { restaurantsApi } from "@/api/restaurantsApi";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import StarRating from "@/components/StarRating";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
    { id: "open", label: "Open Orders", icon: ClipboardList },
    { id: "orders", label: "All Orders", icon: ListOrdered },
    { id: "menu", label: "Menu", icon: UtensilsCrossed },
    { id: "settings", label: "Restaurant Settings", icon: Settings },
    { id: "revenue", label: "Revenue & Analytics", icon: DollarSign },
    { id: "reviews", label: "Reviews", icon: Star },
];

export default function RestaurantAdminDashboard() {
    const { data: restaurant, isLoading } = useMyRestaurant();
    const [tab, setTab] = useState("open");

    if (isLoading) {
        return <div className="grid min-h-screen place-items-center bg-secondary/30"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
    }

    if (!restaurant) {
        return (
            <div className="grid min-h-screen place-items-center bg-secondary/30 px-6">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700"><AlertCircle className="h-7 w-7" /></div>
                    <h1 className="mt-4 font-display text-xl font-700">No restaurant linked</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Your account is not linked to a restaurant. If you've applied, your application is under review.</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-700 text-amber-700"><Clock className="h-3.5 w-3.5" /> Pending approval</div>
                </div>
            </div>
        );
    }

    const titles = {
        open: ["Open orders", "Orders needing attention"],
        orders: ["All orders", `Every order for ${restaurant.name}`],
        menu: ["Menu management", "Manage your categories and dishes"],
        settings: ["Restaurant settings", "Update your restaurant information"],
        revenue: ["Revenue & analytics", "Track your performance"],
        reviews: ["Reviews", "What your customers are saying"],
    };

    return (
        <DashboardLayout nav={nav} active={tab} onNavigate={setTab} title={titles[tab][0]} subtitle={titles[tab][1]}>
            {tab === "open" && <OpenOrders restaurant={restaurant} />}
            {tab === "orders" && <AllOrders restaurant={restaurant} />}
            {tab === "menu" && <Menu restaurant={restaurant} />}
            {tab === "settings" && <SettingsTab restaurant={restaurant} />}
            {tab === "revenue" && <Revenue restaurant={restaurant} />}
            {tab === "reviews" && <Reviews restaurant={restaurant} />}
        </DashboardLayout>
    );
}

function StatCard({ icon: Icon, label, value, sub }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
            </div>
            <div className="mt-2 font-display text-3xl font-700">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        </div>
    );
}

function OpenOrders({ restaurant }) {
    const { data: orders = [] } = useRestaurantOrders(restaurant.id);
    const updateStatus = useUpdateOrderStatus();
    const openOrders = orders.filter((o) => ["received", "accepted", "preparing", "ready", "out_for_delivery"].includes(o.status));

    if (openOrders.length === 0) {
        return (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary" />
                <h3 className="mt-3 font-700">No open orders</h3>
                <p className="text-sm text-muted-foreground">New orders will appear here in real time.</p>
            </div>
        );
    }
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {openOrders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-700">{o.order_number}</div>
                            <div className="text-xs text-muted-foreground">{o.customer_name} · {o.scheduled_date} {o.scheduled_time}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-600 capitalize">{o.delivery_type}</span>
                            <StatusBadge status={o.status} />
                        </div>
                    </div>
                    <div className="mt-3 space-y-1 rounded-xl bg-secondary/40 p-3 text-sm">
                        {o.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>{i.qty}× {i.name}</span>
                                <span className="text-muted-foreground">€{(i.price * i.qty).toFixed(2)}</span>
                            </div>
                        ))}
                        {o.instructions && <div className="mt-1 border-t border-border pt-1 text-xs text-muted-foreground">Note: {o.instructions}</div>}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                        <span className="font-700">€{(o.total || 0).toFixed(2)}</span>
                        <div className="flex gap-2">
                            {o.status === "received" && (
                                <>
                                    <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "accepted" })} className="rounded-lg">Accept</Button>
                                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "rejected" })} className="rounded-lg text-destructive">Reject</Button>
                                </>
                            )}
                            {o.status === "accepted" && <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "preparing" })} className="rounded-lg">Start preparing</Button>}
                            {o.status === "preparing" && <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "ready" })} className="rounded-lg">Mark ready</Button>}
                            {o.status === "ready" && o.delivery_type === "delivery" && <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "out_for_delivery" })} className="rounded-lg">Out for delivery</Button>}
                            {o.status === "ready" && o.delivery_type === "pickup" && <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "completed" })} className="rounded-lg">Complete</Button>}
                            {o.status === "out_for_delivery" && <Button size="sm" onClick={() => updateStatus.mutate({ orderId: o.id, newStatus: "completed" })} className="rounded-lg">Complete</Button>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AllOrders({ restaurant }) {
    const { data: orders = [] } = useRestaurantOrders(restaurant.id);
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-600">Order</th>
                            <th className="px-4 py-3 font-600">Customer</th>
                            <th className="px-4 py-3 font-600">Items</th>
                            <th className="px-4 py-3 font-600">Type</th>
                            <th className="px-4 py-3 font-600">Date</th>
                            <th className="px-4 py-3 font-600">Amount</th>
                            <th className="px-4 py-3 font-600">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o) => (
                            <tr key={o.id} className="border-t border-border">
                                <td className="px-4 py-3 font-600">{o.order_number}</td>
                                <td className="px-4 py-3">{o.customer_name}</td>
                                <td className="px-4 py-3 text-muted-foreground">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                                <td className="px-4 py-3 capitalize">{o.delivery_type}</td>
                                <td className="px-4 py-3 text-muted-foreground">{o.scheduled_date} {o.scheduled_time}</td>
                                <td className="px-4 py-3 font-700">€{(o.total || 0).toFixed(2)}</td>
                                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Menu({ restaurant }) {
    const { data: categories = [] } = useRestaurantMenu(restaurant.id);
    const manageCategory = useManageMenuCategory();
    const manageItem = useManageMenuItem();
    const [adding, setAdding] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [form, setForm] = useState({ name: "", price: "", category: categories[0]?.id || "", desc: "", available: true });

    const submit = (e) => {
        e.preventDefault();
        if (!form.name || !form.price) return;
        manageItem.mutate({
            action: "create",
            restaurantId: restaurant.id,
            categoryId: form.category,
            name: form.name,
            price: +form.price,
            description: form.desc,
            imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            isAvailable: form.available,
            isVegetarian: false,
        });
        setForm({ ...form, name: "", price: "", desc: "" });
        setAdding(false);
    };

    const addCategory = () => {
        if (!newCat) return;
        manageCategory.mutate({ action: "create", restaurantId: restaurant.id, name: newCat });
        setNewCat("");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setAdding((a) => !a)} className="rounded-xl"><Plus className="h-4 w-4" /> Add food item</Button>
                <div className="flex items-center gap-2">
                    <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    <Button variant="outline" onClick={addCategory} className="rounded-xl">Add category</Button>
                </div>
            </div>

            {adding && (
                <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    <input required type="number" step="0.1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (€)" className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Short description" className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    <div className="flex items-center gap-4 sm:col-span-2">
                        <Button type="submit" className="rounded-xl">Save item</Button>
                        <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Available</label>
                    </div>
                </form>
            )}

            {categories.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-700">{c.name} <span className="text-sm font-400 text-muted-foreground">({c.items.length})</span></h3>
                        <button onClick={() => manageCategory.mutate({ action: "delete", restaurantId: restaurant.id, categoryId: c.id })} className="text-xs font-600 text-destructive hover:underline">Delete category</button>
                    </div>
                    <div className="mt-3 space-y-2">
                        {c.items.map((i) => (
                            <div key={i.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-2.5">
                                <Image src={i.image} alt={i.name} fittingType="fill" className="h-12 w-12 rounded-lg" />
                                <div className="flex-1">
                                    <div className="text-sm font-600">{i.name}</div>
                                    <div className="text-xs text-muted-foreground">{i.desc}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">€</span>
                                    <input type="number" step="0.1" defaultValue={i.price} onBlur={(e) => manageItem.mutate({ action: "update", restaurantId: restaurant.id, itemId: i.id, price: +e.target.value })} className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-sm outline-none focus:border-primary" />
                                </div>
                                <button onClick={() => manageItem.mutate({ action: "update", restaurantId: restaurant.id, itemId: i.id, isAvailable: !i.available })} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-700", i.available ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}>{i.available ? "Available" : "Disabled"}</button>
                                <button onClick={() => manageItem.mutate({ action: "delete", restaurantId: restaurant.id, itemId: i.id })} className="rounded-lg p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        ))}
                        {c.items.length === 0 && <div className="rounded-xl bg-secondary/30 p-3 text-center text-xs text-muted-foreground">No items in this category yet.</div>}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SettingsTab({ restaurant }) {
    const [s, setS] = useState({
        name: restaurant.name, phone: restaurant.phone, email: restaurant.email, address: restaurant.address,
        description: restaurant.description, hours: restaurant.hours, deliveryFee: restaurant.deliveryFee,
        minOrder: restaurant.minOrder, prepTime: restaurant.prepTime, pickup: restaurant.pickup, delivery: restaurant.delivery,
    });
    const [saved, setSaved] = useState(false);
    const input = "w-full rounded-xl border border-border bg-card py-2.5 px-4 text-sm outline-none focus:border-primary";
    const save = async (e) => {
        e.preventDefault();
        await restaurantsApi.updateRestaurant(restaurant.id, {
            name: s.name, phone: s.phone, email: s.email, address: s.address,
            description: s.description, hours: s.hours, deliveryFee: s.deliveryFee,
            minOrder: s.minOrder, prepTime: s.prepTime, pickup: s.pickup, delivery: s.delivery,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    return (
        <form onSubmit={save} className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
            <Field label="Restaurant name"><input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} className={input} /></Field>
            <Field label="Phone"><input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} className={input} /></Field>
            <Field label="Email"><input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} className={input} /></Field>
            <Field label="Address"><input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} className={input} /></Field>
            <Field label="Opening hours"><input value={s.hours} onChange={(e) => setS({ ...s, hours: e.target.value })} className={input} /></Field>
            <Field label="Preparation time"><input value={s.prepTime} onChange={(e) => setS({ ...s, prepTime: e.target.value })} className={input} /></Field>
            <Field label="Delivery fee (€)"><input type="number" step="0.1" value={s.deliveryFee} onChange={(e) => setS({ ...s, deliveryFee: +e.target.value })} className={input} /></Field>
            <Field label="Minimum order (€)"><input type="number" value={s.minOrder} onChange={(e) => setS({ ...s, minOrder: +e.target.value })} className={input} /></Field>
            <div className="sm:col-span-2"><Field label="Description"><textarea rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} className={input} /></Field></div>
            <div className="flex gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={s.pickup} onChange={(e) => setS({ ...s, pickup: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Pickup available</label>
                <label className="flex items-center gap-2 text-sm font-600"><input type="checkbox" checked={s.delivery} onChange={(e) => setS({ ...s, delivery: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Delivery available</label>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
                <Button type="submit" className="rounded-xl">Save changes</Button>
                {saved && <span className="flex items-center gap-1 text-sm font-600 text-primary"><Check className="h-4 w-4" /> Saved</span>}
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">Platform commission, approval status and platform settings are managed by LankaEats and cannot be changed here.</p>
        </form>
    );
}

function Revenue({ restaurant }) {
    const { data: orders = [] } = useRestaurantOrders(restaurant.id);
    const { data: metrics } = useDashboardMetrics("restaurant", restaurant.id);
    const { data: commissionConfig } = useCommissionConfig();
    const rate = restaurant.commission_rate ?? commissionConfig?.default_rate ?? 10;

    const completed = orders.filter((o) => o.status === "completed");
    const totalRevenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    const monthly = metrics?.monthlyData || [];

    const topItems = useMemo(() => {
        const map = {};
        orders.forEach((o) => o.items.forEach((i) => { map[i.name] = (map[i.name] || 0) + i.qty; }));
        return Object.entries(map).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
    }, [orders]);

    const statusData = useMemo(() => {
        const map = {};
        orders.forEach((o) => { const s = o.status.replace(/_/g, " "); map[s] = (map[s] || 0) + 1; });
        const colors = ["hsl(142 60% 38%)", "hsl(32 88% 52%)", "hsl(220 60% 50%)", "hsl(280 55% 55%)", "hsl(150 45% 40%)", "hsl(0 72% 50%)"];
        return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
    }, [orders]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={TrendingUp} label="Total revenue" value={`€${totalRevenue.toFixed(0)}`} sub={`${completed.length} completed`} />
                <StatCard icon={DollarSign} label="Commission rate" value={`${rate}%`} sub="platform fee" />
                <StatCard icon={ShoppingBag} label="Total orders" value={orders.length} sub={`${completed.length} completed`} />
                <StatCard icon={Star} label="Average rating" value={metrics?.avgRating ? `${metrics.avgRating}★` : "—"} sub={`${metrics?.reviewCount || 0} reviews`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-700">Revenue by month</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 22% 90%)" />
                                <XAxis dataKey="month" stroke="hsl(20 10% 42%)" fontSize={12} />
                                <YAxis stroke="hsl(20 10% 42%)" fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="gross" name="Gross" stroke="hsl(142 60% 38%)" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-700">Orders by month</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36 22% 90%)" />
                                <XAxis dataKey="month" stroke="hsl(20 10% 42%)" fontSize={12} />
                                <YAxis stroke="hsl(20 10% 42%)" fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="orders" name="Orders" fill="hsl(220 60% 50%)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-700">Top selling items</h3>
                    {topItems.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No sales data yet.</p> : (
                        <div className="mt-4 space-y-2">
                            {topItems.map((i) => (
                                <div key={i.name} className="flex items-center gap-3">
                                    <span className="w-40 truncate text-sm font-600">{i.name}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(i.qty / topItems[0].qty) * 100}%` }} /></div>
                                    <span className="w-8 text-right text-sm text-muted-foreground">{i.qty}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-700">Order status</h3>
                    <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                                    {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                                </Pie>
                                <Legend />
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Reviews({ restaurant }) {
    const { data: reviews = [] } = useRestaurantReviews(restaurant.id);
    const breakdown = [5, 4, 3, 2, 1].map((s) => {
        const count = reviews.filter((r) => Math.round(r.rating) === s).length;
        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
        return { s, count, pct };
    });
    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card p-5 text-center">
                    <div className="font-display text-3xl font-700">{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"}</div>
                    <StarRating value={reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0} size={16} className="mt-1 justify-center" />
                    <div className="mt-1 text-xs text-muted-foreground">{reviews.length} reviews</div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
                    <h3 className="text-sm font-700">Rating breakdown</h3>
                    <div className="mt-3 space-y-2">
                        {breakdown.map((b) => (
                            <div key={b.s} className="flex items-center gap-2 text-xs">
                                <span className="w-6">{b.s}★</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-amber-400" style={{ width: `${b.pct}%` }} /></div>
                                <span className="w-8 text-right text-muted-foreground">{b.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                {reviews.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No reviews yet.</div>}
                {reviews.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <span className="font-600">{r.author}</span>
                            {r.verified && <span className="flex items-center gap-1 text-[11px] font-600 text-green-600"><Check className="h-3 w-3" /> Verified order</span>}
                        </div>
                        <StarRating value={r.rating} size={13} className="mt-1" />
                        <p className="mt-1.5 text-sm text-muted-foreground">"{r.text}"</p>
                        <div className="mt-1 text-xs text-muted-foreground">{r.date}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="text-sm font-600">{label}</label>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}