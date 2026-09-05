// Data hooks for the LankaEats marketplace — connects to our independent backend API.
// Uses @tanstack/react-query for caching/invalidation and custom domain APIs.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurantsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { menuApi } from "@/api/menuApi";
import { ordersApi } from "@/api/ordersApi";
import { reviewsApi } from "@/api/reviewsApi";
import { favoritesApi } from "@/api/favoritesApi";
import { applicationsApi } from "@/api/applicationsApi";
import { financialsApi } from "@/api/financialsApi";
import { invoicesApi } from "@/api/invoicesApi";
import { dashboardApi } from "@/api/dashboardApi";
import { authApi } from "@/api/authApi";
import { useMarketplaceUser } from "@/lib/marketplaceAuth";

// --- Field mapping: DB & DTO format → frontend legacy props (keeps components unchanged) ---

export function mapRestaurant(r) {
    if (!r) return null;
    const rating = Number(r.ratingAverage ?? r.rating ?? r.rating_average ?? 0) || 0;
    const reviewCount = Number(r.reviewCount ?? r.review_count ?? 0) || 0;
    const rawCuisines = r.cuisines || r.cuisine;
    const cuisines = Array.isArray(rawCuisines)
        ? rawCuisines.map((c) => String(c).trim()).filter(Boolean)
        : typeof rawCuisines === "string"
        ? rawCuisines.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    return {
        ...r,
        id: r.id || r._id,
        rating,
        ratingAverage: rating,
        reviewCount,
        cuisines,
        cover: r.coverImageUrl || r.cover_image_url || r.cover,
        coverImageUrl: r.coverImageUrl || r.cover_image_url || r.cover,
        logoText: r.logoText || r.logo_text,
        priceRange: r.priceRange || r.price_range || "$$",
        prepTime: r.prepTime || r.prep_time || "25-35 min",
        minOrder: r.minOrder ?? r.min_order ?? 15,
        deliveryFee: r.deliveryFee ?? r.delivery_fee ?? 3.90,
        open: r.status === "active" || r.is_open === true || r.open === true,
        isOpen: r.status === "active" || r.is_open === true,
        timeSlots: r.timeSlots || r.time_slots || [],
    };
}

export function mapMenuItem(i) {
    if (!i) return null;
    const rawPrice = typeof i.price === "number" ? i.price : 0;
    const price = Number.isInteger(rawPrice) && rawPrice >= 50 ? rawPrice / 100 : rawPrice;
    return {
        ...i,
        id: i.id || i._id,
        desc: i.description || i.desc || "",
        image: i.imageUrl || i.image_url || i.image || "",
        imageUrl: i.imageUrl || i.image_url || i.image || "",
        veg: i.isVegetarian ?? i.is_vegetarian ?? i.veg ?? false,
        available: i.isAvailable ?? i.is_available ?? i.available ?? true,
        popular: i.isPopular ?? i.is_popular ?? i.popular ?? false,
        price,
    };
}

