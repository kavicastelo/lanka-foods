// Data hooks for the LankaEats marketplace — replaces mock data from MarketplaceContext.
// Uses @tanstack/react-query for caching/invalidation and the Base44 SDK for entity queries
// and backend function invocations.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";

// --- Field mapping: DB snake_case → frontend camelCase (keeps components unchanged) ---

export function mapRestaurant(r) {
    if (!r) return null;
    return {
        ...r,
        cover: r.cover_image_url,
        logoText: r.logo_text,
        priceRange: r.price_range,
        prepTime: r.prep_time,
        minOrder: r.min_order,
        deliveryFee: r.delivery_fee,
        open: r.is_open,
        timeSlots: r.time_slots || [],
    };
}

export function mapMenuItem(i) {
    if (!i) return null;
    return {
        ...i,
        desc: i.description,
        image: i.image_url,
        veg: i.is_vegetarian,
        available: i.is_available,
        popular: i.is_popular,
    };
}

export function mapOrder(o) {
    if (!o) return null;
    return {
        ...o,
        restaurantId: o.restaurant_id,
        customer: o.customer_name,
        type: o.delivery_type,
        date: o.scheduled_date,
        slot: o.scheduled_time,
        address: o.delivery_address,
    };
}

export function mapReview(r) {
    if (!r) return null;
    return {
        ...r,
        restaurantId: r.restaurant_id,
        author: r.author_name,
        verified: r.is_verified,
        date: (r.created_date || "").slice(0, 10),
    };
}

// --- Restaurant stats computed from reviews ---

export function computeRestaurantStats(reviews) {
    if (!reviews || reviews.length === 0) return { rating: 0, reviewCount: 0, breakdown: [0, 0, 0, 0, 0] };
    const reviewCount = reviews.length;
    const rating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount;
    const breakdown = [5, 4, 3, 2, 1].map((s) => reviews.filter((r) => Math.round(r.rating) === s).length);
    return { rating: +rating.toFixed(1), reviewCount, breakdown };
}

// --- Query hooks ---

export function useActiveRestaurants() {
    return useQuery({
        queryKey: ["restaurants", "active"],
        queryFn: async () => {
            const list = await base44.entities.Restaurant.filter({ status: "active" });
            return list.map(mapRestaurant);
        },
    });
}

export function useRestaurantById(restaurantId) {
    return useQuery({
        queryKey: ["restaurantById", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return null;
            const restaurant = await base44.entities.Restaurant.get(restaurantId);
            if (!restaurant) return null;
            const stats = await fetchRestaurantStats(restaurantId);
            return { ...mapRestaurant(restaurant), ...stats };
        },
        enabled: !!restaurantId,
    });
}

export function useRestaurantBySlug(slug) {
    return useQuery({
        queryKey: ["restaurant", slug],
        queryFn: async () => {
            const list = await base44.entities.Restaurant.filter({ slug });
            if (!list.length) return null;
            const restaurant = mapRestaurant(list[0]);
            const stats = await fetchRestaurantStats(list[0].id);
            return { ...restaurant, ...stats };
        },
    });
}

async function fetchRestaurantStats(restaurantId) {
    const reviews = await base44.entities.Review.filter({ restaurant_id: restaurantId });
    return computeRestaurantStats(reviews.map(mapReview));
}

