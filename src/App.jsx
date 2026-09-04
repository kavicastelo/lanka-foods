import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import { MarketplaceProvider } from '@/context/MarketplaceContext';
import RoleGuard from '@/components/RoleGuard';
import ProtectedRoute from '@/components/ProtectedRoute';
import Home from '@/pages/Home';
import Restaurants from '@/pages/Restaurants';
import RestaurantStorefront from '@/pages/RestaurantStorefront';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderConfirmation from '@/pages/OrderConfirmation';
import OrderTracking from '@/pages/OrderTracking';
import CustomerAccount from '@/pages/CustomerAccount';
import BecomePartner from '@/pages/BecomePartner';
import AboutUs from '@/pages/AboutUs';
import ForPartners from '@/pages/ForPartners';
import TermsAndConditions from '@/pages/TermsAndConditions';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import ContactUs from '@/pages/ContactUs';
import SignIn from '@/pages/SignIn';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import RestaurantAdminDashboard from '@/pages/RestaurantAdminDashboard';

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (authError) {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        } else if (authError.type === 'auth_required') {
            navigateToLogin();
            return null;
        }
    }

    return (
        <Routes>
            <Route path="/login" element={<SignIn />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/restaurants" element={<Restaurants />} />
                <Route path="/restaurant/:slug" element={<RestaurantStorefront />} />
                <Route path="/cart" element={<Cart />} />
                <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order/:id/confirmation" element={<OrderConfirmation />} />
                    <Route path="/order/:id" element={<OrderTracking />} />
                </Route>
                <Route path="/partner" element={<BecomePartner />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/for-partners" element={<ForPartners />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/account" element={<RoleGuard roles={["CUSTOMER"]}><CustomerAccount /></RoleGuard>} />
            </Route>

            <Route path="/admin/dashboard" element={<RoleGuard roles={["SUPER_ADMIN"]}><SuperAdminDashboard /></RoleGuard>} />
            <Route path="/restaurant/dashboard" element={<RoleGuard roles={["RESTAURANT_ADMIN"]}><RestaurantAdminDashboard /></RoleGuard>} />

            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};


function App() {

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <MarketplaceProvider>
                    <Router>
                        <ScrollToTop />
                        <AuthenticatedApp />
                    </Router>
                </MarketplaceProvider>
                <Toaster />
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default App