export function mapOrder(o) {
    if (!o) return null;
    const parseMoney = (val) => {
        if (typeof val !== "number") return 0;
        return Number.isInteger(val) && val >= 50 ? val / 100 : val;
    };

    const total = parseMoney(o.total ?? o.totalCents);
    const subtotal = parseMoney(o.subtotal ?? o.subtotalCents);
    const deliveryFee = parseMoney(o.deliveryFee ?? o.deliveryFeeCents);

    const orderNum = o.orderNumber || o.order_number || o.id || o._id;
    const custName = o.customerName || o.customer_name || o.customer || "";
    const delType = o.deliveryType || o.delivery_type || o.type || "delivery";
    const schedDate = o.scheduledDate || o.scheduled_date || (o.placedAt ? new Date(o.placedAt).toISOString().slice(0, 10) : o.date || "");
    const schedTime = o.scheduledTime || o.scheduled_time || o.slot || "";
    const delAddress = o.deliveryAddress || o.delivery_address || o.address || "";

    return {
        ...o,
        id: o.id || o._id,
        orderNumber: orderNum,
        order_number: orderNum,
        restaurantId: o.restaurantId || o.restaurant_id,
        restaurant_id: o.restaurantId || o.restaurant_id,
        customer: custName,
        customerName: custName,
        customer_name: custName,
        type: delType,
        deliveryType: delType,
        delivery_type: delType,
        date: schedDate,
        scheduledDate: schedDate,
        scheduled_date: schedDate,
        slot: schedTime,
        scheduledTime: schedTime,
        scheduled_time: schedTime,
        address: delAddress,
        deliveryAddress: delAddress,
        delivery_address: delAddress,
        total,
        subtotal,
        deliveryFee,
        items: (o.items || []).map((item) => {
            const price = parseMoney(item.unitPrice ?? item.unitPriceCents ?? item.price);
            return {
                ...item,
                name: item.nameSnapshot || item.name || "",
                nameSnapshot: item.nameSnapshot || item.name || "",
                qty: item.quantity ?? item.qty ?? 1,
                quantity: item.quantity ?? item.qty ?? 1,
                price,
                unitPrice: price,
                instructions: item.instructions || "",
            };
        }),
    };
}


export function mapReview(r) {
    if (!r) return null;
    return {
        ...r,
        id: r.id || r._id,
        restaurantId: r.restaurantId || r.restaurant_id,
        author: r.authorName || r.author_name || r.author,
        verified: r.isVerified ?? r.is_verified ?? true,
        rating: r.rating || 5,
        foodRating: r.foodRating || r.rating || 5,
        text: r.comment || r.text || "",
        date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : (r.created_date || "").slice(0, 10),
    };
}

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
            const list = await restaurantsApi.getRestaurants({ status: "active" });
            return (Array.isArray(list) ? list : []).map(mapRestaurant);
        },
    });
}

export function useRestaurantById(restaurantId) {
    return useQuery({
        queryKey: ["restaurantById", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return null;
            const restaurant = await restaurantsApi.getRestaurantById(restaurantId);
            if (!restaurant) return null;
            const reviews = await reviewsApi.getRestaurantReviews(restaurantId).catch(() => []);
            const stats = computeRestaurantStats((reviews || []).map(mapReview));
            return { ...mapRestaurant(restaurant), ...stats };
        },
        enabled: !!restaurantId,
    });
}

export function useRestaurantBySlug(slug) {
    return useQuery({
        queryKey: ["restaurant", slug],
        queryFn: async () => {
            if (!slug) return null;
            const restaurant = await restaurantsApi.getRestaurantBySlug(slug);
            if (!restaurant) return null;
            const reviews = await reviewsApi.getRestaurantReviews(restaurant.id || restaurant._id).catch(() => []);
            const stats = computeRestaurantStats((reviews || []).map(mapReview));
            return { ...mapRestaurant(restaurant), ...stats };
        },
        enabled: !!slug,
    });
}

export function useRestaurantMenu(slugOrRestaurantId) {
    return useQuery({
        queryKey: ["restaurantMenu", slugOrRestaurantId],
        queryFn: async () => {
            if (!slugOrRestaurantId) return [];
            let catalog = null;
            try {
                catalog = await menuApi.getPublicMenuBySlug(slugOrRestaurantId);
            } catch (_err) {
                const ownerCats = await menuApi.getOwnerMenuCategories().catch(() => []);
                const ownerItems = await menuApi.getOwnerMenuItems().catch(() => []);
                catalog = {
                    categories: (ownerCats || []).map((c) => ({
                        ...c,
                        items: (ownerItems || []).filter((i) => (i.categoryId || i.category_id) === (c.id || c._id)),
                    })),
                };
            }

            const categories = catalog?.categories || catalog?.data?.categories || [];
            return (categories || []).map((c) => ({
                id: c.id || c._id,
                name: c.name,
                description: c.description || "",
                items: (c.items || []).map(mapMenuItem),
            }));
        },
        enabled: !!slugOrRestaurantId,
    });
}

