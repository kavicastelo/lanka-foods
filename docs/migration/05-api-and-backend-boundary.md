# 05 — API & Backend Boundary Blueprint

## 1. Inventory of Current Backend Interactions

The frontend currently communicates with the Base44 backend via two distinct channels:
1. **Direct Entity SDK CRUD Operations**: Communicating directly with entity storage ([useMarketplaceData.js](file:///d:/talnova/lanka-foods/src/hooks/useMarketplaceData.js)).
2. **Backend Function Invocations**: Invoking server-side Deno TypeScript functions ([base44/functions/](file:///d:/talnova/lanka-foods/base44/functions/)).

---

## 2. Responsibilities MUST Move to Node.js Backend

The following client-side operations currently trust client logic or execute directly via SDK entity calls and **MUST be moved behind server-authoritative Node.js REST endpoints**:

1. **Authentication & Password Management**: User registration, password hashing (Bcrypt/Argon2), JWT token generation, OTP sending/verification, password reset flow.
2. **Role & Permission Determination**: Server-side role assignment based on database records rather than reading client-writable custom fields on user objects.
3. **Restaurant Settings Updates**: [RestaurantAdminDashboard.jsx:271](file:///d:/talnova/lanka-foods/src/pages/RestaurantAdminDashboard.jsx#L271) currently calls `base44.entities.Restaurant.update()` directly. This must be guarded by an authenticated Node endpoint (`PATCH /api/restaurant/profile`) verifying JWT ownership.
4. **Restaurant Application Direct Submissions**: [Register.jsx:72](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L72) creates application records directly. Must go through `POST /api/partner/apply`.
5. **Review Deletion**: [SuperAdminDashboard.jsx:366](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L366) calls `base44.entities.Review.delete()` directly from client. Must be restricted to `DELETE /api/admin/reviews/:id` with admin authorization.
6. **Order Total & Price Verification**: Fully enforce server-side menu price verification, fee additions, minimum order checks, and order number generation.
7. **Dashboard Metrics Aggregations**: Replace client-side dataset filtering with server-side MongoDB aggregation pipelines (`GET /api/dashboard/metrics`).

---

## 3. PROPOSED Node.js REST API Contracts

> `PROPOSED — NOT CURRENTLY IMPLEMENTED`

Below is the proposed contract specification for the future Node.js + Express/Fastify REST API:

### 3.1 Authentication Endpoints (`/api/auth`)
* `POST /api/auth/register`: Accepts `{ email, password, full_name, phone }`. Returns JWT token & user profile.
* `POST /api/auth/login`: Accepts `{ email, password }`. Returns JWT token & user profile.
* `POST /api/auth/verify-otp`: Accepts `{ email, otpCode }`. Verifies OTP code.
* `POST /api/auth/logout`: Invalidates session / clears cookie.
* `GET /api/auth/me`: Returns authenticated user & derived marketplace role.

### 3.2 Marketplace & Restaurant Endpoints (`/api/restaurants`)
* `GET /api/restaurants`: Lists active restaurants. Supports query params `city`, `search`, `cuisine`.
* `GET /api/restaurants/:slug`: Returns detailed restaurant profile & computed review rating stats.
* `GET /api/restaurants/:id/menu`: Returns category-grouped menu items for target restaurant.

### 3.3 Ordering Endpoints (`/api/orders`)
* `POST /api/orders`: Submits new order payload `{ restaurantId, items, deliveryType, deliveryAddress, scheduledDate, scheduledTime, paymentMethod }`. Calculates total server-side, verifies stock/prices, creates order.
* `GET /api/orders/my-orders`: Returns authenticated customer's order history.
* `GET /api/orders/:id`: Returns single order details & tracking status.
* `PATCH /api/orders/:id/status`: Accepts `{ status }`. Enforces order state machine transition for restaurant owner/admin.

### 3.4 Reviews & Favorites (`/api/reviews`, `/api/favorites`)
* `POST /api/reviews`: Accepts `{ orderId, rating, foodRating, text }`. Verifies order is completed & owned by caller.
* `GET /api/favorites`: Returns user's favorited restaurants & menu items.
* `POST /api/favorites/toggle`: Toggles restaurant/item favorite state.

### 3.5 Partner & Application Endpoints (`/api/partner`)
* `POST /api/partner/apply`: Submits restaurant partner application.

### 3.6 Admin Endpoints (`/api/admin`)
* `GET /api/admin/applications`: Lists partner applications.
* `POST /api/admin/applications/:id/approve`: Approves application, creates `Restaurant`, assigns owner.
* `POST /api/admin/applications/:id/reject`: Rejects application.
* `PATCH /api/admin/restaurants/:id/status`: Updates restaurant operational status (`active`, `suspended`).
* `POST /api/admin/commission-rate`: Sets default or restaurant-specific commission rate.
* `DELETE /api/admin/reviews/:id`: Deletes review record.
* `GET /api/admin/dashboard/metrics`: Calculates platform gross revenue, commission earnings, and top metrics.
