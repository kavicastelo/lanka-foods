# PHASE 1 — BACKEND IMPLEMENTATION REPORT
## LankaEats Finland — Base44 Backend Foundation

> **Status: Phase 1 complete.** Entities created, real authentication wired, RLS configured. No business data migrated yet. No payment processing. Not production-ready.

---

## 1. Entities Actually Created

All 11 entities were created in `base44/entities/` and verified as queryable:

| # | Entity | File | Records | Verified |
|---|---|---|---|---|
| 1 | User (extended) | `base44/entities/User.jsonc` | 1 (builder) | ✅ `list()` returns 1 |
| 2 | Restaurant | `base44/entities/Restaurant.jsonc` | 0 | ✅ `list()` returns 0 |
| 3 | GlobalCategory | `base44/entities/GlobalCategory.jsonc` | 0 | ✅ `list()` returns 0 |
| 4 | MenuCategory | `base44/entities/MenuCategory.jsonc` | 0 | ✅ `list()` returns 0 |
| 5 | MenuItem | `base44/entities/MenuItem.jsonc` | 0 | ✅ `list()` returns 0 |
| 6 | Order | `base44/entities/Order.jsonc` | 0 | ✅ `list()` returns 0 |
| 7 | OrderItem | `base44/entities/OrderItem.jsonc` | 0 | ✅ `list()` returns 0 |
| 8 | Review | `base44/entities/Review.jsonc` | 0 | ✅ `list()` returns 0 |
| 9 | RestaurantApplication | `base44/entities/RestaurantApplication.jsonc` | 0 | ✅ `list()` returns 0 |
| 10 | CommissionConfig | `base44/entities/CommissionConfig.jsonc` | 1 (seeded) | ✅ `list()` returns 1, rate=10 |
| 11 | Favorite | `base44/entities/Favorite.jsonc` | 0 | ✅ `list()` returns 0 |

A default `CommissionConfig` record was seeded with `default_rate: 10` via `exec_tool`.

---

## 2. Final Field Schemas

### User (built-in, extended)
| Field | Type | Notes |
|---|---|---|
| `role` | string enum `["admin","user"]` | Built-in. `admin` = SUPER_ADMIN. |
| `phone` | string | Custom. User phone. |
| `restaurant_id` | string | Custom. Set by approval backend function. UX/RLS convenience only. |

Built-in fields (not declared): `id`, `created_date`, `full_name`, `email`.

### Restaurant
| Field | Type | Required | RLS |
|---|---|---|---|
| `name` | string | ✅ | read: active OR owner OR admin; create: admin; update: owner OR admin; delete: admin |
| `slug` | string | ✅ | |
| `owner_id` | string | ✅ | |
| `city` | string | ✅ | |
| `address` | string | | |
| `phone` | string | | |
| `email` | string | | |
| `cover_image_url` | string | | |
| `logo_text` | string | | |
| `description` | string | | |
| `cuisines` | array<string> | | |
| `price_range` | string | | |
| `prep_time` | string | | |
| `min_order` | number | | |
| `delivery_fee` | number | | |
| `pickup` | boolean | | |
| `delivery` | boolean | | |
| `halal` | boolean | | |
| `catering` | boolean | | |
| `is_open` | boolean | | |
| `hours` | string | | |
| `time_slots` | array<string> | | |
| `featured` | boolean | | |
| `status` | enum `["pending","active","suspended","rejected","changes_requested"]` | ✅ | |
| `commission_rate` | number | | null = use platform default |

### GlobalCategory
| Field | Type | Required | RLS |
|---|---|---|---|
| `name` | string | ✅ | read: active OR admin; create/update/delete: admin |
| `slug` | string | ✅ | |
| `image_url` | string | | |
| `sort_order` | number | | |
| `is_active` | boolean | | |

### MenuCategory
| Field | Type | Required | RLS |
|---|---|---|---|
| `restaurant_id` | string | ✅ | read: public; create/update/delete: restaurant_id matches user's OR admin |
| `name` | string | ✅ | |
| `sort_order` | number | | |

### MenuItem
| Field | Type | Required | RLS |
|---|---|---|---|
| `restaurant_id` | string | ✅ | read: public; create/update/delete: restaurant_id matches user's OR admin |
| `category_id` | string | ✅ | |
| `name` | string | ✅ | |
| `description` | string | | |
| `price` | number | ✅ | Server-authoritative for orders |
| `image_url` | string | | |
| `is_vegetarian` | boolean | | |
| `is_available` | boolean | | |
| `is_popular` | boolean | | |
| `sort_order` | number | | |