export function useRestaurantReviews(restaurantId) {
    return useQuery({
        queryKey: ["restaurantReviews", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const reviews = await reviewsApi.getRestaurantReviews(restaurantId);
            return (Array.isArray(reviews) ? reviews : []).map(mapReview);
        },
        enabled: !!restaurantId,
    });
}

export function useGlobalCategories() {
    return useQuery({
        queryKey: ["globalCategories"],
        queryFn: async () => {
            const list = await categoriesApi.getCategories();
            return (Array.isArray(list) ? list : []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
            const res = await favoritesApi.getFavorites();
            const restaurants = (res.restaurants || []).map((r) => typeof r === 'string' ? r : (r.id || r._id || r.restaurantId));
            const items = (res.items || []).map((i) => typeof i === 'string' ? i : (i.id || i._id || i.itemId));
            return {
                restaurants,
                items,
                raw: res.raw || [],
            };
        },
        enabled: !!user,
    });

    const toggleRestaurant = useMutation({
        mutationFn: /** @param {any} p */ async ({ restaurantId, isFav }) => {
            if (isFav) {
                await favoritesApi.removeFavorite('RESTAURANT', restaurantId);
            } else {
                await favoritesApi.addFavorite('RESTAURANT', restaurantId);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
    });

    const toggleItem = useMutation({
        mutationFn: /** @param {any} p */ async ({ itemId, isFav }) => {
            if (isFav) {
                await favoritesApi.removeFavorite('MENU_ITEM', itemId);
            } else {
                await favoritesApi.addFavorite('MENU_ITEM', itemId);
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
    const userId = user?.id || user?.user?.id;
    return useQuery({
        queryKey: ["myOrders", userId],
        queryFn: async () => {
            if (!user) return [];
            const res = await ordersApi.getMyOrders();
            const orders = Array.isArray(res.data) ? res.data : Array.isArray(res.orders) ? res.orders : Array.isArray(res) ? res : [];
            return orders.map(mapOrder);
        },
        enabled: !!user,
        refetchInterval: 10000,
    });
}

export function useOrderById(orderId) {
    return useQuery({
        queryKey: ["order", orderId],
        queryFn: async () => {
            if (!orderId) return null;
            const res = await ordersApi.getOrderById(orderId);
            const rawOrder = res.order || res.data || res;
            return mapOrder(rawOrder);
        },
        enabled: !!orderId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status && ["completed", "cancelled", "rejected"].includes(status)) {
                return false;
            }
            return 5000;
        },
    });
}

export function useRestaurantOrders(restaurantId) {
    return useQuery({
        queryKey: ["restaurantOrders", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return [];
            const res = await ordersApi.getRestaurantOrders();
            const orders = Array.isArray(res.data) ? res.data : Array.isArray(res.orders) ? res.orders : Array.isArray(res) ? res : [];
            return orders.map(mapOrder);
        },
        enabled: !!restaurantId,
    });
}

export function useAdminOrders() {
    return useQuery({
        queryKey: ["adminOrders"],
        queryFn: async () => {
            const res = await ordersApi.getAdminOrders();
            const orders = Array.isArray(res.data) ? res.data : Array.isArray(res.orders) ? res.orders : Array.isArray(res) ? res : [];
            return orders.map(mapOrder);
        },
    });
}



// --- Reviews ---

export function useMyReviews() {
    const { user } = useMarketplaceUser();
    return useQuery({
        queryKey: ["myReviews", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const list = await reviewsApi.getMyReviews();
            return (Array.isArray(list) ? list : []).map(mapReview);
        },
        enabled: !!user,
    });
}

export function useAllReviews() {
    return useQuery({
        queryKey: ["allReviews"],
        queryFn: async () => {
            const list = await reviewsApi.getAllReviews();
            return (Array.isArray(list) ? list : []).map(mapReview);
        },
    });
}

export function useAdminUsers() {
    return useQuery({
        queryKey: ["adminUsers"],
        queryFn: async () => {
            return await authApi.getAdminUsers();
        },
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} p */ async ({ userId, isActive }) => {
            return await authApi.updateUserStatus(userId, isActive);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        },
    });
}

export function useDeleteReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {string} reviewId */ async (reviewId) => {
            return await reviewsApi.deleteReview(reviewId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allReviews"] });
            queryClient.invalidateQueries({ queryKey: ["restaurantReviews"] });
            queryClient.invalidateQueries({ queryKey: ["allRestaurants"] });
            queryClient.invalidateQueries({ queryKey: ["restaurants"] });
        },
    });
}

// --- Admin queries ---

export function useAllRestaurants() {
    return useQuery({
        queryKey: ["allRestaurants"],
        queryFn: async () => {
            const list = await restaurantsApi.getAdminRestaurants();
            return (Array.isArray(list) ? list : []).map(mapRestaurant);
        },
    });
}

export function useRestaurantApplications() {
    return useQuery({
        queryKey: ["restaurantApplications"],
        queryFn: async () => {
            const res = await applicationsApi.getApplications();
            const list = Array.isArray(res.applications || res) ? (res.applications || res) : [];
            return list;
        },
    });
}

export function useCommissionConfig() {
    return useQuery({
        queryKey: ["commissionConfig"],
        queryFn: async () => {
            return await financialsApi.getCommissionConfig();
        },
    });
}

export function useRestaurantFinancials(restaurantId) {
    return useQuery({
        queryKey: ["restaurantFinancials", restaurantId],
        queryFn: async () => {
            if (!restaurantId) return null;
            return await financialsApi.getRestaurantFinancials(restaurantId);
        },
        enabled: !!restaurantId,
    });
}

export function useAdminFinancialRecords(params = {}) {
    return useQuery({
        queryKey: ["adminFinancialRecords", params],
        queryFn: async () => {
            return await financialsApi.getFinancialRecords(params);
        },
    });
}

export function useDashboardMetrics(scope, restaurantId) {
    return useQuery({
        queryKey: ["dashboardMetrics", scope, restaurantId],
        queryFn: async () => {
            return await dashboardApi.getDashboardMetrics(scope, restaurantId);
        },
    });
}

// --- Mutation hooks ---

export function usePlaceOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} orderData */ async (orderData) => {
            return await ordersApi.createOrder(orderData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myOrders"] });
        },
    });
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} p */ async ({ orderId, newStatus }) => {
            return await ordersApi.updateOrderStatus(orderId, newStatus);
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
        mutationFn: /** @param {any} appData */ async (appData) => {
            return await applicationsApi.apply(appData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useApproveApplication() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} applicationId */ async (applicationId) => {
            return await applicationsApi.approveApplication(applicationId);
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
        mutationFn: /** @param {any} p */ async ({ applicationId, rejectionReason }) => {
            return await applicationsApi.rejectApplication(applicationId, rejectionReason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useRequestChanges() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} applicationId */ async (applicationId) => {
            return await applicationsApi.rejectApplication(applicationId, "Changes requested");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantApplications"] });
        },
    });
}

export function useSetRestaurantStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} p */ async ({ restaurantId, status }) => {
            return await restaurantsApi.updateRestaurant(restaurantId, { status });
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
        mutationFn: /** @param {any} p */ async ({ rate, overrides, serviceFee }) => {
            return await financialsApi.updateCommissionConfig(rate, overrides || [], serviceFee);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["commissionConfig"] });
            queryClient.invalidateQueries({ queryKey: ["allRestaurants"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}

export function useSettleFinancialRecord() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} p */ async ({ recordId, notes }) => {
            return await financialsApi.settleFinancialRecord(recordId, notes);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantFinancials"] });
            queryClient.invalidateQueries({ queryKey: ["adminFinancialRecords"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}

export function useManageMenuCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} data */ async (data) => {
            const categoryId = data.categoryId || data.id;
            if (data.action === "delete") {
                return await menuApi.deleteMenuCategory(categoryId);
            }
            if (data.action === "update" || categoryId) {
                return await menuApi.updateMenuCategory(categoryId, { name: data.name, sortOrder: data.sortOrder });
            }
            return await menuApi.createMenuCategory({ name: data.name, sortOrder: data.sortOrder || 1 });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantMenu"] });
        },
    });
}

