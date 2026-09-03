# 01 — Base44 Dependency Map

## 1. Executive Dependency Summary

The application current architecture is tightly coupled to the Base44 platform across multiple layers:
1. **NPM Packages**: `@base44/sdk` (runtime SDK), `@base44/vite-plugin` (Vite build integration).
2. **Authentication**: Base44 Auth service for user management, OTP verification, password resets, and session management.
3. **Data Access**: Base44 Entity SDK (`base44.entities.<Entity>.<method>()`) with JSONC schema definitions (`base44/entities/*.jsonc`).
4. **Backend Logic**: 12 Deno TypeScript backend functions in `base44/functions/` invoked via `base44.functions.invoke()`.
5. **Configuration & Storage**: Base44 URL parameters (`app-params.js`), environment variables (`VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`), and hardcoded media links (`media.base44.com`).

---

## 2. Complete Dependency Inventory & Mapping Table

| Current Base44 Capability | Current Usage & File References | Current Behavior | Dependency Type | Future Replacement | Complexity | Migration Risk |
|---|---|---|---|---|---|---|
| **Base44 Client SDK** | [base44Client.js:7](file:///d:/talnova/lanka-foods/src/api/base44Client.js#L7) | Instantiates Base44 SDK client with `appId`, `token`, `appBaseUrl` | SDK Package | Custom Axios / Fetch REST API Client | Medium | Low |
| **Base44 Vite Plugin** | [vite.config.js:8](file:///d:/talnova/lanka-foods/vite.config.js#L8) | Intercepts `/api` requests, injects Base44 dev tools, handles legacy SDK imports | Build Plugin | Standard Vite Proxy (`vite.config.js`) | Low | Low |
| **App Parameter Reader** | [app-params.js:9-49](file:///d:/talnova/lanka-foods/src/lib/app-params.js#L9-L49) | Reads `base44_app_id`, `base44_access_token` from URL query string or localStorage | Config / Auth | Standard JWT in HttpOnly Cookie / Header | Medium | Low |
| **Base44 Auth - User Check** | [AuthContext.jsx:96](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx#L96), [PageNotFound.jsx:14](file:///d:/talnova/lanka-foods/src/lib/PageNotFound.jsx#L14) | Calls `base44.auth.me()` to fetch current authenticated user profile | Auth API | `GET /api/auth/me` Endpoint | Medium | Medium |
| **Base44 Auth - Email/Password Login** | [SignIn.jsx:22](file:///d:/talnova/lanka-foods/src/pages/SignIn.jsx#L22), [Login.jsx:26](file:///d:/talnova/lanka-foods/src/pages/Login.jsx#L26) | Calls `base44.auth.loginViaEmailPassword(email, password)` | Auth API | `POST /api/auth/login` Endpoint | Medium | High (Auth Security) |
| **Base44 Auth - Social Login** | [Login.jsx:36](file:///d:/talnova/lanka-foods/src/pages/Login.jsx#L36) | Calls `base44.auth.loginWithProvider("google", returnTo)` | Auth API | OAuth2 / Passport.js Google Strategy | High | High |
| **Base44 Auth - User Registration & OTP** | [Register.jsx:28,42,56,100](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L28) | Calls `base44.auth.register()`, `verifyOtp()`, `resendOtp()` | Auth API | `POST /api/auth/register` & Node Mailer OTP | High | High |
| **Base44 Auth - Password Reset** | [ForgotPassword.jsx:18](file:///d:/talnova/lanka-foods/src/pages/ForgotPassword.jsx#L18), [ResetPassword.jsx:28](file:///d:/talnova/lanka-foods/src/pages/ResetPassword.jsx#L28) | Calls `base44.auth.resetPasswordRequest()` and `resetPassword()` | Auth API | `POST /api/auth/forgot-password` and `/reset-password` | Medium | Medium |
| **Base44 Auth - Logout** | [AuthContext.jsx:123,126](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx#L123) | Calls `base44.auth.logout()` | Auth API | `POST /api/auth/logout` | Low | Low |
| **Base44 Public Settings Check** | [AuthContext.jsx:38](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx#L38) | Axios call to `/api/apps/public/prod/public-settings/by-id/${appId}` | Platform API | Native `/api/config/public` endpoint | Low | Low |
| **Entity - Restaurant Read/Filter** | [useMarketplaceData.js:78,89,102,311](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L78) | `Restaurant.filter()`, `Restaurant.get()`, `Restaurant.list()` | Entity CRUD | `GET /api/restaurants`, `GET /api/restaurants/:id` | Medium | Medium |
| **Entity - Restaurant Update** | [RestaurantAdminDashboard.jsx:271](file:///d:/talnova/lanka-foods/src/pages/RestaurantAdminDashboard.jsx#L271) | `base44.entities.Restaurant.update(id, {...})` called directly from client | Entity CRUD | `PATCH /api/restaurant/settings` (Authenticated owner check) | Medium | High (Security) |
| **Entity - MenuItem Read/Filter** | [useMarketplaceData.js:122](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L122), [CustomerAccount.jsx:50](file:///d:/talnova/lanka-foods/src/pages/CustomerAccount.jsx#L50) | `MenuItem.filter()`, `MenuItem.get()` | Entity CRUD | `GET /api/restaurants/:id/menu` | Medium | Low |
| **Entity - MenuCategory Read/Filter** | [useMarketplaceData.js:121](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L121) | `MenuCategory.filter({ restaurant_id })` | Entity CRUD | `GET /api/restaurants/:id/menu-categories` | Low | Low |
| **Entity - Order Read & List** | [useMarketplaceData.js:228,249,264](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L228), [SuperAdminDashboard.jsx:35](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L35) | `Order.filter({ customer_id })`, `Order.get()`, `Order.list()` | Entity CRUD | `GET /api/orders/my-orders`, `GET /api/orders/:id` | High | High (Data Privacy) |
| **Entity - OrderItem Read/Filter** | [useMarketplaceData.js:230,252,265](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L230) | `OrderItem.filter()` | Entity CRUD | Embedded in `Order` document / populate query | Medium | Low |
| **Entity - Review Read & Delete** | [useMarketplaceData.js:112,144,288,299](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L112), [SuperAdminDashboard.jsx:366](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L366) | `Review.filter()`, `Review.list()`, `Review.delete()` | Entity CRUD | `GET /api/reviews`, `DELETE /api/reviews/:id` | Medium | Medium |
| **Entity - Favorite CRUD** | [useMarketplaceData.js:171,186,200](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L171) | `Favorite.filter()`, `Favorite.create()`, `Favorite.delete()` | Entity CRUD | `GET/POST/DELETE /api/favorites` | Medium | Low |
| **Entity - RestaurantApplication Direct Create** | [Register.jsx:72](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L72) | `base44.entities.RestaurantApplication.create({...})` directly called from client | Entity CRUD | `POST /api/partner/apply` | Medium | High (Security) |
| **Backend Function - placeOrder** | [useMarketplaceData.js:353](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L353) | `base44.functions.invoke("placeOrder", orderData)` | Backend Function | `POST /api/orders` Node Service | High | High (Financial) |
| **Backend Function - updateOrderStatus** | [useMarketplaceData.js:366](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L366) | `base44.functions.invoke("updateOrderStatus", { orderId, newStatus })` | Backend Function | `PATCH /api/orders/:id/status` Node Service | High | High (Order Lifecycle) |
| **Backend Function - submitRestaurantApplication** | [useMarketplaceData.js:381](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L381) | `base44.functions.invoke("submitRestaurantApplication", appData)` | Backend Function | `POST /api/partner/apply` Node Service | Medium | Medium |
| **Backend Function - approveRestaurantApplication** | [useMarketplaceData.js:394](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L394) | `base44.functions.invoke("approveRestaurantApplication", { applicationId })` | Backend Function | `POST /api/admin/applications/:id/approve` | High | High |
| **Backend Function - rejectRestaurantApplication** | [useMarketplaceData.js:409](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L409) | `base44.functions.invoke("rejectRestaurantApplication", { applicationId })` | Backend Function | `POST /api/admin/applications/:id/reject` | Medium | Low |
| **Backend Function - requestRestaurantChanges** | [useMarketplaceData.js:422](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L422) | `base44.functions.invoke("requestRestaurantChanges", { applicationId })` | Backend Function | `POST /api/admin/applications/:id/request-changes` | Medium | Low |
| **Backend Function - setRestaurantStatus** | [useMarketplaceData.js:435](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L435) | `base44.functions.invoke("setRestaurantStatus", { restaurantId, status })` | Backend Function | `PATCH /api/admin/restaurants/:id/status` | Medium | High |
| **Backend Function - setCommissionRate** | [useMarketplaceData.js:449](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L449) | `base44.functions.invoke("setCommissionRate", { rate, restaurantId })` | Backend Function | `POST /api/admin/commission-rate` | Medium | Medium |
| **Backend Function - manageMenuCategory** | [useMarketplaceData.js:464](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L464) | `base44.functions.invoke("manageMenuCategory", data)` | Backend Function | `POST/PATCH/DELETE /api/restaurant/menu-categories` | Medium | Medium |
| **Backend Function - manageMenuItem** | [useMarketplaceData.js:477](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L477) | `base44.functions.invoke("manageMenuItem", data)` | Backend Function | `POST/PATCH/DELETE /api/restaurant/menu-items` | Medium | Medium |
| **Backend Function - createReview** | [useMarketplaceData.js:490](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L490) | `base44.functions.invoke("createReview", reviewData)` | Backend Function | `POST /api/reviews` | Medium | Medium |
| **Backend Function - getDashboardMetrics** | [useMarketplaceData.js:341](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js#L341) | `base44.functions.invoke("getDashboardMetrics", { scope, restaurantId })` | Backend Function | `GET /api/dashboard/metrics` | High | Medium |
| **Base44 Media Storage CDN** | [constants.js:5-11](file:///d:/talnova/lanka-foods/src/lib/constants.js#L5-L11), [SignIn.jsx:33](file:///d:/talnova/lanka-foods/src/pages/SignIn.jsx#L33) | `https://media.base44.com/images/public/...` hardcoded image URLs | Media CDN | Cloudflare R2 / S3-compatible storage | Medium | Low |

---

## 3. Base44 Entity Definitions (`base44/entities/*.jsonc`)

The repository contains 11 entity schemas defined as JSON schema files with Row Level Security (RLS) policies:

1. **User.jsonc**: Defines platform role (`admin` or `user`), phone, and `restaurant_id`.
2. **Restaurant.jsonc**: Stores restaurant profile, status (`pending`, `active`, `suspended`, `rejected`, `changes_requested`), owner ID, delivery settings, and commission rate.
3. **GlobalCategory.jsonc**: Defines food categories (e.g., Rice & Curry, Kottu).
4. **MenuCategory.jsonc**: Restaurant-specific menu sections.
5. **MenuItem.jsonc**: Dishes offered by restaurants with price, availability, vegetarian flag.
6. **Order.jsonc**: Main order record with lifecycle status (`received` through `completed`), delivery details, customer info, server-verified subtotal/total.
7. **OrderItem.jsonc**: Line items within an order (item snapshot at order time).
8. **Review.jsonc**: Ratings (1-5) and feedback linked to completed orders.
9. **Favorite.jsonc**: User favorited restaurants and menu items.
10. **RestaurantApplication.jsonc**: Partner registration applications submitted by prospective restaurant owners.
11. **CommissionConfig.jsonc**: Platform default commission percentage (default 10%).

---

## 4. Base44 Deno Functions (`base44/functions/`)

All 12 backend functions use Deno TypeScript imports:
* `import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";`
* Shared auth helpers from `../../shared/auth.ts`:
  * `requireAuth(base44)`: Ensures user session is active.
  * `requireAdmin(user)`: Checks `user.role === "admin"`.
  * `verifyRestaurantOwnership(base44, restaurantId, user)`: Ensures user owns target restaurant or is admin (using `base44.asServiceRole`).
  * `isValidTransition(fromStatus, toStatus)`: Order status state machine validator.

These functions execute server-authoritative validations (such as server-side price lookup in `placeOrder`, idempotency checks in `approveRestaurantApplication`, and state machine checks in `updateOrderStatus`). They will serve as the exact logical specification when rewriting the Node.js + TypeScript backend.