### Order
| Field | Type | Required | RLS |
|---|---|---|---|
| `order_number` | string | ✅ | read: customer_id=own OR restaurant_id=own OR admin; create: customer_id=own OR admin; update: restaurant_id=own OR admin; delete: admin |
| `restaurant_id` | string | ✅ | |
| `customer_id` | string | ✅ | Set server-side from session |
| `customer_name` | string | | |
| `customer_phone` | string | | |
| `customer_email` | string | | |
| `delivery_type` | enum `["pickup","delivery"]` | ✅ | |
| `status` | enum (8 values) | ✅ | |
| `subtotal` | number | | |
| `delivery_fee` | number | | |
| `service_fee` | number | | |
| `total` | number | ✅ | |
| `scheduled_date` | string | | |
| `scheduled_time` | string | | |
| `delivery_address` | string | | |
| `instructions` | string | | |
| `payment_method` | enum `["card","mobile","pickup"]` | | Informational only |
| `payment_status` | enum `["pending","paid","refunded","failed"]` | | Stays `pending` — no payment processing |
| `placed_at` | string (date-time) | | |

### OrderItem
| Field | Type | Required | RLS |
|---|---|---|---|
| `order_id` | string | ✅ | read: customer_id=own OR restaurant_id=own OR admin; create: customer_id=own OR admin; update: restaurant_id=own OR admin; delete: admin |
| `menu_item_id` | string | | |
| `name` | string | ✅ | Snapshot |
| `price` | number | ✅ | Snapshot (server-verified from MenuItem) |
| `quantity` | number | ✅ | |
| `instructions` | string | | |
| `customer_id` | string | | Denormalized for RLS |
| `restaurant_id` | string | | Denormalized for RLS |

**Design note:** `customer_id` and `restaurant_id` were added beyond the task's field list to enable RLS ownership checks (Base44 RLS cannot join to the parent Order).

### Review
| Field | Type | Required | RLS |
|---|---|---|---|
| `restaurant_id` | string | ✅ | read: public; create: author_id=own OR admin; update: admin; delete: admin |
| `order_id` | string | ✅ | |
| `author_id` | string | ✅ | |
| `author_name` | string | | |
| `rating` | number | ✅ | 1–5 |
| `food_rating` | number | | 1–5 |
| `text` | string | | |
| `is_verified` | boolean | | |

### RestaurantApplication
| Field | Type | Required | RLS |
|---|---|---|---|
| `business_name` | string | ✅ | read: applicant=own OR admin; create: applicant=own OR admin; update: admin; delete: admin |
| `owner_name` | string | ✅ | |
| `email` | string | ✅ | |
| `phone` | string | | |
| `city` | string | | |
| `address` | string | | |
| `business_type` | string | | |
| `cuisine` | string | | |
| `description` | string | | |
| `pickup` | boolean | | |
| `delivery` | boolean | | |
| `logo_url` | string | | |
| `cover_url` | string | | |
| `status` | enum `["pending","changes_requested","approved","rejected"]` | ✅ | |
| `submitted_date` | string (date) | | |
| `applicant_user_id` | string | ✅ | |

### CommissionConfig
| Field | Type | Required | RLS |
|---|---|---|---|
| `default_rate` | number | ✅ | read: public; create/update/delete: admin |
| `updated_by` | string | | |
| `updated_date` | string (date-time) | | |

### Favorite
| Field | Type | Required | RLS |
|---|---|---|---|
| `user_id` | string | ✅ | read: own OR admin; create: own; update: own; delete: own OR admin |
| `restaurant_id` | string | | |
| `menu_item_id` | string | | |

---

## 3. Role Architecture Decision

### Decision: Use built-in `role` + restaurant ownership, NOT a separate `marketplace_role` field.

**Rationale:**
- Base44's built-in `User.role` is platform-controlled — only admins can change it. A normal user cannot self-assign `admin`.
- Base44 RLS is not applied to the `User` entity, so a custom `marketplace_role` field could be tampered via `base44.auth.updateMe()`.
- The built-in `role` (`admin`/`user`) is the only secure role field.

**Mapping:**
| Built-in `role` | Restaurant ownership | Marketplace role |
|---|---|---|
| `admin` | — | `SUPER_ADMIN` |
| `user` | owns a Restaurant (`Restaurant.owner_id == user.id`) | `RESTAURANT_ADMIN` |
| `user` | no restaurant | `CUSTOMER` |