export function useManageMenuItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} data */ async (data) => {
            const itemId = data.itemId || data.id;
            if (data.action === "delete") {
                return await menuApi.deleteMenuItem(itemId);
            }

            const priceInCents = typeof data.price === "number" && !isNaN(data.price)
                ? Math.round(data.price * 100)
                : undefined;

            const payload = {};
            if (data.categoryId) payload.categoryId = data.categoryId;
            if (data.name) payload.name = data.name;
            if (data.description !== undefined || data.desc !== undefined) payload.description = data.description ?? data.desc ?? "";
            if (priceInCents !== undefined) payload.price = priceInCents;
            if (data.imageUrl !== undefined || data.image !== undefined) payload.imageUrl = data.imageUrl ?? data.image ?? "";
            if (data.isVegetarian !== undefined || data.veg !== undefined) payload.isVegetarian = data.isVegetarian ?? data.veg ?? false;
            if (data.isAvailable !== undefined || data.available !== undefined) payload.isAvailable = data.isAvailable ?? data.available ?? true;
            if (data.isPopular !== undefined || data.popular !== undefined) payload.isPopular = data.isPopular ?? data.popular ?? false;

            if (data.action === "update" || itemId) {
                return await menuApi.updateMenuItem(itemId, payload);
            }
            return await menuApi.createMenuItem(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["restaurantMenu"] });
        },
    });
}

