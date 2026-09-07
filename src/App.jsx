import { Toaster } from "@/components/ui/toaster"
import PwaInstallBanner from '@/components/PwaInstallBanner';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import GlobalNotificationListener from '@/components/GlobalNotificationListener';
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
import { lazy, Suspense } from 'react';
import Home from '@/pages/Home';

const Restaurants = lazy(() => import('@/pages/Restaurants'));
const RestaurantStorefront = lazy(() => import('@/pages/RestaurantStorefront'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const OrderTracking = lazy(() => import('@/pages/OrderTracking'));
const CustomerAccount = lazy(() => import('@/pages/CustomerAccount'));
const BecomePartner = lazy(() => import('@/pages/BecomePartner'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const ForPartners = lazy(() => import('@/pages/ForPartners'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const ContactUs = lazy(() => import('@/pages/ContactUs'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const RestaurantAdminDashboard = lazy(() => import('@/pages/RestaurantAdminDashboard'));

const RouteLoader = () => (
    <div className="w-full py-12 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background/50">
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
        <Suspense fallback={<RouteLoader />}>
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
        </Suspense>
    );
};


function App() {

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <MarketplaceProvider>
                    <Router>
                        <ScrollToTop />
                        <GlobalNotificationListener />
                        <AuthenticatedApp />
                        <PwaInstallBanner />
                        <PwaUpdatePrompt />
                    </Router>
                </MarketplaceProvider>
                <Toaster />
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default App