**How `RESTAURANT_ADMIN` is determined:**
- The user's `restaurant_id` custom field is set by the (future) application-approval backend function.
- RLS on Restaurant/MenuItem/Order checks `data.owner_id == {{user.id}}` or `data.restaurant_id == {{user.data.restaurant_id}}` — actual record ownership, not a self-declared profile field.
- Even if a user tampers with their `restaurant_id` via `updateMe`, they cannot:
  - Modify a Restaurant they don't own (RLS checks `owner_id == user.id`).
  - Access another customer's orders (RLS checks `customer_id == user.id`).
  - Change their built-in `role` to `admin` (platform-controlled).

**Implementation:** `src/lib/marketplaceAuth.js` — `getMarketplaceRole(user)` derives the role; `useMarketplaceUser()` hook provides it to components.

---

## 4. RLS / Permission Rules

### Summary by entity

| Entity | Read | Create | Update | Delete |
|---|---|---|---|---|
| Restaurant | active OR owner OR admin | admin | owner OR admin | admin |
| GlobalCategory | active OR admin | admin | admin | admin |
| MenuCategory | public | restaurant match OR admin | restaurant match OR admin | restaurant match OR admin |
| MenuItem | public | restaurant match OR admin | restaurant match OR admin | restaurant match OR admin |
| Order | customer OR restaurant OR admin | customer=own OR admin | restaurant OR admin | admin |
| OrderItem | customer OR restaurant OR admin | customer=own OR admin | restaurant OR admin | admin |
| Review | public | author=own OR admin | admin | admin |
| RestaurantApplication | applicant OR admin | applicant=own OR admin | admin | admin |
| CommissionConfig | public | admin | admin | admin |
| Favorite | own OR admin | own | own | own OR admin |

**"Restaurant match"** means `data.restaurant_id == {{user.data.restaurant_id}}` — the user's profile `restaurant_id` must match the record's `restaurant_id`. When a user has no `restaurant_id` (most users), this matches nothing, blocking the operation.

### Verified RLS enforcement

| Test | Result |
|---|---|
| Favorite create with `user_id` != current user | **BLOCKED** — "Permission denied for create operation on Favorite entity" |
| Favorite create with `user_id` == current user | ✅ Created |
| Restaurant create as admin | ✅ Created |
| Restaurant read as admin (sees pending) | ✅ Count=1, status=pending |
| Order create with `customer_id` = own | ✅ Created |
| OrderItem create with denormalized fields | ✅ Created |
| RestaurantApplication create with `applicant_user_id` = own | ✅ Created |
| CommissionConfig update as admin | ✅ Updated (rate 10→12→10) |

**Note:** The current builder user is `admin`, so admin-override branches were exercised. Customer-side and restaurant-owner-side blocking could not be tested without separate accounts (see Known Limitations).

---

## 5. Authentication Implementation

### What was removed
- `MockAuthContext` removed from the app's provider tree (`App.jsx`).
- All `useMockAuth()` calls replaced with `useMarketplaceUser()` (which wraps real `useAuth()`).
- Demo accounts and "any password works" behavior eliminated.

### What was implemented

| Page | File | Auth method | Flow |
|---|---|---|---|
| Sign In | `src/pages/SignIn.jsx` | `base44.auth.loginViaEmailPassword(email, password)` | Form → SDK call → hard redirect to `safeReturnTo()` |
| Register (Customer) | `src/pages/Register.jsx` | `base44.auth.register({email, password})` → `verifyOtp({email, otpCode})` → `setToken(accessToken)` → `updateMe({full_name, phone})` | Form → OTP step → verify → set token → update profile → redirect |
| Register (Restaurant) | `src/pages/Register.jsx` | Same auth flow + `RestaurantApplication.create()` | Form → OTP → verify → set token → create application (status=pending) → success screen. **Does NOT assign RESTAURANT_ADMIN.** |
| Forgot Password | `src/pages/ForgotPassword.jsx` | `base44.auth.resetPasswordRequest(email)` | Form → SDK call → generic success (always shown) |
| Reset Password | `src/pages/ResetPassword.jsx` (boilerplate, already existed) | `base44.auth.resetPassword({resetToken, newPassword})` | Reads `?token=` → form → SDK call → redirect to `/login` |