export function useCreateReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} reviewData */ async (reviewData) => {
            return await reviewsApi.createReview(reviewData);
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
    return useQuery({
        queryKey: ["myRestaurant", user?.id],
        queryFn: async () => {
            if (!user) return null;
            const restaurant = await restaurantsApi.getMyRestaurant().catch(() => null);
            if (!restaurant) return null;
            const reviews = await reviewsApi.getRestaurantReviews(restaurant.id || restaurant._id).catch(() => []);
            const stats = computeRestaurantStats((reviews || []).map(mapReview));
            return { ...mapRestaurant(restaurant), ...stats };
        },
        enabled: !!user,
    });
}

// --- Invoices ---

export function useAdminInvoices(params = {}) {
    return useQuery({
        queryKey: ["adminInvoices", params],
        queryFn: async () => {
            const res = await invoicesApi.getAdminInvoices(params);
            return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        },
    });
}

export function useRestaurantInvoices(restaurantId) {
    return useQuery({
        queryKey: ["restaurantInvoices", restaurantId],
        queryFn: async () => {
            const res = await invoicesApi.getRestaurantInvoices({ restaurantId });
            return Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        },
    });
}

export function useGenerateInvoice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} invoiceData */ async (invoiceData) => {
            return await invoicesApi.generateInvoice(invoiceData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
            queryClient.invalidateQueries({ queryKey: ["restaurantInvoices"] });
            queryClient.invalidateQueries({ queryKey: ["adminFinancialRecords"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}

export function useUploadPaymentSlip() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {any} p */ async ({ invoiceId, paymentSlipUrl }) => {
            return await invoicesApi.uploadPaymentSlip(invoiceId, paymentSlipUrl);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
            queryClient.invalidateQueries({ queryKey: ["restaurantInvoices"] });
        },
    });
}

export function useMarkInvoicePaid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: /** @param {string} invoiceId */ async (invoiceId) => {
            return await invoicesApi.markInvoicePaid(invoiceId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
            queryClient.invalidateQueries({ queryKey: ["restaurantInvoices"] });
            queryClient.invalidateQueries({ queryKey: ["adminFinancialRecords"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
        },
    });
}