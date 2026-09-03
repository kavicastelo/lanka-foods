# Phase 0 — Codebase Discovery Report

## 1. Executive Summary

This report documents the Phase 0 Codebase Discovery, Base44 Decoupling, and Migration Blueprint for **LankaEats Finland**, a multi-restaurant food delivery marketplace copied locally from a Base44 prototype project.

The audit was conducted strictly against the actual codebase, static imports, build behavior, entity schemas, backend Deno TypeScript functions, and browser runtime execution.

### Key Finding:
The application frontend is fully realized visually and structurally, with 17 React pages, a custom design system, client-side cart management, and comprehensive data hooks (`useMarketplaceData.js`). However, **the application remains 100% dependent on Base44 runtime services for authentication, entity storage, and backend functions**. When disconnected from the Base44 backend, all API queries fail, leaving dynamic pages in loading or empty states.

---

## 2. Repository Status

* **Status**: `PASS — WITH CRITICAL FINDINGS`
* **Local Workspace**: `d:\talnova\lanka-foods`
* **Structural Completeness**: 100% of copied React components, pages, context providers, Base44 entity definitions (`.jsonc`), and backend Deno functions (`.ts`) are present.
* **Environment Status**: `.env` file exists but is **0 bytes (EMPTY)**. Environment variables `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL` are unconfigured.

---

## 3. Current Architecture

```
[React 18 + Vite 6 Single Page Application]
       │
       ├── State & Caching: TanStack React Query (useMarketplaceData.js)
       ├── UI: Tailwind CSS + Radix UI + Lucide Icons
       │
       ▼ (All API calls pass through Base44 Client SDK)
[@base44/sdk createClient]
       │
       ├── Auth: Base44 Auth Service (loginViaEmailPassword, verifyOtp, me)
       ├── Database: Base44 Entity Engine (11 JSONC Entity Schemas with RLS)
       └── Backend Logic: 12 Deno TypeScript Functions (base44/functions/)
```

---

## 4. Base44 Dependency Status

* **SDK Packages**: `@base44/sdk` (`^0.8.44`) and `@base44/vite-plugin` (`^1.0.34`).
* **Entity Operations**: Frontend data hooks ([useMarketplaceData.js](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js)) make direct SDK CRUD calls: `Restaurant.filter()`, `MenuItem.filter()`, `Order.filter()`, `Favorite.filter()`, `Review.filter()`, `RestaurantApplication.list()`.
* **Backend Function Calls**: Frontend invokes 12 Deno TypeScript functions via `base44.functions.invoke()`: `placeOrder`, `updateOrderStatus`, `submitRestaurantApplication`, `approveRestaurantApplication`, `rejectRestaurantApplication`, `requestRestaurantChanges`, `setRestaurantStatus`, `setCommissionRate`, `manageMenuCategory`, `manageMenuItem`, `createReview`, `getDashboardMetrics`.
* **Static Assets**: Image constants in `src/lib/constants.js:5-11` point directly to Base44 CDN (`media.base44.com`).

---

## 5. Authentication Status