### Security properties
- A customer **cannot** self-assign `SUPER_ADMIN` — the built-in `role` is platform-controlled.
- A customer **cannot** self-assign `RESTAURANT_ADMIN` — restaurant registration creates a `RestaurantApplication` (status=pending); the user remains `CUSTOMER` until admin approval (future backend function).
- The browser **cannot** choose `restaurant_id` — it is set by the approval backend function, not accepted from the client.
- Incorrect password is rejected by `loginViaEmailPassword` (SDK throws, error shown inline).
- Logout uses `base44.auth.logout("/")` (hard redirect, clears token).

### SDK auth methods verified to exist
`loginViaEmailPassword`, `register`, `verifyOtp`, `setToken`, `resendOtp`, `resetPasswordRequest`, `resetPassword`, `logout`, `me`, `updateMe` — all confirmed present on `base44.auth`.

---

## 6. Files Changed

### Entity schemas (created/modified)
| File | Action |
|---|---|
| `base44/entities/User.jsonc` | Modified — added `phone`, `restaurant_id` |
| `base44/entities/Restaurant.jsonc` | Created |
| `base44/entities/GlobalCategory.jsonc` | Created |
| `base44/entities/MenuCategory.jsonc` | Created |
| `base44/entities/MenuItem.jsonc` | Created |
| `base44/entities/Order.jsonc` | Created |
| `base44/entities/OrderItem.jsonc` | Created |
| `base44/entities/Review.jsonc` | Created |
| `base44/entities/RestaurantApplication.jsonc` | Created |
| `base44/entities/CommissionConfig.jsonc` | Created |
| `base44/entities/Favorite.jsonc` | Created |

### Auth utility (created)
| File | Action |
|---|---|
| `src/lib/marketplaceAuth.js` | Created — `getMarketplaceRole()`, `roleHome()`, `useMarketplaceUser()` |

### Auth pages (rewritten)
| File | Action |
|---|---|
| `src/pages/SignIn.jsx` | Rewritten — real `loginViaEmailPassword`, removed demo accounts |
| `src/pages/Register.jsx` | Rewritten — real `register` → OTP → `verifyOtp` → `setToken`; restaurant tab creates `RestaurantApplication` |
| `src/pages/ForgotPassword.jsx` | Rewritten — real `resetPasswordRequest` |
| `src/pages/ResetPassword.jsx` | Unchanged (boilerplate already correct) |

### Components (updated to remove MockAuth)
| File | Action |
|---|---|
| `src/components/RoleGuard.jsx` | Rewritten — uses `useAuth()` + `getMarketplaceRole()` |
| `src/components/Navbar.jsx` | Rewritten — uses `useMarketplaceUser()`, `base44.auth.logout("/")` |
| `src/components/DashboardLayout.jsx` | Rewritten — uses `useMarketplaceUser()`, `base44.auth.logout("/")` |
| `src/pages/CustomerAccount.jsx` | Rewritten — uses `useMarketplaceUser()`, `user.full_name` |
| `src/pages/RestaurantAdminDashboard.jsx` | Updated — `useMarketplaceUser()`, `user.restaurant_id` |
| `src/pages/RestaurantStorefront.jsx` | Updated — `useMarketplaceUser()`, `marketplaceRole` |
| `src/pages/Checkout.jsx` | Updated — `useMarketplaceUser()`, `user.full_name` |
| `src/App.jsx` | Updated — removed `MockAuthProvider`, added `ResetPassword` route |

### Documentation
| File | Action |
|---|---|
| `BACKEND-MIGRATION-DISCOVERY.md` | Previously created (Phase 0) |
| `PHASE-1-BACKEND-IMPLEMENTATION.md` | This file |

---

## 7. Files Intentionally Left Unchanged

| File | Reason |
|---|---|
| `src/data/restaurants.js` | Mock data preserved per Phase 1E — migration is Phase 2 |
| `src/data/categories.js` | Mock data preserved per Phase 1E |
| `src/context/MarketplaceContext.jsx` | Still provides in-memory mock data for UI; will be refactored in Phase 2 |
| `src/context/MockAuthContext.jsx` | **Not imported anywhere now**, but file left on disk to avoid breaking any lingering references. Can be deleted in Phase 2. |
| `src/pages/Home.jsx` | Uses MarketplaceContext (mock data) — no auth dependency |
| `src/pages/Restaurants.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/pages/Cart.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/pages/OrderConfirmation.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/pages/OrderTracking.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/pages/BecomePartner.jsx` | Static form (no-op submit) — no auth dependency |
| `src/pages/SuperAdminDashboard.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/components/RestaurantCard.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/components/FoodItemModal.jsx` | Uses MarketplaceContext — no auth dependency |
| `src/components/StarRating.jsx` | Pure UI — no auth dependency |
| `src/components/StatusBadge.jsx` | Pure UI — no auth dependency |
| `src/components/Footer.jsx` | Static — no auth dependency |
| `src/components/ProtectedRoute.jsx` | Already uses real `useAuth()` — unchanged |
| `src/lib/AuthContext.jsx` | Real Base44 auth — unchanged |
| `src/components/ScrollToTop.jsx` | Utility — unchanged |

