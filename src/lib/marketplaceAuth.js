import { useAuth } from '@/lib/AuthContext';

export const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    RESTAURANT_ADMIN: 'RESTAURANT_ADMIN',
    CUSTOMER: 'CUSTOMER',
};

/**
 * Derives the marketplace role from the authenticated user.
 * Server returns authoritative role in user.role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN' | 'CUSTOMER'.
 */
export function getMarketplaceRole(user) {
    if (!user) return null;
    if (user.user.role === 'SUPER_ADMIN' || user.user.role === 'admin') return ROLES.SUPER_ADMIN;
    if (user.user.role === 'RESTAURANT_ADMIN' || user.user.data?.restaurant_id || user.user.restaurant_id) return ROLES.RESTAURANT_ADMIN;
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
 * Hook that provides the authenticated user plus the derived marketplace role.
 */
export function useMarketplaceUser() {
    const { user, isAuthenticated, isLoadingAuth, authChecked, authError, logout } = useAuth();
    const marketplaceRole = getMarketplaceRole(user);
    return { user, marketplaceRole, isAuthenticated, isLoadingAuth, authChecked, authError, logout };
}