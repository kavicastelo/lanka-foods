import { useAuth } from '@/lib/AuthContext';

export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    RESTAURANT_ADMIN: 'RESTAURANT_ADMIN',
    CUSTOMER: 'CUSTOMER',
};

/**
 * Derives the marketplace role from the real Base44 user.
 *
 * Role architecture decision:
 * - Built-in `role === "admin"`  -> SUPER_ADMIN (platform administrator)
 * - Built-in `role === "user"` + has `restaurant_id` -> RESTAURANT_ADMIN
 * - Built-in `role === "user"` + no `restaurant_id`  -> CUSTOMER
 *
 * The built-in `role` field is platform-controlled (only admins can change it),
 * so a user cannot self-assign SUPER_ADMIN. RESTAURANT_ADMIN is determined by
 * restaurant ownership (Restaurant.owner_id), set by the application-approval
 * backend function. The `restaurant_id` custom field on the user is UX/RLS
 * convenience only — actual data access is enforced by RLS on each entity
 * checking record-level owner_id / customer_id against {{user.id}}.
 */
export function getMarketplaceRole(user) {
    if (!user) return null;
    if (user.role === 'admin') return ROLES.SUPER_ADMIN;
    const restaurantId = user.data?.restaurant_id || user.restaurant_id;
    if (restaurantId) return ROLES.RESTAURANT_ADMIN;
    return ROLES.CUSTOMER;
}

export function roleHome(role) {
    return ({
        [ROLES.SUPER_ADMIN]: '/admin/dashboard',
        [ROLES.RESTAURANT_ADMIN]: '/restaurant/dashboard',
        [ROLES.CUSTOMER]: '/account',
    })[role] || '/';
}

/**
 * Hook that provides the real Base44 authenticated user plus the derived
 * marketplace role. Replaces the former useMockAuth() hook.
 */
export function useMarketplaceUser() {
    const { user, isAuthenticated, isLoadingAuth, authChecked, authError, logout } = useAuth();
    const marketplaceRole = getMarketplaceRole(user);
    return { user, marketplaceRole, isAuthenticated, isLoadingAuth, authChecked, authError, logout };
}