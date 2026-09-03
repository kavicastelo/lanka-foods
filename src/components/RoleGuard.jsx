import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getMarketplaceRole, roleHome } from "@/lib/marketplaceAuth";

export default function RoleGuard({ roles, children }) {
    const { user, isAuthenticated, isLoadingAuth, authChecked } = useAuth();
    const location = useLocation();

    if (isLoadingAuth || !authChecked) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    const marketplaceRole = getMarketplaceRole(user);
    if (!roles.includes(marketplaceRole)) {
        return <Navigate to={roleHome(marketplaceRole)} replace />;
    }
    return children;
}