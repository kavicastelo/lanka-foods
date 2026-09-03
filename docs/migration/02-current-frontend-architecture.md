# 02 — Current Frontend Architecture

## 1. Overview & Entry Points

* **Framework**: React 18 SPA built with Vite 6.
* **HTML Entry**: [index.html](file:///d:/talnova/lanka-foods/index.html) (`<div id="root"></div>`, imports `/src/main.jsx`).
* **React Mount**: [src/main.jsx](file:///d:/talnova/lanka-foods/src/main.jsx) (Renders `<App />`).
* **Application Root & Routing**: [src/App.jsx](file:///d:/talnova/lanka-foods/src/App.jsx) (Wraps app in `AuthProvider`, `QueryClientProvider`, `MarketplaceProvider`, `BrowserRouter`).

---

## 2. Component Hierarchy & Routing Map

```
App
├── AuthProvider (AuthContext.jsx)
│   ├── QueryClientProvider (queryClientInstance)
│   │   ├── MarketplaceProvider (MarketplaceContext.jsx)
│   │   │   └── BrowserRouter
│   │   │       ├── ScrollToTop
│   │   │       ├── AuthenticatedApp
│   │   │       │   ├── Routes (Unprotected Auth Routes)
│   │   │       │   │   ├── /login -> SignIn.jsx
│   │   │       │   │   ├── /register -> Register.jsx
│   │   │       │   │   ├── /forgot-password -> ForgotPassword.jsx
│   │   │       │   │   └── /reset-password -> ResetPassword.jsx
│   │   │       │   │
│   │   │       │   ├── Layout (Navbar.jsx + Outlet + Footer.jsx)
│   │   │       │   │   ├── / -> Home.jsx
│   │   │       │   │   ├── /restaurants -> Restaurants.jsx
│   │   │       │   │   ├── /restaurant/:slug -> RestaurantStorefront.jsx
│   │   │       │   │   ├── /cart -> Cart.jsx
│   │   │       │   │   ├── /partner -> BecomePartner.jsx
│   │   │       │   │   ├── ProtectedRoute (Requires Auth)
│   │   │       │   │   │   ├── /checkout -> Checkout.jsx
│   │   │       │   │   │   ├── /order/:id/confirmation -> OrderConfirmation.jsx
│   │   │       │   │   │   └── /order/:id -> OrderTracking.jsx
│   │   │       │   │   └── RoleGuard (roles: ["CUSTOMER"])
│   │   │       │   │       └── /account -> CustomerAccount.jsx
│   │   │       │   │
│   │   │       │   ├── RoleGuard (roles: ["SUPER_ADMIN"])
│   │   │       │   │   └── /admin/dashboard -> SuperAdminDashboard.jsx
│   │   │       │   │
│   │   │       │   ├── RoleGuard (roles: ["RESTAURANT_ADMIN"])
│   │   │       │   │   └── /restaurant/dashboard -> RestaurantAdminDashboard.jsx
│   │   │       │   │
│   │   │       │   └── * -> PageNotFound.jsx
│   │   │       │
│   │   │       └── Toaster (Radix Toast container)
```

---

## 3. State Management Architecture

The application uses a three-tier state management model:

### 3.1 Session & Authentication State ([AuthContext.jsx](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx))
* **Responsibility**: Manages current user object (`user`), authentication flags (`isAuthenticated`, `isLoadingAuth`, `authChecked`), and public settings.
* **Storage**: Session access tokens are stored in browser `localStorage` under key `base44_access_token` or `token`.
* **Flow**: On initial load, `checkAppState()` queries `/api/apps/public/prod/public-settings/by-id/${appParams.appId}` using `createAxiosClient`. If `appParams.token` is present, it calls `base44.auth.me()` to set `user`.

### 3.2 Client-Side Cart State ([MarketplaceContext.jsx](file:///d:/talnova/lanka-foods/src/context/MarketplaceContext.jsx))
* **Responsibility**: Manages transient shopping cart state entirely in React memory (`useState`).
* **Cart Rule**: Restricts cart items to a single restaurant. If a user adds an item from a different restaurant ID, the cart resets with the new item ([MarketplaceContext.jsx:15-17](file:///d:/talnova/lanka-foods/src/context/MarketplaceContext.jsx#L15-L17)).
* **Calculations**: Calculates `cartCount` and `cartSubtotal` client-side using `Array.prototype.reduce()`.

### 3.3 Server & Entity Data Cache ([useMarketplaceData.js](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js))
* **Responsibility**: Wraps all asynchronous database operations, query caching, and backend function invocations using `@tanstack/react-query`.
* **Mapping Layer**: Provides mapping utilities (`mapRestaurant`, `mapMenuItem`, `mapOrder`, `mapReview`) to transform snake_case database schema fields into camelCase properties used by React components.
* **Mutation Invalidation**: Automatically invalidates relevant QueryKeys (e.g. `["myOrders"]`, `["restaurantMenu"]`, `["dashboardMetrics"]`) on successful backend mutation executions.

---

## 4. Role & Authorization Architecture ([marketplaceAuth.js](file:///d:/talnova/lanka-foods/src/lib/marketplaceAuth.js))

Marketplace roles are derived on the client from the Base44 user object:

```javascript
export function getMarketplaceRole(user) {
    if (!user) return null;
    if (user.role === 'admin') return ROLES.SUPER_ADMIN;
    const restaurantId = user.data?.restaurant_id || user.restaurant_id;
    if (restaurantId) return ROLES.RESTAURANT_ADMIN;
    return ROLES.CUSTOMER;
}
```

* **SUPER_ADMIN**: Derived from built-in `user.role === 'admin'`. Grants access to `/admin/dashboard`.
* **RESTAURANT_ADMIN**: Derived from `user.role === 'user'` AND presence of `user.restaurant_id`. Grants access to `/restaurant/dashboard`.
* **CUSTOMER**: Default for `user.role === 'user'` without `restaurant_id`. Grants access to `/account`.

### Route Protection Mechanisms:
* **[ProtectedRoute.jsx](file:///d:/talnova/lanka-foods/src/components/ProtectedRoute.jsx)**: Verifies `isAuthenticated` and `authChecked`. If unauthenticated, redirects to `/login`.
* **[RoleGuard.jsx](file:///d:/talnova/lanka-foods/src/components/RoleGuard.jsx)**: Calls `useMarketplaceUser()`, derives `marketplaceRole`, and verifies whether `roles.includes(marketplaceRole)`. If forbidden, redirects to derived `roleHome(marketplaceRole)`.

---

## 5. Detailed Data Flow Tracing for Key User Flows

### Flow 1: Order Placement
1. **User Action**: Clicks "Place Order" on [Checkout.jsx:199](file:///d:/talnova/lanka-foods/src/pages/Checkout.jsx#L199).
2. **Component**: `Checkout.jsx` triggers `submit()` function.
3. **Hook**: Calls `usePlaceOrder().mutate(...)` from [useMarketplaceData.js:349](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L349).
4. **SDK Call**: Invokes `base44.functions.invoke("placeOrder", orderData)`.
5. **Backend Function**: [base44/functions/placeOrder/entry.ts](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts):
   - Authenticates session (`requireAuth`).
   - Fetches target restaurant via `asServiceRole.entities.Restaurant.get()`.
   - Fetches menu items via `asServiceRole.entities.MenuItem.filter()`.
   - Computes server-authoritative subtotal and total fees.
   - Enforces minimum order value.
   - Generates order number (`LE-10235...`).
   - Creates `Order` record and bulk-creates `OrderItem` records.
6. **Response**: Returns `{ order, orderItems }`.
7. **UI**: `Checkout.jsx` executes `clearCart()`, invalidates `myOrders` query, and navigates to `/order/:id/confirmation`.

### Flow 2: Restaurant Partner Application
1. **User Action**: Fills out partner application form on [BecomePartner.jsx:66](file:///d:/talnova/lanka-foods/src/pages/BecomePartner.jsx#L66).
2. **Component**: Calls `submitMutation.mutate(...)`.
3. **Hook**: `useSubmitApplication` in [useMarketplaceData.js:377](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L377).
4. **SDK Call**: Invokes backend function `"submitRestaurantApplication"`.
5. **Backend Function**: [base44/functions/submitRestaurantApplication/entry.ts](file:///d:/talnova/lanka-foods/base44/functions/submitRestaurantApplication/entry.ts):
   - Ensures no existing pending application for `applicant_user_id`.
   - Creates `RestaurantApplication` entity with `status: "pending"`.
6. **UI**: Displays confirmation screen ("Application received!").