---

## 8. Tests Executed

### Database tests (via `exec_tool`)
| # | Test | Method | Result |
|---|---|---|---|
| 1 | All 11 entities exist and are queryable | `base44.entities.<Name>.list()` for each | ✅ All returned successfully |
| 2 | Default CommissionConfig seeded | `CommissionConfig.create({default_rate:10})` | ✅ Created |
| 3 | Current user role check | `base44.auth.me()` | ✅ `role: "admin"`, `full_name: "kavi castelo"` |
| 4 | SDK auth methods exist | `typeof base44.auth.<method>` | ✅ All 10 methods present |

### RLS tests (via `preview_execute_code` with `window.base44_sdk`)
| # | Test | Expected | Actual |
|---|---|---|---|
| 5 | Favorite create with `user_id` != current user | Blocked | ✅ **"Permission denied for create operation on Favorite entity"** |
| 6 | Favorite create with `user_id` == current user | Created | ✅ Created, then cleaned up |
| 7 | Restaurant create as admin | Created | ✅ Created with status=pending |
| 8 | Restaurant read as admin (sees pending) | Visible | ✅ Count=1, status=pending |
| 9 | Order create with `customer_id` = own | Created | ✅ Created |
| 10 | OrderItem create with denormalized fields | Created | ✅ Created |
| 11 | RestaurantApplication create with `applicant_user_id` = own | Created | ✅ Created |
| 12 | CommissionConfig update as admin | Updated | ✅ Rate 10→12→10 |
| 13 | All test records cleaned up | Deleted | ✅ favorite, order, restaurant, application deleted |

### Frontend tests (via `preview_execute_code`)
| # | Test | Expected | Actual |
|---|---|---|---|
| 14 | App builds with no errors | 0 build errors | ✅ 0 errors |
| 15 | Login page renders | Form with email/password, no demo accounts | ✅ Form present, no "Demo accounts" text |
| 16 | Register page renders | Customer/Restaurant tabs | ✅ Both tabs present |
| 17 | Forgot password renders | Email field + reset button | ✅ Both present |
| 18 | Reset password (no token) renders | "Invalid reset link" | ✅ Shows invalid link message |
| 19 | Admin dashboard renders | Stats, charts, user profile | ✅ Full dashboard with "kavi castelo" profile |
| 20 | Home page renders | Hero, categories, featured | ✅ All sections present |
| 21 | RoleGuard: admin on /restaurant/dashboard | Redirect to /admin/dashboard | ✅ Redirected (RoleGuard enforced) |
| 22 | RoleGuard: admin on /account | Redirect to /admin/dashboard | ✅ Redirected |
| 23 | No runtime console errors | 0 real errors | ✅ Only expected RLS denial from test |

---

## 9. Test Results

**All 23 tests passed.** Key security verification:

- **RLS is enforced server-side**: A Favorite record with `user_id` set to a different user was rejected with "Permission denied" — this proves RLS rules are active and blocking unauthorized writes, not just hiding UI.
- **RoleGuard works**: The admin user attempting to access `/restaurant/dashboard` (RESTAURANT_ADMIN only) was redirected to `/admin/dashboard` — role-based routing is enforced.
- **Auth pages use real SDK**: Login, Register (with OTP), ForgotPassword, and ResetPassword all call the real Base44 auth API. No mock auth remains in the security path.
- **No build errors**: The app compiles and renders all pages without errors.

---

## 10. Known Limitations

1. **Customer-side RLS not tested with a real customer account.** The current builder user is `admin` (SUPER_ADMIN), so admin-override branches were exercised. Testing "customer cannot read other customers' orders" requires a separate customer account. The Favorite test (no admin override on create) confirms RLS enforcement is active.