* **Implementation**: Base44 Auth Service wrapper in [AuthContext.jsx](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx).
* **Methods**: Email/password login, Google OAuth redirect, OTP registration, password reset request/confirmation.
* **Token Storage**: Session access tokens stored in unencrypted browser `localStorage` (`base44_access_token`, `token`).
* **Auth Guard**: [ProtectedRoute.jsx](file:///d:/talnova/lanka-foods/src/components/ProtectedRoute.jsx) checks `isAuthenticated` flag from `AuthContext`.

---

## 6. Authorization Status

* **Role Derivation**: Client-side role derivation in [marketplaceAuth.js:24-30](file:///d:/talnova/lanka-foods/src/lib/marketplaceAuth.js#L24-L30):
  * `SUPER_ADMIN`: `user.role === 'admin'`
  * `RESTAURANT_ADMIN`: `user.role === 'user'` AND `user.restaurant_id` exists
  * `CUSTOMER`: `user.role === 'user'` AND no `restaurant_id`
* **Route Protection**: [RoleGuard.jsx](file:///d:/talnova/lanka-foods/src/components/RoleGuard.jsx) guards routes `/account`, `/admin/dashboard`, `/restaurant/dashboard`.
* **Security Risk**: Client-side role derivation relies on reading user attributes. Server REST API must enforce independent RBAC middleware.

---

## 7. Data Model Status

Reconstructed from `base44/entities/*.jsonc` schema files:
1. `User`: User profile and role (`admin` / `user`).
2. `Restaurant`: Multi-vendor restaurant profile, status, delivery options, time slots, owner link.
3. `MenuItem`: Dishes offered by restaurants with price, availability, vegetarian flag.
4. `MenuCategory`: Category headers per restaurant.
5. `Order`: Order header with status lifecycle (`received` through `completed`), monetary totals, customer info.
6. `OrderItem`: Line items snapshotting dish name and price at order time.
7. `Review`: Customer rating and feedback linked to completed orders.
8. `Favorite`: User favorited restaurants and dishes.
9. `RestaurantApplication`: Partner application submissions.
10. `CommissionConfig`: Platform commission percentage (default 10%).
11. `GlobalCategory`: Platform-wide categories (e.g. Rice & Curry).

---

## 8. Business Logic Status

Extracted from backend TypeScript functions (`base44/functions/**/*.ts`):
* **Cart Isolation**: Cart holds items from only one restaurant at a time ([MarketplaceContext.jsx:15-17](file:///d:/talnova/lanka-foods/src/context/MarketplaceContext.jsx#L15-L17)).
* **Server-Verified Pricing**: Order placement recalculates line totals and fees server-side from database prices ([placeOrder/entry.ts:84-101](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L84-L101)).
* **Minimum Order**: Enforced during order placement ([placeOrder/entry.ts:103-109](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L103-L109)).
* **Order Status State Machine**: Enforces legal status transitions (`received` → `accepted` → `preparing` → `ready` → `out_for_delivery` → `completed`) ([auth.ts:44-53](file:///d:/talnova/lanka-foods/base44/shared/auth.ts#L44-L53)).
* **Verified Reviews**: Requires completed order owned by caller, max 1 review per order ([createReview/entry.ts:23-47](file:///d:/talnova/lanka-foods/base44/functions/createReview/entry.ts#L23-L47)).

---

## 9. Frontend Status

* **Framework**: React 18 SPA built with Vite 6.
* **Pages**: 17 complete application pages covering customer, restaurant admin, super admin, and auth flows.
* **UI Quality**: Excellent modern UI with Tailwind CSS, custom badges, dialogs, charts, toasts, and loading skeletons.

---

## 10. Backend Status

* **Current State**: Non-existent independent backend. All backend functions are Deno TypeScript scripts tied to Base44 infrastructure (`base44/functions/`).
* **Target Architecture**: Modular monolith built with Node.js + Express/Fastify + TypeScript + MongoDB + Mongoose.

---

## 11. Hardcoded / Mock Data

* **Legitimate UI Constants**: Municipality list (`cities`), business type list (`businessTypes`) in `src/lib/constants.js`.
* **Hardcoded Base44 CDN Images**: Dish/hero banner URLs in `constants.js:5-11`, `SignIn.jsx:33`, `RestaurantAdminDashboard.jsx:192`.
* **Mock Fallbacks**: Service fee hardcoded to `€0.99` in `Cart.jsx:14` and `placeOrder/entry.ts:100`.

---

## 12. Security Findings

* **P0 Security Risk**: [RestaurantAdminDashboard.jsx:271](file:///d:/talnova/lanka-foods/src/pages/RestaurantAdminDashboard.jsx#L271) calls `base44.entities.Restaurant.update()` directly from the client.
* **P0 Security Risk**: [SuperAdminDashboard.jsx:366](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L366) calls `base44.entities.Review.delete()` directly from the client.
* **P0 Security Risk**: [Register.jsx:72](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L72) creates `RestaurantApplication` records directly via client SDK, bypassing backend function duplicate checks.
* **P1 Security Risk**: Authentication access tokens stored in unencrypted browser `localStorage`.
* **P2 Financial Risk**: Checkout flow lacks real payment gateway processing (card selection sets status to pending without charging funds).

---

## 13. Runtime Verification

* **Dev Server (`npm run dev`)**: Serves application at `http://localhost:5173/`. Displays Base44 backend unconfigured warning.
* **Browser Automation Flows**:
  * Homepage (`/`): **PASS** (UI renders header, hero, search, categories).
  * Restaurants (`/restaurants`): **FAIL** (Empty list state; Base44 backend unreachable).
  * Storefront (`/restaurant/galle-garden`): **FAIL** (Infinite spinner; Base44 API call fails).
  * Cart (`/cart`) & Checkout (`/checkout`): **PASS** (Renders empty cart & checkout prompts).
  * Auth Pages (`/login`, `/register`, `/partner`): **PASS** (Forms render cleanly).

---

## 14. File Integrity

* **Structure**: Complete copy of prototype repository.
* **Typecheck (`npm run typecheck`)**: **FAILED** (40+ TS compilation errors in JSX files).
* **Lint (`npm run lint`)**: **FAILED** (10 unused import errors).
* **Build (`npm run build`)**: **SUCCESS** (Builds production bundle with Base44 app ID warning).

---

## 15. Critical Blockers

1. **Missing Independent Node Backend**: No REST API server exists in the repository.
2. **Missing Local Database**: No MongoDB connection or database schema initialization exists.
3. **Base44 Platform Lock-in**: Application fails data loading without Base44 SDK backend configuration.

---

## 16. Migration Risks

* **RISK-01 (P0)**: Base44 platform lock-in.
* **RISK-02 (P0)**: Direct client entity mutations.
* **RISK-03 (P1)**: Unencrypted token storage in localStorage.
* **RISK-04 (P1)**: Missing payment gateway integration.
* **RISK-05 (P2)**: TS compilation & lint errors.

---

## 17. Recommended Migration Order

1. Node.js Backend Foundation & Express Setup
2. MongoDB Schemas & Mongoose Models
3. Independent JWT Authentication & RBAC Middleware
4. Restaurant & Menu REST APIs
5. Server-Authoritative Ordering Engine & State Machine
6. Payment Gateway Integration (Stripe / Paytrail)
7. Reviews, Favorites & Partner Application Workflows
8. Admin & Dashboard Aggregation APIs
9. Cloudflare R2 Media Storage Migration
10. Frontend API Client Replacement & Decoupling
11. End-to-End Integration Testing & Build Cleanup

---

## 18. Phase 0 Acceptance Status

### VERIFIED
* Direct entity mutation calls in client components (`RestaurantAdminDashboard.jsx:271`, `SuperAdminDashboard.jsx:366`, `Register.jsx:72`).
* Server-side price lookup and minimum order validation in `placeOrder/entry.ts`.
* Order status legal transition state machine in `base44/shared/auth.ts`.
* Presence of 11 entity definitions (`.jsonc`) and 12 backend Deno functions (`.ts`).
* Vite dev server runs at `http://localhost:5173/` but logs Base44 backend proxy unconfigured warning.
* Production build succeeds (`npm run build`) but typecheck (`npm run typecheck`) and lint (`npm run lint`) fail.

### INFERRED
* Base44 legacy prototype was built rapidly using Base44 visual edit agent and auto-generated entity RLS policies.
* Media URLs stored on `media.base44.com` will require automated migration script to transfer assets to Cloudflare R2.

### NOT TESTED
* Real payment card charging flow (no active payment gateway configured).
* Cross-tenant customer data isolation under multi-customer concurrent load (requires live database setup).

### BLOCKED
* Real database CRUD operations over network (blocked by unconfigured `VITE_BASE44_APP_BASE_URL` and missing Base44 backend).

### P0 BLOCKERS
1. Absence of independent Node.js backend & MongoDB database.
2. Direct client-side SDK entity mutations bypassing server controllers.
3. Total dependency of `@base44/sdk` for authentication and data fetching.