export function useRestaurantMenu(restaurantId) {
    return useQuery({
        queryKey: ["restaurantMenu", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const categories = await base44.entities.MenuCategory.filter({ restaurant_id: restaurantId });
            const items = await base44.entities.MenuItem.filter({ restaurant_id: restaurantId });
            const itemMap = {};
            items.forEach((i) => {
                if (!itemMap[i.category_id]) itemMap[i.category_id] = [];
                itemMap[i.category_id].push(mapMenuItem(i));
            });
            return categories
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map((c) => ({
                    ...c,
                    items: (itemMap[c.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
                }));
        },
        enabled: !!restaurantId,
    });
}

export function useRestaurantReviews(restaurantId) {
    return useQuery({
        queryKey: ["restaurantReviews", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const reviews = await base44.entities.Review.filter({ restaurant_id: restaurantId });
            return reviews.map(mapReview);
        },
        enabled: !!restaurantId,
    });
}

export function useGlobalCategories() {
    return useQuery({
        queryKey: ["globalCategories"],
        queryFn: async () => {
            const list = await base44.entities.GlobalCategory.filter({ is_active: true });
            return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        },
    });
}

// --- Favorites ---

export function useFavorites() {
    const { user } = useMarketplaceUser();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ["favorites", user?.id],
        queryFn: async () => {
            if (!user) return { restaurants: [], items: [] };
            const favs = await base44.entities.Favorite.filter({ user_id: user.id });
            return {
                restaurants: favs.filter((f) => f.restaurant_id).map((f) => f.restaurant_id),
                items: favs.filter((f) => f.menu_item_id).map((f) => f.menu_item_id),
                raw: favs,
            };
        },
        enabled: !!user,
    });

    const toggleRestaurant = useMutation({
        mutationFn: async ({ restaurantId, isFav }) => {
            if (isFav) {
                // Find and delete
                const fav = query.data?.raw?.find((f) => f.restaurant_id === restaurantId);
                if (fav) await base44.entities.Favorite.delete(fav.id);
            } else {
                await base44.entities.Favorite.create({ user_id: user.id, restaurant_id: restaurantId });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
    });

    const toggleItem = useMutation({
        mutationFn: async ({ itemId, isFav }) => {
            if (isFav) {
                const fav = query.data?.raw?.find((f) => f.menu_item_id === itemId);
                if (fav) await base44.entities.Favorite.delete(fav.id);
            } else {
                await base44.entities.Favorite.create({ user_id: user.id, menu_item_id: itemId });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
    });

    return {
        favoriteRestaurants: query.data?.restaurants || [],
        favoriteItems: query.data?.items || [],
        toggleFavoriteRestaurant: (restaurantId) => {
            const isFav = (query.data?.restaurants || []).includes(restaurantId);
            toggleRestaurant.mutate({ restaurantId, isFav });
        },
        toggleFavoriteItem: (itemId) => {
            const isFav = (query.data?.items || []).includes(itemId);
            toggleItem.mutate({ itemId, isFav });
        },
    };
}

// --- Orders ---

export function useMyOrders() {
    const { user } = useMarketplaceUser();
    return useQuery({
        queryKey: ["myOrders", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const orders = await base44.entities.Order.filter({ customer_id: user.id });
            // Fetch order items for each order
            const orderItems = await base44.entities.OrderItem.filter({ customer_id: user.id });
            const itemsByOrder = {};
            orderItems.forEach((oi) => {
                if (!itemsByOrder[oi.order_id]) itemsByOrder[oi.order_id] = [];
                itemsByOrder[oi.order_id].push({ name: oi.name, qty: oi.quantity, price: oi.price, instructions: oi.instructions });
            });
            return orders
                .map(mapOrder)
                .map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }))
                .sort((a, b) => new Date(b.placed_at || b.created_date) - new Date(a.placed_at || a.created_date));
        },
        enabled: !!user,
    });
}

export function useOrderById(orderId) {
    return useQuery({
        queryKey: ["order", orderId],
        queryFn: async () => {
            if (!orderId) return null;
            const order = await base44.entities.Order.get(orderId);
            if (!order) return null;
            const items = await base44.entities.OrderItem.filter({ order_id: orderId });
            return { ...mapOrder(order), items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price, instructions: i.instructions })) };
        },
        enabled: !!orderId,
    });
}

export function useRestaurantOrders(restaurantId) {
    return useQuery({
        queryKey: ["restaurantOrders", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const orders = await base44.entities.Order.filter({ restaurant_id: restaurantId });
            const orderItems = await base44.entities.OrderItem.filter({ restaurant_id: restaurantId });
            const itemsByOrder = {};
            orderItems.forEach((oi) => {
                if (!itemsByOrder[oi.order_id]) itemsByOrder[oi.order_id] = [];
                itemsByOrder[oi.order_id].push({ name: oi.name, qty: oi.quantity, price: oi.price, instructions: oi.instructions });
            });
            return orders
                .map(mapOrder)
                .map((o) => ({ ...o, items: itemsByOrder[o.id] || [] }))
                .sort((a, b) => new Date(b.placed_at || b.created_date) - new Date(a.placed_at || a.created_date));
        },
        enabled: !!restaurantId,
    });
}

// --- Reviews ---