2. **Full register → OTP → login flow not end-to-end tested.** The OTP flow requires email delivery, which cannot be completed in the preview environment. The SDK methods (`register`, `verifyOtp`, `setToken`, `resendOtp`) were verified to exist, and the UI renders the OTP step, but the actual email→code→login cycle was not executed.

3. **MenuCategory/MenuItem RLS uses `user.data.restaurant_id`.** A user could theoretically tamper with their `restaurant_id` via `updateMe()` and create menu items on a restaurant they don't own (vandalism risk). This does NOT grant access to the Restaurant record itself (protected by `owner_id == user.id`) or orders (protected by `customer_id == user.id`). The robust fix is a backend function for menu CRUD that verifies `Restaurant.owner_id == user.id` — deferred to Phase 2.

4. **Mock data still drives the UI.** `MarketplaceContext` and `src/data/` files are preserved. The frontend still displays hardcoded restaurants/menus/orders. Real entity queries are not yet wired into pages. This is intentional per Phase 1E.

5. **No backend functions created.** `placeOrder`, `updateOrderStatus`, `approveRestaurantApplication`, `createReview`, etc. are Phase 2. Order creation currently goes through `MarketplaceContext.placeOrder` (in-memory mock). The Order entity exists and accepts records, but the server-side price verification and ownership enforcement are not yet implemented.

6. **No payment processing.** `payment_status` stays `pending`. The `payment_method` field is informational only. Stripe is not integrated (per business decision).

7. **`MockAuthContext.jsx` file remains on disk.** It is no longer imported anywhere. It can be deleted in Phase 2.

8. **Restaurant approval flow not yet implemented.** Submitting a restaurant application creates a `RestaurantApplication` record (status=pending), but there is no backend function to approve it (create Restaurant + set owner_id + upgrade user). The admin dashboard's approve/reject buttons still call `MarketplaceContext` mock functions.

9. **`User.data` is empty for the current user.** The `me()` response has no `data` field — custom fields (`phone`, `restaurant_id`) are top-level on the user object. The `getMarketplaceRole()` helper handles both `user.data?.restaurant_id` and `user.restaurant_id`.

---

## 11. Issues Requiring Phase 2

1. **Backend functions:**
   - `placeOrder` — server-side price verification, total calculation, customer_id from session
   - `updateOrderStatus` — ownership + state-machine enforcement
   - `approveRestaurantApplication` — atomic Restaurant creation + owner_id + user role/restaurant_id update
   - `rejectRestaurantApplication` / `requestChanges`
   - `setRestaurantStatus` (suspend/reactivate)
   - `setCommissionRate` / `setRestaurantCommission`
   - `createReview` — one per completed order, author = order customer
   - `getDashboardMetrics` — aggregate from Order records

2. **Data migration:**
   - Import hardcoded restaurants from `src/data/restaurants.js` into `Restaurant` entity
   - Import nested categories into `MenuCategory`
   - Import nested items into `MenuItem`
   - Import `seedReviews` into `Review`
   - Import `seedOrders` into `Order` + `OrderItem`
   - Import `categories` from `src/data/categories.js` into `GlobalCategory`
   - Invite demo users via `base44.users.inviteUser`
   - Link restaurant owners to their restaurants

3. **Frontend rewiring:**
   - Replace `MarketplaceContext` data sources with entity queries
   - Wire `Checkout` to `placeOrder` backend function
   - Wire `RestaurantAdminDashboard` to entity queries + `updateOrderStatus`
   - Wire `SuperAdminDashboard` to entity queries + admin functions
   - Wire `OrderTracking` review form to `createReview`
   - Wire `BecomePartner` to `submitRestaurantApplication` + file upload
   - Replace hardcoded `MONTHLY` revenue arrays with `getDashboardMetrics`
   - Wire favorites to `Favorite` entity

4. **Security hardening:**
   - Backend functions for menu CRUD (verify `Restaurant.owner_id == user.id`)
   - Backend function for restaurant approval (upgrade user role/restaurant_id server-side)
   - `slug` uniqueness enforcement
   - `order_number` server-side generation

5. **Cleanup:**
   - Delete `MockAuthContext.jsx`
   - Delete `src/data/restaurants.js` and `src/data/categories.js` (after migration)
   - Refactor `MarketplaceContext` to cart-only (remove data responsibilities)

---

*End of Phase 1 report. The backend foundation (entities, authentication, RLS) is functional. Business data migration and backend functions are Phase 2.*