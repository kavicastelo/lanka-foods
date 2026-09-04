import React, { useState, useMemo } from "react";
import { ClipboardList, ListOrdered, UtensilsCrossed, Settings, DollarSign, Star, Plus, Trash2, Check, Clock, AlertCircle, TrendingUp, ShoppingBag, CheckCircle2, Upload, X } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { useMyRestaurant, useRestaurantMenu, useRestaurantOrders, useRestaurantReviews, useUpdateOrderStatus, useManageMenuCategory, useManageMenuItem, useDashboardMetrics, useCommissionConfig, useRestaurantFinancials, useRestaurantInvoices, useUploadPaymentSlip } from "@/hooks/useMarketplaceData";
import { restaurantsApi } from "@/api/restaurantsApi";
import { mediaApi } from "@/api/mediaApi";
import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import StarRating from "@/components/StarRating";
import { Image } from "@/components/ui/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useParams } from "react-router-dom";

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
    const { slug } = useParams();
    const { data: categories = [] } = useRestaurantMenu(restaurant?.id);
    const manageCategory = useManageMenuCategory();
    const manageItem = useManageMenuItem();
    const [adding, setAdding] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [form, setForm] = useState({
        name: "",
        price: "",
        category: categories[0]?.id || "",
        desc: "",
        imageUrl: "",
        isVegetarian: false,
        isPopular: false,
        available: true,
    });

    React.useEffect(() => {
        if (!form.category && categories.length > 0) {
            setForm((f) => ({ ...f, category: categories[0].id }));
        }
    }, [categories, form.category]);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setUploadError("Please select a JPEG, PNG, or WebP image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError("File size exceeds 5MB limit.");
            return;
        }

        try {
            setUploading(true);
            setUploadError("");

            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            const res = /** @type {any} */ (await mediaApi.uploadMediaServerProxy({
                category: "menu_item",
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                restaurantId: restaurant.id,
                base64Data,
            }));

            const publicUrl = res.publicUrl || res.data?.publicUrl;
            if (!publicUrl) {
                throw new Error("Failed to obtain uploaded image URL.");
            }

            setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
        } catch (err) {
            console.error("Failed to upload image to R2 storage:", err);
            setUploadError(err.message || "Failed to upload image to R2 storage.");
        } finally {
            setUploading(false);
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const targetCategory = form.category || categories[0]?.id;
        if (!form.name || !form.price) return;
        if (!targetCategory) {
            alert("Please create a category first before adding menu items.");
            return;
        }

        manageItem.mutate({
            action: "create",
            restaurantId: restaurant.id,
            categoryId: targetCategory,
            name: form.name,
            price: +form.price,
            description: form.desc,
            imageUrl: form.imageUrl.trim() || "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
            isAvailable: form.available,
            isVegetarian: form.isVegetarian,
            isPopular: form.isPopular,
        });

        setForm({
            name: "",
            price: "",
            category: targetCategory,
            desc: "",
            imageUrl: "",
            isVegetarian: false,
            isPopular: false,
            available: true,
        });
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
                    <div>
                        <label className="text-xs font-600 text-muted-foreground">Item Name *</label>
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Devilled Crab" className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                        <label className="text-xs font-600 text-muted-foreground">Price (€) *</label>
                        <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 14.50" className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-600 text-muted-foreground">Category *</label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary">
                            {categories.length === 0 && <option value="">No categories available</option>}
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-600 text-muted-foreground">Item Image (Upload File to Server / R2 Storage or Enter Image URL)</label>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <label className={cn(
                                "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-2 text-sm font-600 text-muted-foreground transition hover:border-primary hover:text-foreground",
                                uploading && "opacity-50 pointer-events-none"
                            )}>
                                <Upload className="h-4 w-4" />
                                {uploading ? "Uploading to R2..." : "Upload Image"}
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
                            </label>
                            <span className="text-xs text-muted-foreground text-center sm:text-left">or</span>
                            <input
                                value={form.imageUrl}
                                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                                placeholder="Paste image URL (https://...)"
                                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                            />
                        </div>
                        {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
                        {form.imageUrl && (
                            <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-2">
                                <Image src={form.imageUrl} alt="Preview" fittingType="fill" className="h-12 w-12 rounded-lg" />
                                <span className="flex-1 truncate text-xs text-muted-foreground">{form.imageUrl}</span>
                                <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="rounded-lg p-1 text-muted-foreground hover:text-destructive">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-600 text-muted-foreground">Description</label>
                        <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Short description of ingredients or preparation" className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                            <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Available
                        </label>
                        <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                            <input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Vegetarian
                        </label>
                        <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                            <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Popular Dish
                        </label>
                    </div>
                    <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                        <Button type="submit" className="rounded-xl" disabled={uploading}>Save item</Button>
                        <Button type="button" variant="ghost" onClick={() => setAdding(false)} className="rounded-xl">Cancel</Button>
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
                            <div key={i.id} className="flex flex-col gap-3 rounded-xl bg-secondary/40 p-3 sm:flex-row sm:items-center">
                                <div className="flex flex-1 items-center gap-3 min-w-0">
                                    <Image src={i.image} alt={i.name} fittingType="fill" className="h-12 w-12 shrink-0 rounded-lg" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-sm font-600 truncate">{i.name}</span>
                                            {i.veg && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-700 text-green-700">Veg</span>}
                                            {i.popular && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-700 text-amber-700">Popular</span>}
                                        </div>
                                        {i.desc && <div className="text-xs text-muted-foreground line-clamp-1">{i.desc}</div>}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-2 sm:border-0 sm:pt-0 sm:justify-end">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">€</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            defaultValue={i.price}
                                            onBlur={(e) => manageItem.mutate({ action: "update", restaurantId: restaurant.id, itemId: i.id, price: +e.target.value })}
                                            className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-sm outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => manageItem.mutate({ action: "update", restaurantId: restaurant.id, itemId: i.id, isAvailable: !i.available })}
                                            className={cn("rounded-lg px-2.5 py-1.5 text-xs font-700 transition", i.available ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300")}
                                        >
                                            {i.available ? "Available" : "Disabled"}
                                        </button>
                                        <button
                                            onClick={() => manageItem.mutate({ action: "delete", restaurantId: restaurant.id, itemId: i.id })}
                                            className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                                            title="Delete item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
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
    const queryClient = useQueryClient();
    const [s, setS] = useState({
        name: restaurant.name || "",
        logoText: restaurant.logoText || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        address: restaurant.address || "",
        city: restaurant.city || "",
        description: restaurant.description || "",
        hours: restaurant.hours || "",
        prepTime: restaurant.prepTime || "",
        priceRange: restaurant.priceRange || "€€",
        deliveryFee: restaurant.deliveryFee ?? 0,
        minOrder: restaurant.minOrder ?? 0,
        pickup: restaurant.pickup ?? true,
        delivery: restaurant.delivery ?? true,
        halal: restaurant.halal ?? false,
        catering: restaurant.catering ?? false,
        isOpen: restaurant.isOpen ?? true,
        coverImageUrl: restaurant.coverImageUrl || restaurant.cover || "",
        cuisines: Array.isArray(restaurant.cuisines) ? restaurant.cuisines.join(", ") : (restaurant.cuisines || ""),
        timeSlots: Array.isArray(restaurant.timeSlots) ? restaurant.timeSlots.join(", ") : (restaurant.timeSlots || ""),
    });
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const input = "w-full rounded-xl border border-border bg-card py-2.5 px-4 text-sm outline-none focus:border-primary";

    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setUploadError("Please select a JPEG, PNG, or WebP image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError("File size exceeds 5MB limit.");
            return;
        }

        try {
            setUploading(true);
            setUploadError("");

            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });

            const res = /** @type {any} */ (await mediaApi.uploadMediaServerProxy({
                category: "restaurant_cover",
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                restaurantId: restaurant.id,
                base64Data,
            }));

            const publicUrl = res.publicUrl || res.data?.publicUrl;
            if (!publicUrl) throw new Error("Failed to upload cover photo.");

            setS((prev) => ({ ...prev, coverImageUrl: publicUrl }));
        } catch (err) {
            console.error("Failed to upload cover image:", err);
            setUploadError(err.message || "Failed to upload image to R2 storage.");
        } finally {
            setUploading(false);
        }
    };

    const save = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const cuisinesArray = typeof s.cuisines === "string"
                ? s.cuisines.split(",").map((c) => c.trim()).filter(Boolean)
                : s.cuisines;
            const timeSlotsArray = typeof s.timeSlots === "string"
                ? s.timeSlots.split(",").map((t) => t.trim()).filter(Boolean)
                : s.timeSlots;

            await restaurantsApi.updateMySettings({
                name: s.name,
                logoText: s.logoText,
                phone: s.phone,
                email: s.email,
                address: s.address,
                city: s.city,
                description: s.description,
                hours: s.hours,
                prepTime: s.prepTime,
                priceRange: s.priceRange,
                deliveryFee: +s.deliveryFee,
                minOrder: +s.minOrder,
                pickup: s.pickup,
                delivery: s.delivery,
                halal: s.halal,
                catering: s.catering,
                isOpen: s.isOpen,
                coverImageUrl: s.coverImageUrl,
                cuisines: cuisinesArray,
                timeSlots: timeSlotsArray,
            });

            queryClient.invalidateQueries({ queryKey: ["myRestaurant"] });
            queryClient.invalidateQueries({ queryKey: ["restaurant"] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error("Failed to update restaurant settings:", err);
            alert(err.message || "Failed to update restaurant settings.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="space-y-6 rounded-2xl border border-border bg-card p-6">
            {/* Basic Information */}
            <div>
                <h3 className="font-700 text-base border-b border-border pb-2 mb-4">Basic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Restaurant name *"><input required value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} className={input} /></Field>
                    <Field label="Logo Badge / Initial Text"><input value={s.logoText} onChange={(e) => setS({ ...s, logoText: e.target.value })} placeholder="e.g. GSP" className={input} /></Field>
                    <Field label="Phone"><input value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} className={input} /></Field>
                    <Field label="Email"><input type="email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} className={input} /></Field>
                    <Field label="City *"><input required value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} placeholder="e.g. Helsinki" className={input} /></Field>
                    <Field label="Address"><input value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} className={input} /></Field>
                </div>
            </div>

            {/* Operations & Pricing */}
            <div>
                <h3 className="font-700 text-base border-b border-border pb-2 mb-4">Operations & Pricing</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Opening hours"><input value={s.hours} onChange={(e) => setS({ ...s, hours: e.target.value })} placeholder="e.g. 11:00 - 22:00" className={input} /></Field>
                    <Field label="Preparation time"><input value={s.prepTime} onChange={(e) => setS({ ...s, prepTime: e.target.value })} placeholder="e.g. 20-30 min" className={input} /></Field>
                    <Field label="Price Tier">
                        <select value={s.priceRange} onChange={(e) => setS({ ...s, priceRange: e.target.value })} className={input}>
                            <option value="€">€ (Budget friendly)</option>
                            <option value="€€">€€ (Moderate)</option>
                            <option value="€€€">€€€ (Fine dining)</option>
                        </select>
                    </Field>
                    <Field label="Delivery fee (€)"><input type="number" step="0.1" value={s.deliveryFee} onChange={(e) => setS({ ...s, deliveryFee: +e.target.value })} className={input} /></Field>
                    <Field label="Minimum order (€)"><input type="number" step="0.1" value={s.minOrder} onChange={(e) => setS({ ...s, minOrder: +e.target.value })} className={input} /></Field>
                    <Field label="Cuisines (comma separated)"><input value={s.cuisines} onChange={(e) => setS({ ...s, cuisines: e.target.value })} placeholder="e.g. Sri Lankan, Curry, Seafood" className={input} /></Field>
                    <div className="sm:col-span-2">
                        <Field label="Delivery / Pickup Time Slots (comma separated)"><input value={s.timeSlots} onChange={(e) => setS({ ...s, timeSlots: e.target.value })} placeholder="e.g. 11:00, 12:00, 17:00, 18:00, 19:00" className={input} /></Field>
                    </div>
                </div>
            </div>

            {/* Cover Banner */}
            <div>
                <h3 className="font-700 text-base border-b border-border pb-2 mb-4">Cover Banner Image</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-2.5 text-sm font-600 text-muted-foreground transition hover:border-primary hover:text-foreground",
                        uploading && "opacity-50 pointer-events-none"
                    )}>
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading to R2..." : "Upload Cover Banner"}
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    <span className="text-xs text-muted-foreground text-center sm:text-left">or</span>
                    <input
                        value={s.coverImageUrl}
                        onChange={(e) => setS({ ...s, coverImageUrl: e.target.value })}
                        placeholder="Paste Cover Image URL (https://...)"
                        className="flex-1 rounded-xl border border-border bg-card py-2.5 px-4 text-sm outline-none focus:border-primary"
                    />
                </div>
                {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
                {s.coverImageUrl && (
                    <div className="mt-3 relative h-36 w-full overflow-hidden rounded-2xl border border-border">
                        <Image src={s.coverImageUrl} alt="Cover Banner" fittingType="fill" className="h-full w-full" />
                        <button type="button" onClick={() => setS({ ...s, coverImageUrl: "" })} className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Description */}
            <div>
                <h3 className="font-700 text-base border-b border-border pb-2 mb-4">Description</h3>
                <Field label="About your restaurant"><textarea rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} className={input} placeholder="Describe your restaurant, specialties, and story..." /></Field>
            </div>

            {/* Services & Availability Badges */}
            <div>
                <h3 className="font-700 text-base border-b border-border pb-2 mb-4">Services & Availability</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                        <input type="checkbox" checked={s.isOpen} onChange={(e) => setS({ ...s, isOpen: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Open for Orders
                    </label>
                    <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                        <input type="checkbox" checked={s.pickup} onChange={(e) => setS({ ...s, pickup: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Pickup Available
                    </label>
                    <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                        <input type="checkbox" checked={s.delivery} onChange={(e) => setS({ ...s, delivery: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Delivery Available
                    </label>
                    <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                        <input type="checkbox" checked={s.halal} onChange={(e) => setS({ ...s, halal: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Halal Certified
                    </label>
                    <label className="flex items-center gap-2 text-sm font-600 cursor-pointer">
                        <input type="checkbox" checked={s.catering} onChange={(e) => setS({ ...s, catering: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Catering Services
                    </label>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <Button type="submit" className="rounded-xl" disabled={saving || uploading}>{saving ? "Saving..." : "Save changes"}</Button>
                {saved && <span className="flex items-center gap-1 text-sm font-600 text-primary"><Check className="h-4 w-4" /> Settings saved successfully</span>}
            </div>
            <p className="text-xs text-muted-foreground">Platform commission, approval status and platform settings are managed by LankaEats administration and cannot be changed here.</p>
        </form>
    );
}

function UploadSlipModal({ invoice, onClose }) {
    const uploadSlip = useUploadPaymentSlip();
    const [slipUrl, setSlipUrl] = useState(invoice.paymentSlipUrl || "");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await mediaApi.uploadFile(file, { restaurantId: invoice.restaurantId });
            if (res.publicUrl) {
                setSlipUrl(res.publicUrl);
            }
        } catch (_err) {
            alert("Failed to upload image. Please paste direct image URL instead.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!slipUrl) return;
        uploadSlip.mutate(
            { invoiceId: invoice.id, paymentSlipUrl: slipUrl },
            { onSuccess: () => onClose() }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-700">Submit Payment Slip</h3>
                    <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
                </div>
                <div className="text-xs text-muted-foreground">
                    Invoice: <span className="font-700 text-foreground">{invoice.invoiceNumber}</span> | Total Due: <span className="font-700 text-amber-600">€{(invoice.totalAmountDue / 100).toFixed(2)}</span>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1">Upload Receipt / Slip Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-600 file:text-primary hover:file:bg-primary/20"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1">Or Direct Image/Receipt URL</label>
                        <input
                            type="url"
                            value={slipUrl}
                            onChange={(e) => setSlipUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-border bg-card p-2.5 outline-none focus:border-primary text-xs"
                        />
                    </div>
                    {slipUrl && (
                        <div className="rounded-lg border border-border p-2 text-center">
                            <img src={slipUrl} alt="Slip Preview" className="max-h-32 mx-auto rounded object-contain" />
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={uploading || uploadSlip.isPending || !slipUrl}>
                            {uploadSlip.isPending ? "Submitting..." : "Submit Payment Slip"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Revenue({ restaurant }) {
    const { data: financialsData } = useRestaurantFinancials(restaurant.id);
    const records = Array.isArray(financialsData) ? financialsData : (financialsData?.records || []);
    const { data: orders = [] } = useRestaurantOrders(restaurant.id);
    const { data: metrics } = useDashboardMetrics("restaurant");
    const { data: commissionConfig } = useCommissionConfig();
    const { data: invoices = [] } = useRestaurantInvoices(restaurant.id);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const rate = restaurant.commissionRate ?? commissionConfig?.defaultRate ?? 10;
    const summary = useMemo(() => {
        const completed = records.filter((r) => r.status === "SETTLED");
        const pending = records.filter((r) => r.status === "PENDING");
        const getFeeTotal = (r) => r.platformFeeTotal ?? ((r.commissionAmount || 0) + (r.serviceFee || 0));

        const totalGross = records.reduce((s, r) => s + (r.orderTotal || 0), 0);
        const totalCommission = records.reduce((s, r) => s + (r.commissionAmount || 0), 0);
        const pendingCommission = pending.reduce((s, r) => s + getFeeTotal(r), 0);
        const settledCommission = completed.reduce((s, r) => s + getFeeTotal(r), 0);
        const totalNet = records.reduce((s, r) => s + (r.restaurantNetAmount || 0), 0);

        return {
            totalGross,
            totalCommission,
            pendingCommission,
            settledCommission,
            totalNet,
            pendingCount: pending.length,
            settledCount: completed.length,
        };
    }, [records]);

    const completed = orders.filter((o) => o.status === "completed");
    const totalGross = (summary.totalGross !== undefined ? summary.totalGross : 0) || completed.reduce((s, o) => s + (o.total || 0), 0);
    const pendingCommission = summary.pendingCommission || 0;
    const settledCommission = summary.settledCommission || 0;
    const totalCommission = (summary.totalCommission !== undefined ? summary.totalCommission : 0) || (totalGross * rate / 100);
    const totalNet = (summary.totalNet !== undefined ? summary.totalNet : 0) || (totalGross - totalCommission);

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
            {selectedInvoice && <UploadSlipModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}

            {/* Financial Overview Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={TrendingUp} label="Gross Order Sales" value={`€${totalGross.toFixed(2)}`} sub={`${completed.length} completed orders`} />
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-600 text-amber-800">Pending Fees Owed to Platform</span>
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><AlertCircle className="h-4 w-4" /></div>
                    </div>
                    <div className="mt-2 font-display text-3xl font-700 text-amber-950">€{pendingCommission.toFixed(2)}</div>
                    <div className="mt-0.5 text-xs text-amber-700 font-500">{summary.pendingCount || 0} orders awaiting invoice settlement (Commission + Service Fee)</div>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50/70 p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-600 text-green-800">Settled Platform Fees</span>
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-green-100 text-green-700"><CheckCircle2 className="h-4 w-4" /></div>
                    </div>
                    <div className="mt-2 font-display text-3xl font-700 text-green-950">€{settledCommission.toFixed(2)}</div>
                    <div className="mt-0.5 text-xs text-green-700 font-500">{summary.settledCount || 0} orders settled with LankaEats</div>
                </div>
                <StatCard icon={DollarSign} label="Estimated Net Food Earnings" value={`€${totalNet.toFixed(2)}`} sub={`Rate: ${rate}% commission`} />
            </div>

            {/* Monthly Invoices & Platform Statements Table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-4">
                    <h3 className="font-700">Issued Monthly Invoices & Statements</h3>
                    <p className="text-xs text-muted-foreground">Periodic statements issued by Super Admin. Submit bank payment slips here once paid.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-600">Invoice #</th>
                                <th className="px-4 py-3 font-600">Period</th>
                                <th className="px-4 py-3 font-600">Orders</th>
                                <th className="px-4 py-3 font-600">Gross GMV</th>
                                <th className="px-4 py-3 font-600">Commission</th>
                                <th className="px-4 py-3 font-600">Service Fee</th>
                                <th className="px-4 py-3 font-600">Subscription</th>
                                <th className="px-4 py-3 font-600">Total Due</th>
                                <th className="px-4 py-3 font-600">Status</th>
                                <th className="px-4 py-3 font-600">Action / Payment Slip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-6 text-center text-muted-foreground">
                                        No invoices issued for your restaurant yet.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="border-t border-border">
                                        <td className="px-4 py-3 font-700">{inv.invoiceNumber}</td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">{inv.periodStart} to {inv.periodEnd}</td>
                                        <td className="px-4 py-3">{inv.orderCount}</td>
                                        <td className="px-4 py-3">€{(inv.grossSales / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-500">€{(inv.totalCommission / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">€{(inv.totalServiceFee / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">€{(inv.subscriptionFee / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-800 text-amber-700">€{(inv.totalAmountDue / 100).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "rounded-full px-2.5 py-1 text-xs font-700 capitalize",
                                                inv.status === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {inv.status === "PAID" ? (
                                                <span className="text-xs text-muted-foreground font-500">Paid & Settled</span>
                                            ) : inv.paymentSlipUrl ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-emerald-700 font-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Slip Uploaded</span>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedInvoice(inv)}>Change Slip</Button>
                                                </div>
                                            ) : (
                                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedInvoice(inv)}>
                                                    <Upload className="h-3.5 w-3.5" /> Submit Slip
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoicing Info Banner */}
            <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-700 text-base">Manual Cash Payment & Invoice Settlement Workflow</h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            Since payment gateway is not integrated, your restaurant receives full cash payments directly from customers (including subtotal, delivery fee, and platform service fee). LankaEats calculates both the percentage commission and customer service fee as total fees owed to the platform. Super Admin issues periodic invoices, and marks balances settled once payment slips are submitted.
                        </p>
                    </div>
                </div>
            </div>

            {/* Financial Statements & Settlements Table */}
            {records.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border p-4">
                        <h3 className="font-700">Financial Records & Commission Breakdown</h3>
                        <p className="text-xs text-muted-foreground">Itemized statement for all completed orders (Prices in €)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-600">Order #</th>
                                    <th className="px-4 py-3 font-600">Date</th>
                                    <th className="px-4 py-3 font-600">Subtotal</th>
                                    <th className="px-4 py-3 font-600">Rate</th>
                                    <th className="px-4 py-3 font-600">Commission</th>
                                    <th className="px-4 py-3 font-600">Service Fee</th>
                                    <th className="px-4 py-3 font-600">Total Platform Fee</th>
                                    <th className="px-4 py-3 font-600">Net Food Earnings</th>
                                    <th className="px-4 py-3 font-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r) => {
                                    const totalFee = r.platformFeeTotal ?? (r.commissionAmount + (r.serviceFee || 0));
                                    return (
                                        <tr key={r.id} className="border-t border-border">
                                            <td className="px-4 py-3 font-600">#{r.orderNumber}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{r.createdAt ? r.createdAt.slice(0, 10) : "—"}</td>
                                            <td className="px-4 py-3 font-600">€{r.orderSubtotal.toFixed(2)}</td>
                                            <td className="px-4 py-3">{r.commissionRate}%</td>
                                            <td className="px-4 py-3">€{r.commissionAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">€{(r.serviceFee || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 font-700 text-amber-700">€{totalFee.toFixed(2)}</td>
                                            <td className="px-4 py-3 font-700 text-green-700">€{r.restaurantNetAmount.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "rounded-full px-2.5 py-1 text-xs font-700 capitalize",
                                                    r.status === "SETTLED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {r.status === "SETTLED" ? "Settled" : "Pending Invoice"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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