export function useMyReviews() {
    const { user } = useMarketplaceUser();
    return useQuery({
        queryKey: ["myReviews", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const reviews = await base44.entities.Review.filter({ author_id: user.id });
            return reviews.map(mapReview);
        },
        enabled: !!user,
    });
}

export function useAllReviews() {
    return useQuery({
        queryKey: ["allReviews"],
        queryFn: async () => {
            const reviews = await base44.entities.Review.list();
            return reviews.map(mapReview);
        },
    });
}

// --- Admin queries ---

export function useAllRestaurants() {
    return useQuery({
        queryKey: ["allRestaurants"],
        queryFn: async () => {
            const list = await base44.entities.Restaurant.list();
            return list.map(mapRestaurant);
        },
    });
}

export function useRestaurantApplications() {
    return useQuery({
        queryKey: ["restaurantApplications"],
        queryFn: async () => {
            const list = await base44.entities.RestaurantApplication.list();
            return list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        },
    });
}

export function useCommissionConfig() {
    return useQuery({
        queryKey: ["commissionConfig"],
        queryFn: async () => {
            const list = await base44.entities.CommissionConfig.list();
            return list[0] || { default_rate: 10 };
        },
    });
}

export function useDashboardMetrics(scope, restaurantId) {
    return useQuery({
        queryKey: ["dashboardMetrics", scope, restaurantId],
        queryFn: async () => {
            const res = await base44.functions.invoke("getDashboardMetrics", { scope, restaurantId });
            return res.data;
        },
    });
}

// --- Mutation hooks ---

export function usePlaceOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (orderData) => {
            const res = await base44.functions.invoke("placeOrder", orderData);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myOrders"] });
        },
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ orderId, newStatus }) => {
            const res = await base44.functions.invoke("updateOrderStatus", { orderId, newStatus });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantOrders"] });
            queryClient.invalidateQueries({ queryKey: ["order"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}

export function useSubmitApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (appData) => {
            const res = await base44.functions.invoke("submitRestaurantApplication", appData);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useApproveApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (applicationId) => {
            const res = await base44.functions.invoke("approveRestaurantApplication", { applicationId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
            queryClient.invalidateQueries({ queryKey: ["allRestaurants"] });
            queryClient.invalidateQueries({ queryKey: ["restaurants"] });
        },
    });
}

export function useRejectApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (applicationId) => {
            const res = await base44.functions.invoke("rejectRestaurantApplication", { applicationId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useRequestChanges() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (applicationId) => {
            const res = await base44.functions.invoke("requestRestaurantChanges", { applicationId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useSetRestaurantStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ restaurantId, status }) => {
            const res = await base44.functions.invoke("setRestaurantStatus", { restaurantId, status });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allRestaurants"] });
            queryClient.invalidateQueries({ queryKey: ["restaurants"] });
        },
    });
}

export function useSetCommissionRate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ rate, restaurantId }) => {
            const res = await base44.functions.invoke("setCommissionRate", { rate, restaurantId });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["commissionConfig"] });
            queryClient.invalidateQueries({ queryKey: ["allRestaurants"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}

export function useManageMenuCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke("manageMenuCategory", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantMenu"] });
        },
    });
}

export function useManageMenuItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await base44.functions.invoke("manageMenuItem", data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantMenu"] });
        },
    });
}

export function useCreateReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (reviewData) => {
            const res = await base44.functions.invoke("createReview", reviewData);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myReviews"] });
            queryClient.invalidateQueries({ queryKey: ["restaurantReviews"] });
            queryClient.invalidateQueries({ queryKey: ["allReviews"] });
            queryClient.invalidateQueries({ queryKey: ["restaurant"] });
        },
    });
}

// --- Restaurant owner's restaurant ---

export function useMyRestaurant() {
    const { user } = useMarketplaceUser();
    const userRestaurantId = user?.restaurant_id || user?.data?.restaurant_id;
    return useQuery({
        queryKey: ["myRestaurant", userRestaurantId],
        queryFn: async () => {
            if (!userRestaurantId) return null;
            const restaurant = await base44.entities.Restaurant.get(userRestaurantId);
            if (!restaurant) return null;
            const stats = await fetchRestaurantStats(userRestaurantId);
            return { ...mapRestaurant(restaurant), ...stats };
        },
        enabled: !!userRestaurantId,
    });
}