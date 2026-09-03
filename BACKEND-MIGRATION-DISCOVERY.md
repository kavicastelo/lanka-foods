# BACKEND MIGRATION DISCOVERY — LankaEats Finland

> **Status: DISCOVERY ONLY.** No code was modified, no entities created, no data migrated. Every conclusion below references the actual source file and line range that supports it.

---

## 1. Executive Summary

LankaEats Finland is a **frontend-only prototype** of a multi-restaurant Sri Lankan food marketplace for the Sri Lankan diaspora in Finland. The application is visually complete and functionally interactive, but **no business data is persisted anywhere** — every restaurant, menu item, order, review, commission rate, and dashboard metric lives in React component state or hardcoded JavaScript modules that reset on every page reload.

The app ships with **two parallel authentication systems that do not talk to each other**:

1. A real Base44 `AuthContext` (`src/lib/AuthContext.jsx`) that calls `base44.auth.me()` and `base44.auth.logout()` — but it is used only for app-state scaffolding (loading/error gates) and never performs a real login.
2. A fake `MockAuthContext` (`src/context/MockAuthContext.jsx`) that stores a user object in `localStorage`, accepts **any password**, lets the **client choose its own role** (`SUPER_ADMIN`, `RESTAURANT_ADMIN`, `CUSTOMER`), and is the system every page actually reads from.

Because all authorization decisions (`RoleGuard`, dashboard access, order ownership, restaurant ownership) are derived from this client-controlled mock user, **the application has zero server-side security**. A user can become a super admin, change any order status, edit any restaurant's menu, set commission rates, and approve/reject restaurants by editing a single `localStorage` key.

To reach production the following must be built on the Base44 backend: persistent entities for restaurants, menu items, categories, orders, order items, reviews, restaurant applications, and commission configuration; real Base44 authentication with role assignment enforced server-side; row-level security so restaurant owners can only touch their own data; backend functions for order placement, order-status transitions, restaurant approval, and commission calculation; and a migration of the hardcoded seed data into the database.

---

## 2. Current Architecture

### 2.1 Stack

- **Framework:** React + Vite (ESM) — `src/App.jsx`
- **Styling:** Tailwind CSS with custom design tokens — `src/index.css`, `tailwind.config.js`
- **UI kit:** shadcn/ui (`@/components/ui/*`), lucide-react icons, recharts for dashboards
- **State:** React Context (`MarketplaceContext`, `MockAuthContext`) + `useState`/`useMemo` — no global store, no persistence
- **Routing:** react-router-dom — `src/App.jsx` lines 49–70
- **Data layer:** Hardcoded JS modules under `src/data/` consumed through `MarketplaceContext`
- **Backend:** Base44 SDK is imported (`@/api/base44Client`) and `AuthContext` calls `base44.auth.me()`, but **no Base44 entities are defined** beyond the built-in `User` (`base44/entities/User.jsonc`), and **no backend functions exist**.

### 2.2 Route map (from `src/App.jsx`)

| Route | Component | Guard | Purpose |
|---|---|---|---|
| `/` | `Home` | none | Landing, featured restaurants, categories |
| `/restaurants` | `Restaurants` | none | Browse/filter restaurants |
| `/restaurant/:slug` | `RestaurantStorefront` | none | Restaurant menu + reviews |
| `/cart` | `Cart` | none | Cart review |
| `/checkout` | `Checkout` | none | 4-step checkout (simulated payment) |
| `/order/:id/confirmation` | `OrderConfirmation` | none | Order placed confirmation |
| `/order/:id` | `OrderTracking` | none | Track status + leave review |
| `/partner` | `BecomePartner` | none | Partner application form (no-op) |
| `/account` | `CustomerAccount` | `RoleGuard(["CUSTOMER"])` | Customer orders/favorites/reviews/profile |
| `/login` | `SignIn` | none | Mock sign-in |
| `/register` | `Register` | none | Mock register (customer or restaurant) |
| `/forgot-password` | `ForgotPassword` | none | Fake reset (always "sent") |
| `/admin/dashboard` | `SuperAdminDashboard` | `RoleGuard(["SUPER_ADMIN"])` | Platform admin |
| `/restaurant/dashboard` | `RestaurantAdminDashboard` | `RoleGuard(["RESTAURANT_ADMIN"])` | Restaurant owner |

### 2.3 Data flow

```
src/data/restaurants.js  ─┐
src/data/categories.js   ─┼──> MarketplaceContext (in-memory state) ──> every page
MockAuthContext (localStorage) ─────────────────────────────────────────> every page
```

`MarketplaceContext` (`src/context/MarketplaceContext.jsx`) is the single source of truth for all marketplace data. It seeds itself from the hardcoded modules on mount (line 8: `useState(() => RESTAURANTS.map(r => ({...r})))`), then every mutation (add to cart, place order, update order status, add menu item, approve restaurant, set commission) is a `setRestaurants`/`setOrders`/`setReviews` call against local React state. **Nothing is written to any database.**

---

## 3. Hardcoded Data Inventory

| # | File | Data | Records | Purpose | Currently used by |
|---|---|---|---|---|---|
| 1 | `src/data/restaurants.js` lines 15–316 | `restaurants` array | 6 restaurants, each with 4–5 categories × 2–4 items | Full marketplace catalog | `MarketplaceContext`, `Home`, `Restaurants`, `RestaurantStorefront`, `Cart`, `Checkout`, dashboards |
| 2 | `src/data/restaurants.js` lines 3–11 | `IMG` object | 7 image URLs | Shared food imagery | All restaurant/menu rendering |
| 3 | `src/data/restaurants.js` lines 326–333 | `seedReviews` | 6 reviews | Restaurant review display | `MarketplaceContext`, storefront, dashboards |
| 4 | `src/data/restaurants.js` lines 336–342 | `seedOrders` | 5 orders | Dashboard order tables | `MarketplaceContext`, both dashboards, `OrderTracking`, `CustomerAccount` |
| 5 | `src/data/restaurants.js` lines 320–324 | `allMenuItems` (derived) | ~60 items | Favorites lookup | `CustomerAccount` favorites tab |
| 6 | `src/data/categories.js` lines 1–14 | `categories` | 12 categories | Home category grid, filters | `Home`, `Restaurants` |
| 7 | `src/data/categories.js` line 16 | `cities` | 6 cities | City filter/select | `Home`, `Restaurants`, `BecomePartner`, `Register` |
| 8 | `src/context/MarketplaceContext.jsx` lines 14–31 | `pendingRestaurants` seed | 1 pending application | Admin approval queue | `SuperAdminDashboard`, `RestaurantAdminDashboard` |
| 9 | `src/context/MarketplaceContext.jsx` line 32 | `commissionRate` | 1 value (10%) | Platform commission | `SuperAdminDashboard` revenue/settings |
| 10 | `src/context/MarketplaceContext.jsx` line 33 | `restaurantCommissions` | empty `{}` | Per-restaurant overrides | `SuperAdminDashboard` settings |
| 11 | `src/context/MockAuthContext.jsx` lines 11–15 | `DEMO_USERS` | 3 users (admin, restaurant, customer) | Mock auth | `SignIn`, `Register`, `RoleGuard`, all dashboards |
| 12 | `src/pages/SuperAdminDashboard.jsx` lines 21–28 | `MONTHLY` revenue | 6 months | Admin revenue charts | `SuperAdminDashboard` overview/revenue |
| 13 | `src/pages/RestaurantAdminDashboard.jsx` lines 30–37 | `MONTHLY` revenue | 6 months | Restaurant revenue charts | `RestaurantAdminDashboard` revenue |
| 14 | `src/pages/RestaurantStorefront.jsx` lines 168–178 | Review rating distribution | 5 hardcoded percentages | Rating breakdown bars | `RestaurantStorefront` |
| 15 | `src/pages/CustomerAccount.jsx` lines 154–156 | Saved addresses | 2 addresses | Profile tab | `CustomerAccount` |
| 16 | `src/pages/Home.jsx` lines 73–78 | Stats strip | 4 values | Marketing stats | `Home` |
| 17 | `src/components/Navbar.jsx` lines 8–12 | `guestLinks` | 3 links | Nav config | `Navbar` |
| 18 | `src/components/Footer.jsx` | Footer link list | ~10 links | Nav config | `Footer` |

**No `localStorage`/`sessionStorage` usage beyond auth:** only `MockAuthContext` (line 6 `STORAGE_KEY = "lankaeats_mock_user"`) persists anything. Cart, orders, favorites, and all mutations are pure in-memory state.

---

## 4. Data Classification

| Current Location | Data | Classification | Should Move to Backend? | Reason |
|---|---|---|---|---|
| `src/data/restaurants.js` | Restaurant records | **B. Database entity** | Yes | Core marketplace data; must be editable by owners, filterable, persistent |
| `src/data/restaurants.js` | `IMG` food image URLs | **A. Static configuration** | No (keep as defaults) | Shared stock imagery; can be default fallbacks, but real restaurants upload their own |
| `src/data/restaurants.js` | `seedReviews` | **B. Database entity** | Yes | User-generated content tied to orders |
| `src/data/restaurants.js` | `seedOrders` | **B. Database entity** | Yes | Transactional records, must persist and be queryable |
| `src/data/restaurants.js` | `allMenuItems` | **C. Derived** | No (compute from entities) | Flattened view of restaurant→category→item |
| `src/data/categories.js` | `categories` | **B. Database entity** (or A) | Yes (seeded) | Used for filtering and browse; should be admin-managed |
| `src/data/categories.js` | `cities` | **A. Static configuration** | No | Fixed municipality list for Finland |
| `MarketplaceContext` | `pendingRestaurants` | **B. Database entity** | Yes | Restaurant applications needing admin review |
| `MarketplaceContext` | `commissionRate` | **B. Database entity** (settings) | Yes | Platform config, must persist and be auditable |
| `MarketplaceContext` | `restaurantCommissions` | **B. Database entity** | Yes | Per-restaurant overrides |
| `MarketplaceContext` | `cart` | **F. Temporary UI state** | No | Client-only; can stay in context/localStorage |
| `MarketplaceContext` | `favoriteRestaurants`/`favoriteItems` | **B. Database entity** | Yes | Per-user persistent favorites |
| `MockAuthContext` | `DEMO_USERS` | **D. User/session** | Yes (real auth) | Must be real Base44 users with enforced roles |
| `MockAuthContext` | `localStorage` user | **D. User/session** | Yes (real auth) | Replaced by Base44 session token |
| `SuperAdminDashboard` `MONTHLY` | Revenue history | **C. Derived** | No (compute from orders) | Should be aggregated from Order records, not hardcoded |
| `RestaurantAdminDashboard` `MONTHLY` | Revenue history | **C. Derived** | No (compute from orders) | Same |
| `RestaurantStorefront` rating distribution | Review breakdown | **C. Derived** | No (compute from reviews) | Aggregate of Review records |
| `CustomerAccount` saved addresses | Address list | **B. Database entity** | Yes | Per-user persistent addresses |
| `Home` stats strip | Marketplace metrics | **C. Derived** | No (compute) | Aggregate counts from entities |
| `Navbar`/`Footer` link lists | Navigation config | **A. Static configuration** | No | UI constants |
| Checkout payment method | Payment selection | **F. Temporary UI state** | Yes (payment intent) | Real payment must be server-side |
| Checkout `total` calculation | Order total | **C. Derived** | Yes (server-side) | Must be validated/calculated server-side to prevent tampering |

---

## 5. Proposed Base44 Entity Model

The existing code structures data as `Restaurant → categories[] → items[]` (nested). For a queryable, secure backend this must be flattened into separate entities linked by foreign keys. Below is the **minimum** entity set justified by actual code usage.

### 5.1 `User` (built-in — extend, do not recreate)

- **Purpose:** Authenticated app user. Already exists at `base44/entities/User.jsonc` with `role` enum `["admin","user"]`.
- **Current problem:** The app uses three roles (`SUPER_ADMIN`, `RESTAURANT_ADMIN`, `CUSTOMER`) in `MockAuthContext` line 11–15 and `RoleGuard` — but the real `User` entity only knows `admin`/`user`.
- **Required change:** Extend the `role` enum to include the marketplace roles (or add a `marketplace_role` field). Add optional `restaurant_id` link and `phone` (currently faked in `MockAuthContext`).
- **Ownership:** Platform-owned. Users join via invite (`base44.users.inviteUser`) or self-registration (real auth flow).
- **Access:** Admins can list/update/delete other users (built-in). Users read/update only themselves.

### 5.2 `Restaurant`

- **Purpose:** A food business (restaurant, home kitchen, caterer, bakery, food truck). Replaces `restaurants` array in `src/data/restaurants.js` and the `pendingRestaurants` concept in `MarketplaceContext`.
- **Fields (from `restaurants.js` lines 17–44 and `approveApplication` lines 116–148):**
  - `name` (string, required)
  - `slug` (string, required, unique — derived from name)
  - `owner_id` (string → User.id, required) — the `RESTAURANT_ADMIN` who owns it
  - `city` (string, required), `address` (string), `phone` (string), `email` (string)
  - `cover_image_url` (string), `logo_text` (string) — logo is currently a 2-letter abbreviation
  - `description` (string)
  - `cuisines` (array of strings) — e.g. `["Rice & Curry","Kottu"]`
  - `price_range` (string: `"€"`,`"€€"`,`"€€€"`)
  - `prep_time` (string), `min_order` (number), `delivery_fee` (number)
  - `pickup` (boolean), `delivery` (boolean), `halal` (boolean), `catering` (boolean)
  - `is_open` (boolean) — runtime availability toggle (`restaurant.open`)
  - `hours` (string), `time_slots` (array of strings)
  - `rating` (number, derived — see §5.6), `review_count` (number, derived)
  - `status` (enum: `pending`,`active`,`suspended`,`rejected`,`changes_requested`) — replaces `pendingRestaurants` + `restaurant.status`
  - `featured` (boolean)
  - `joined` (date — maps to `created_date`)
- **Relationships:** 1 owner (User), many Categories, many MenuItems, many Orders, many Reviews, 1 CommissionConfig.
- **Ownership:** `owner_id` = the restaurant admin.
- **Access:**
  - **Read:** Anyone (public marketplace). `pending`/`suspended`/`rejected` restaurants hidden from public list (`Restaurants.jsx` line 49 filters `status === "active"`).
  - **Create:** Via `RestaurantApplication` approval flow only (admin approves → restaurant created).
  - **Update:** Owner (`owner_id`) can update their own profile fields; admin can update status/commission.
  - **Delete:** Admin only.

### 5.3 `Category`

- **Purpose:** A menu section within a restaurant (e.g. "Rice & Curry", "Kottu"). Currently nested as `restaurant.categories[].name` (`restaurants.js` line 13 `cat(name, items)`).
- **Fields:**
  - `restaurant_id` (string → Restaurant.id, required)
  - `name` (string, required)
  - `sort_order` (number, optional)
- **Relationships:** Belongs to Restaurant, has many MenuItems.
- **Ownership:** Restaurant owner.
- **Access:** Public read; owner create/update/delete on own restaurant; admin all.
- **Justification:** `RestaurantAdminDashboard` `Menu` component (lines 187–259) performs `addCategory`/`deleteCategory` CRUD — these must persist.

### 5.4 `MenuItem`

- **Purpose:** A dish within a category. Currently `restaurant.categories[].items[]` (`restaurants.js` lines 47–67 etc.).
- **Fields (from item objects lines 47–51):**
  - `restaurant_id` (string → Restaurant.id, required)
  - `category_id` (string → Category.id, required)
  - `name` (string, required)
  - `description` (string)
  - `price` (number, required) — **must be server-authoritative**
  - `image_url` (string)
  - `is_vegetarian` (boolean) — `item.veg`
  - `is_available` (boolean) — `item.available`; toggled by `toggleItemAvailable`
  - `is_popular` (boolean) — `item.popular`
  - `sort_order` (number, optional)
- **Relationships:** Belongs to Restaurant + Category; appears in OrderItems.
- **Ownership:** Restaurant owner.
- **Access:** Public read (only if `is_available` could be hidden, but storefront shows unavailable items greyed out — `RestaurantStorefront.jsx` line 125); owner full CRUD on own; admin all.
- **Justification:** `RestaurantAdminDashboard` `Menu` (lines 192–258) does `addMenuItem`/`updateMenuItem`/`deleteMenuItem`/`toggleItemAvailable` with inline price editing — all must persist and be owner-scoped.

### 5.5 `Order`

- **Purpose:** A customer's food order. Replaces `seedOrders` and `placeOrder` output (`MarketplaceContext.jsx` lines 69–84).
- **Fields (from `placeOrder` and `seedOrders`):**
  - `order_number` (string, required, unique — e.g. `"LE-10231"`; currently generated client-side line 70)
  - `restaurant_id` (string → Restaurant.id, required)
  - `customer_id` (string → User.id, required) — **currently only `customer` name string**; must be real user ref
  - `customer_name` (string, denormalized for display)
  - `customer_phone`, `customer_email` (string, denormalized)
  - `delivery_type` (enum: `pickup`,`delivery`) — `order.type`
  - `status` (enum: `received`,`accepted`,`preparing`,`ready`,`out_for_delivery`,`completed`,`cancelled`,`rejected`) — `StatusBadge.jsx` lines 16–25
  - `subtotal` (number), `delivery_fee` (number), `service_fee` (number), `total` (number) — **server-calculated**
  - `scheduled_date` (string/date), `scheduled_time` (string — time slot or `"ASAP"`)
  - `delivery_address` (string, nullable), `instructions` (string)
  - `payment_method` (enum: `card`,`mobile`,`pickup`) — `Checkout.jsx` lines 153–157
  - `payment_status` (enum: `pending`,`paid`,`refunded`,`failed`)
  - `placed_at` (datetime — maps to `created_date`)
- **Relationships:** Belongs to Restaurant + Customer (User); has many OrderItems.
- **Ownership:** `customer_id`.
- **Access:**
  - **Read:** Customer sees own orders (`CustomerAccount.jsx` line 34: `orders.filter(o => o.customer === user?.name)`); restaurant owner sees orders for their restaurant (`RestaurantAdminDashboard.jsx` line 60); admin sees all.
  - **Create:** Customer only, via backend function (see §8).
  - **Update status:** Restaurant owner (for their restaurant) or admin — via backend function enforcing the state machine.
  - **Delete:** Admin only (or never — soft cancel).
- **Justification:** `OrderTracking`, `CustomerAccount`, both dashboards, `OrderConfirmation` all read orders.

### 5.6 `OrderItem`

- **Purpose:** A line item in an order. Currently embedded as `order.items[]` (`MarketplaceContext.jsx` line 75, `seedOrders` line 337).
- **Fields:**
  - `order_id` (string → Order.id, required)
  - `menu_item_id` (string → MenuItem.id, nullable — allows deleted items)
  - `name` (string, denormalized snapshot)
  - `price` (number, denormalized snapshot — **server-locked at order time**)
  - `quantity` (number, required)
  - `instructions` (string, per-item)
- **Relationships:** Belongs to Order; references MenuItem.
- **Ownership:** Inherits from Order.
- **Access:** Same as parent Order.
- **Justification:** Orders contain multiple items (`seedOrders` line 337: `items: [{name, qty, price}]`); flattening enables top-items analytics (`RestaurantAdminDashboard.jsx` lines 301–305).

### 5.7 `Review`

- **Purpose:** Customer review of a restaurant after a completed order. Replaces `seedReviews` (`restaurants.js` lines 326–333) and `addReview` (`MarketplaceContext.jsx` lines 90–92).
- **Fields:**
  - `restaurant_id` (string → Restaurant.id, required)
  - `order_id` (string → Order.id, required) — ensures one review per completed order
  - `author_id` (string → User.id, required)
  - `author_name` (string, denormalized)
  - `rating` (number 1–5, required), `food_rating` (number 1–5, required)
  - `text` (string)
  - `is_verified` (boolean — derived from linked completed order; currently hardcoded `true`)
  - `created_date` (built-in)
- **Relationships:** Belongs to Restaurant + Order + User.
- **Ownership:** `author_id`.
- **Access:** Public read; author create (only if linked order is `completed`); admin delete (`SuperAdminDashboard.jsx` line 385 `removeReview`); author cannot delete own (or allow — TBD).
- **Justification:** `OrderTracking.jsx` lines 46–49 creates reviews; `RestaurantStorefront` and both dashboards display them.

### 5.8 `RestaurantApplication`

- **Purpose:** A pending partner application awaiting admin approval. Replaces `pendingRestaurants` in `MarketplaceContext` (lines 14–31) and the `BecomePartner`/`Register` restaurant flow.
- **Fields (from `addPendingApplication` line 110 and seed lines 16–30):**
  - `business_name` (string, required)
  - `owner_name` (string, required)
  - `email` (string, required)
  - `phone` (string)
  - `city` (string), `address` (string)
  - `business_type` (enum: `Restaurant`,`Home-based kitchen`,`Caterer`,`Food store`,`Bakery`,`Food truck` — `BecomePartner.jsx` line 6)
  - `cuisine` (string — comma list)
  - `description` (string)
  - `pickup` (boolean), `delivery` (boolean)
  - `logo_url`, `cover_url` (string — from upload)
  - `status` (enum: `pending`,`changes_requested`,`approved`,`rejected`)
  - `submitted_date` (date)
  - `applicant_user_id` (string → User.id) — the user who submitted
- **Relationships:** Belongs to applicant User; on approval spawns a `Restaurant`.
- **Ownership:** Applicant + admin.
- **Access:** Applicant read own; admin read/update all; public none.
- **Justification:** `SuperAdminDashboard.jsx` lines 225–233 approves/rejects/requests-changes; `Register.jsx` line 28 and `BecomePartner.jsx` create applications.

### 5.9 `CommissionConfig`

- **Purpose:** Platform default commission + per-restaurant overrides. Replaces `commissionRate` (line 32) and `restaurantCommissions` (line 33) in `MarketplaceContext`.
- **Fields:**
  - `default_rate` (number, required) — platform-wide default
  - `updated_by` (string → User.id)
  - `updated_date` (built-in)
- **Per-restaurant override** — either a field on `Restaurant` (`commission_rate` nullable, falls back to default) or a separate `RestaurantCommission` entity. Given the small scale, a nullable `commission_rate` on `Restaurant` is simpler and sufficient.
- **Ownership:** Admin only.
- **Access:** Admin read/write; restaurants read their own rate (for revenue display).
- **Justification:** `SuperAdminDashboard.jsx` `SettingsTab` (lines 473–510) sets default and per-restaurant rates.

### 5.10 `Favorite` (optional but currently in UI)

- **Purpose:** Persist user's favorited restaurants and dishes. Currently `favoriteRestaurants`/`favoriteItems` in `MarketplaceContext` (lines 12–13, 98–104) — in-memory only.
- **Fields:** `user_id`, `restaurant_id` (nullable), `menu_item_id` (nullable), `created_date`.
- **Justification:** `CustomerAccount.jsx` favorites tab (lines 93–121) and heart toggles on cards/items. Without persistence, favorites vanish on reload.
- **Decision:** Recommended; low complexity.

### Entities considered but NOT required

- **`RestaurantLocation`** — Not needed. The app is single-location per restaurant (`address` + `city` fields on Restaurant). No multi-branch logic exists in code.
- **`RestaurantAvailability`** — Not a separate entity. Availability is the `is_open` boolean on Restaurant + `is_available` on MenuItem. No weekly schedule structure exists in the prototype (`hours` is a free-text string).
- **`RestaurantSubscription`** — Not needed. The prototype has no subscription/billing model; commission is a flat percentage. No subscription fields exist anywhere in code.
- **`CommissionRecord`** (per-transaction ledger) — Not required for MVP. Commission is calculated on the fly (`SuperAdminDashboard.jsx` line 46: `gross * rate / 100`). A ledger is a future enhancement, not justified by current code.
- **`Notification`** — Not present in the prototype. No notification UI or data exists. Defer.

---

## 6. Authentication Analysis

### 6.1 What exists (real Base44 auth)

`src/lib/AuthContext.jsx`:
- Calls `base44.auth.me()` (line 96) to fetch the current user.
- Calls `base44.auth.logout()` (line 123) and `base44.auth.redirectToLogin()` (line 132).
- Reads app public settings via an axios client to determine `auth_required` / `user_not_registered` states (lines 37–80).
- Wraps the entire app in `App.jsx` line 78 (`<AuthProvider>`).

**However:** `AuthContext` is **not consumed by any page for identity or roles**. It only drives the top-level loading/error gate (`AuthenticatedApp`, `App.jsx` lines 28–46). No page calls `useAuth()` to get the current user — they all call `useMockAuth()` instead.

### 6.2 What is fake (MockAuthContext)

`src/context/MockAuthContext.jsx`:
- **Storage:** `localStorage` key `"lankaeats_mock_user"` (line 6).
- **Users:** 3 hardcoded `DEMO_USERS` (lines 11–15): admin, restaurant owner, customer.
- **Login** (lines 35–41): Finds a user by email match; **any non-empty password accepted** (line 36: `if (!password) return null` — only checks password is non-empty, never checks its value).
- **Register** (lines 43–55): Creates a user object with **client-chosen role** (`data.role || "CUSTOMER"`, line 48) and **client-chosen `restaurantId`** (line 49). No verification, no OTP, no email.
- **Logout** (line 57): Clears state.
- **Session:** Persists the fake user JSON in localStorage (lines 30–33).

### 6.3 Auth-consuming components

| Component | What it does | Real or fake? |
|---|---|---|
| `SignIn.jsx` | Calls `mockAuth.login(email, password)` (line 22); one-click demo buttons (line 30) | **Fake** |
| `Register.jsx` | Calls `mockAuth.register({role: "CUSTOMER"|"RESTAURANT_ADMIN"})` (lines 21, 32) | **Fake** — client picks role |
| `ForgotPassword.jsx` | Sets `sent = true` on submit (line 29) — always shows "check your email" | **Fake** — no email sent |
| `RoleGuard.jsx` | Reads `useMockAuth().user`, checks `roles.includes(user.role)` (line 12) | **Fake** — client-side only |
| `Navbar.jsx` | Reads `useMockAuth().user` for nav links/logout (line 16) | **Fake** |
| `DashboardLayout.jsx` | Reads `useMockAuth().user` for sidebar profile (line 8) | **Fake** |
| `RestaurantAdminDashboard.jsx` | Reads `user.restaurantId` to find its restaurant (line 44) | **Fake** — trusts client-supplied id |
| `RestaurantStorefront.jsx` | Checks `user?.role === "RESTAURANT_ADMIN" && user?.restaurantId === restaurant.id` (line 67) | **Fake** |
| `Checkout.jsx` | Reads `user?.name`, `user?.phone`, `user?.email` for prefill (line 21) | **Fake** |
| `CustomerAccount.jsx` | Filters orders by `o.customer === user?.name` (line 34) | **Fake** — name string match |

### 6.4 What must change

- **Delete `MockAuthContext`** entirely; replace all `useMockAuth()` calls with `useAuth()` (real Base44).
- **Implement real login/register** using Base44 SDK (`loginViaEmailPassword`, `register` → OTP → `verifyOtp`, `resetPasswordRequest`, `resetPassword`) per the platform auth contract. The existing `SignIn`/`Register`/`ForgotPassword` pages must be rewritten to call these.
- **Role assignment must be server-side.** A user cannot self-assign `SUPER_ADMIN` or `RESTAURANT_ADMIN`. Role is assigned by admin invite or by the restaurant-application approval flow.
- **`RoleGuard` must read from real `useAuth().user`** and the role must come from the server-validated User entity, not localStorage.
- **`restaurantId` ownership** must be a server-enforced relationship (the Restaurant's `owner_id`), not a client-supplied field.

---

## 7. Authorization / Security Analysis

Every authorization decision in the app is made client-side from the mock user object. Below are the concrete trust violations.

### 7.1 Client chooses user role

- **Where:** `Register.jsx` line 21 (`role: "CUSTOMER"`) and line 32 (`role: "RESTAURANT_ADMIN"`); `MockAuthContext.register` line 48 (`role: data.role || "CUSTOMER"`).
- **Why unsafe:** Anyone can register as `SUPER_ADMIN` by passing `role: "SUPER_ADMIN"`. `RoleGuard` (line 12) trusts this value, granting `/admin/dashboard` access.
- **Server enforcement:** Role must be assigned by an admin invite or approval workflow, never accepted from the client. The `register` endpoint must only create `CUSTOMER` users; `RESTAURANT_ADMIN` is granted when a `RestaurantApplication` is approved.

### 7.2 Client chooses restaurantId

- **Where:** `Register.jsx` line 32 (`restaurantId: app.id`); `MockAuthContext.register` line 49.
- **Why unsafe:** A user can claim ownership of any restaurant by setting `restaurantId` to an existing restaurant's id. `RestaurantAdminDashboard.jsx` line 44 (`mp.getRestaurant(user?.restaurantId)`) trusts this to scope all menu/order management.
- **Server enforcement:** Restaurant ownership is the `owner_id` field on the Restaurant record, set by the admin approval flow. The dashboard must query `Restaurant.where(owner_id == current_user.id)` — never trust a client-supplied id.

### 7.3 Client changes order status

- **Where:** `RestaurantAdminDashboard.jsx` lines 135–143 call `mp.updateOrderStatus(o.id, "accepted"|"rejected"|"preparing"|"ready"|"completed")`; `MarketplaceContext.updateOrderStatus` (line 86) just `setOrders` — no ownership check, no state-machine validation.
- **Why unsafe:** Any client can change any order's status (the function takes only an order id). There is no check that the caller owns the order's restaurant, and no validation that the transition is legal (e.g. `completed` → `received`).
- **Server enforcement:** A backend function `updateOrderStatus(orderId, newStatus)` must: (1) verify caller is the `owner_id` of the order's restaurant or an admin; (2) enforce the state machine (`NEXT` map in `RestaurantAdminDashboard.jsx` lines 22–28); (3) reject illegal transitions.

### 7.4 Client sets order ownership by name

- **Where:** `Checkout.jsx` line 62 (`customer: user?.name || details.name`); `CustomerAccount.jsx` line 34 (`orders.filter(o => o.customer === user?.name)`).
- **Why unsafe:** Orders are "owned" by a display-name string. Two users with the same name see each other's orders; a user can change their name to see others' orders.
- **Server enforcement:** Order `customer_id` must be the authenticated user's id, set server-side from the session token, never accepted from the client.

### 7.5 Client controls prices and totals

- **Where:** `Cart.jsx` line 66 (`cartSubtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0)`); `Checkout.jsx` line 36 (`total = cartSubtotal + deliveryFee + serviceFee`); `MarketplaceContext.placeOrder` line 75 copies `i.price` from the cart (which came from the client-side menu data).
- **Why unsafe:** Item prices travel through client state from the hardcoded data file. In production, a user could modify the cart item price in memory/devtools before placing an order. The `total` sent to `placeOrder` is client-calculated.
- **Server enforcement:** Order creation must re-fetch menu item prices from the database by `menu_item_id`, recompute subtotal/fees/total server-side, and ignore any client-supplied price. The stored `OrderItem.price` is a snapshot of the server-verified price.

### 7.6 Client mutates any restaurant's menu

- **Where:** `MarketplaceContext` `addMenuItem`/`updateMenuItem`/`deleteMenuItem`/`toggleItemAvailable` (lines 167–170) take a `rid` (restaurant id) with no ownership check. `RestaurantAdminDashboard.jsx` passes `restaurant.id` from `user.restaurantId` (line 44) — but that id is client-controlled (see 7.2).
- **Why unsafe:** A restaurant admin can pass any restaurant id and edit its menu.
- **Server enforcement:** Menu CRUD must verify `Restaurant.owner_id == current_user.id` for the targeted restaurant. RLS on MenuItem/Category scoped through the parent restaurant's `owner_id`.

### 7.7 Client approves/rejects restaurants and sets commission

- **Where:** `SuperAdminDashboard.jsx` lines 227–233 (`approveApplication`, `rejectApplication`, `requestChanges`), line 232 (`setRestaurantStatus`), `SettingsTab` lines 484/501 (`setCommissionRate`, `setRestaurantCommission`). All call `MarketplaceContext` functions with no auth check.
- **Why unsafe:** Any user (even unauthenticated, since the dashboard guard is fake) can approve restaurants, suspend them, and change commission rates.
- **Server enforcement:** These operations must be backend functions gated to `role == SUPER_ADMIN` (server-validated). Commission config is admin-only.

### 7.8 Client accesses admin routes

- **Where:** `RoleGuard.jsx` line 12 checks `roles.includes(user.role)` from the mock user.
- **Why unsafe:** Setting `localStorage` `lankaeats_mock_user` to `{"role":"SUPER_ADMIN",...}` bypasses the guard entirely.
- **Server enforcement:** Replace `RoleGuard` with a real auth check; the User role must come from the server. Consider RLS so even if the UI is bypassed, the data queries return nothing for unauthorized roles.

### 7.9 Client deletes reviews

- **Where:** `SuperAdminDashboard.jsx` line 385 (`mp.removeReview(r.id)`).
- **Why unsafe:** No admin check; any client can delete any review.
- **Server enforcement:** Review deletion backend function gated to admin; or RLS delete-rule allowing admin only.

### 7.10 No payment validation

- **Where:** `Checkout.jsx` lines 53–73 — `submit` simulates payment with `setTimeout(1400ms)` then calls `placeOrder`. No payment provider, no intent, no verification.
- **Why unsafe:** Orders are "paid" with no money. `payment_status` is not set.
- **Server enforcement:** Integrate a real payment provider (Stripe is available in this region). Create a payment intent server-side; only set `payment_status: "paid"` after webhook confirmation. Order status `received` should require `payment_status: "paid"` (or allow `pending` for pay-at-pickup).

---

## 8. Business Flow Analysis

### 8.1 Customer flow

| Step | Current implementation | Backend validation needed |
|---|---|---|
| Register | `Register.jsx` → `mockAuth.register({role:"CUSTOMER"})` | Real `register` → OTP → verify; role forced to CUSTOMER |
| Login | `SignIn.jsx` → `mockAuth.login` (any password) | Real `loginViaEmailPassword` |
| Browse restaurants | `Restaurants.jsx` reads `MarketplaceContext.restaurants` (hardcoded) | `base44.entities.Restaurant.filter({status:"active"})` |
| Browse meals | `RestaurantStorefront.jsx` reads `restaurant.categories[].items` | Load Restaurant + Categories + MenuItems by slug |
| Add to cart | `MarketplaceContext.addToCart` (in-memory) | Stays client-side (UI state) |
| Create order | `Checkout.jsx` → `placeOrder` (in-memory, client total) | **Backend function** `placeOrder`: verify items/prices server-side, compute total, set `customer_id` from session, set `status:"received"`, `payment_status` from payment intent |
| Order created | `OrderConfirmation.jsx` reads from `orders` state | Read Order by id (RLS: customer owns it) |
| Restaurant receives | `RestaurantAdminDashboard` reads `mp.orders` | Subscribe to Order entity for owner's restaurant |
| Restaurant updates status | `updateOrderStatus` (client) | **Backend function** `updateOrderStatus` with ownership + state-machine checks |
| Customer sees update | `OrderTracking.jsx` reads `orders` state | Subscribe to Order entity; realtime updates |

### 8.2 Restaurant flow

| Step | Current | Backend needed |
|---|---|---|
| Register/login | `Register.jsx` restaurant tab → `mockAuth.register({role:"RESTAURANT_ADMIN", restaurantId: app.id})` + `addPendingApplication` | Real register as CUSTOMER; submit `RestaurantApplication`; on admin approval, user is linked as `owner_id` to new Restaurant and role upgraded |
| Restaurant profile | `RestaurantAdminDashboard` reads `mp.getRestaurant(user.restaurantId)` | Query `Restaurant.where(owner_id == me.id)` |
| Add meal | `Menu` → `mp.addMenuItem(restaurant.id, ...)` | `MenuItem.create` with RLS: parent restaurant `owner_id == me` |
| Edit meal | `Menu` → `mp.updateMenuItem` (inline price) | `MenuItem.update` with ownership RLS |
| Disable meal | `Menu` → `mp.toggleItemAvailable` | `MenuItem.update({is_available})` with RLS |
| Receive order | `OpenOrders` reads `mp.orders` | Subscribe to `Order.where(restaurant_id == myRestaurant.id && status in [received,accepted,preparing,ready,out_for_delivery])` |
| Accept/reject | `mp.updateOrderStatus(o.id, "accepted"|"rejected")` | Backend function with ownership + state machine |
| Update status | `mp.updateOrderStatus` | Same backend function |
| View history | `AllOrders` reads `mp.orders` | `Order.filter({restaurant_id})` with RLS |

### 8.3 Admin flow

| Step | Current | Backend needed |
|---|---|---|
| Login | Mock, any password | Real auth; role `SUPER_ADMIN` enforced server-side |
| Manage suppliers | `Restaurants` table → approve/reject/suspend | Backend functions gated to admin; `RestaurantApplication` approval creates `Restaurant` + links owner |
| Manage users | `Customers` table (derived from orders) | `User.list` (admin-only built-in); suspend = update user role/status |
| Manage meals | Not directly editable by admin in UI, but `MarketplaceContext` allows it | Admin RLS override on MenuItem/Category |
| Manage orders | `Orders` table reads all `mp.orders` | `Order.list` admin scope |
| Manage subscriptions | Not present | N/A (no subscription model) |
| Manage commissions | `SettingsTab` → `setCommissionRate`/`setRestaurantCommission` | `CommissionConfig.update` admin-only; `Restaurant.commission_rate` admin-only |
| Monitor | `Overview` charts from `MONTHLY` hardcoded | Aggregate from Order entity (count, sum by month) |

### 8.4 Validation points (where backend must enforce)

1. **Order creation:** item existence, item availability, price re-verification, restaurant is `active` and `open`, min-order met, delivery address required if `delivery`, time slot valid.
2. **Order status transitions:** only the legal next state (per `NEXT` map); only the restaurant owner or admin; cannot transition a `cancelled`/`rejected`/`completed` order.
3. **Menu item price:** owner can set any positive number, but the *order's* price is frozen at order time.
4. **Restaurant application approval:** only admin; on approval atomically create Restaurant + set applicant as `owner_id` + upgrade user role.
5. **Commission rate:** 0–50% range (UI uses `min=0 max=50` at `SuperAdminDashboard.jsx` line 482); admin-only.
6. **Review creation:** only one per completed order; author must be the order's `customer_id`; order must be `completed`.
7. **Role escalation:** never trust client role; role changes only via admin action or approval flow.

---

## 9. Backend Function Requirements

Backend functions (in `base44/functions/`) are needed where server-side business logic must run that cannot be expressed purely as entity CRUD + RLS.

### 9.1 `placeOrder`

- **Trigger:** Checkout submit.
- **Input:** `{ restaurantId, items: [{menuItemId, quantity, instructions}], deliveryType, scheduledDate, scheduledTime, deliveryAddress, instructions, paymentMethod }`.
- **Server logic:**
  1. Verify restaurant is `active` and `open`.
  2. Fetch each `menuItemId` from DB; verify `is_available` and `restaurant_id` matches.
  3. Snapshot `name`, `price` from DB (ignore any client price).
  4. Compute `subtotal`, `delivery_fee` (from restaurant), `service_fee`, `total`.
  5. Verify `total >= restaurant.min_order`.
  6. If `paymentMethod != "pickup"`, create payment intent (Stripe); set `payment_status: "pending"`.
  7. Create `Order` with `customer_id = current user`, `status: "received"`.
  8. Create `OrderItem` records.
  9. Return order (with order_number).
- **Why a function:** Price calculation and ownership must be server-authoritative; cannot be done safely with client entity writes.

### 9.2 `updateOrderStatus`

- **Input:** `{ orderId, newStatus }`.
- **Server logic:**
  1. Load order; verify caller is `owner_id` of `order.restaurant_id` or admin.
  2. Validate transition against state machine (`received→accepted→preparing→ready→completed`, with `rejected` from `received`, `out_for_delivery` from `ready` for delivery).
  3. Update order `status`; if `completed`, allow review creation.
  4. (Optional) notify customer.
- **Why a function:** State-machine + ownership enforcement.

### 9.3 `approveRestaurantApplication`

- **Input:** `{ applicationId }`.
- **Server logic:**
  1. Verify caller is admin.
  2. Load application; verify `status == "pending"`.
  3. Create `Restaurant` from application fields; set `owner_id = application.applicant_user_id`, `status: "active"`.
  4. Update applicant User role to `RESTAURANT_ADMIN`.
  5. Mark application `approved`.
- **Why a function:** Atomic multi-entity creation + role escalation must be server-side.

### 9.4 `rejectRestaurantApplication` / `requestChanges`

- **Input:** `{ applicationId, reason? }`.
- **Server logic:** Admin-only; update application status.
- **Why a function:** Admin authorization.

### 9.5 `setRestaurantStatus` (suspend/reactivate)

- **Input:** `{ restaurantId, status }`.
- **Server logic:** Admin-only; update `Restaurant.status`. Also set `is_open = (status == "active")`.
- **Why a function:** Admin authorization; affects public visibility.

### 9.6 `setCommissionRate` / `setRestaurantCommission`

- **Input:** `{ rate }` or `{ restaurantId, rate }`.
- **Server logic:** Admin-only; validate 0–50; update `CommissionConfig` or `Restaurant.commission_rate`.
- **Why a function:** Admin authorization + config integrity.

### 9.7 `submitRestaurantApplication`

- **Input:** Application form fields + uploaded logo/cover file urls.
- **Server logic:** Create `RestaurantApplication` with `applicant_user_id = current user`, `status: "pending"`. Do NOT create a Restaurant yet.
- **Why a function:** File upload handling + linking to authenticated user.

### 9.8 `createReview`

- **Input:** `{ orderId, rating, foodRating, text }`.
- **Server logic:**
  1. Verify caller is the `customer_id` of the order.
  2. Verify order `status == "completed"`.
  3. Verify no existing review for this order.
  4. Create `Review` with `is_verified: true`.
  5. (Optional) recompute `Restaurant.rating`/`review_count`.
- **Why a function:** Business rules (one review per completed order, verified).

### 9.9 Optional: `getDashboardMetrics`

- **Purpose:** Aggregate Order data for admin/restaurant charts (replacing hardcoded `MONTHLY`).
- **Server logic:** Aggregate orders by month/status/restaurant; return counts and sums.
- **Why a function:** Complex aggregation; avoids client fetching all orders.

---

## 10. Data Migration Plan

| # | Source file | Records | Target entity | Transformation | Auto-importable? |
|---|---|---|---|---|---|
| 1 | `src/data/restaurants.js` (restaurants array) | 6 | `Restaurant` | Map fields 1:1; generate `slug` (already present); set `owner_id` to the matching demo user; set `status:"active"`, `is_open` from `open`; split `cuisines` (already array); `cover_image_url` from `cover`; `logo_text` from `logoText` | Yes — scripted |
| 2 | `src/data/restaurants.js` (nested `categories`) | ~25 | `Category` | Flatten: for each restaurant, for each `cat(name, items)`, create Category with `restaurant_id`; preserve order | Yes |
| 3 | `src/data/restaurants.js` (nested `items`) | ~60 | `MenuItem` | Flatten: for each item, create MenuItem with `restaurant_id` + `category_id`; map `veg`→`is_vegetarian`, `available`→`is_available`, `popular`→`is_popular`, `image`→`image_url`, `desc`→`description` | Yes |
| 4 | `src/data/restaurants.js` `seedReviews` | 6 | `Review` | Map `restaurantId`→`restaurant_id`; `author`→`author_name` (no real user id — mark `author_id` null or create placeholder); `verified`→`is_verified`; `date`→`created_date` | Yes (with placeholder users) |
| 5 | `src/data/restaurants.js` `seedOrders` | 5 | `Order` + `OrderItem` | Split each order into 1 Order + N OrderItems; map `restaurantId`→`restaurant_id`; `customer`→`customer_name` (no real user id — placeholder); `type`→`delivery_type`; `amount`→`total`; `date`+`time`→`scheduled_date`/`scheduled_time`; `status` as-is | Yes (with placeholder users) |
| 6 | `src/data/categories.js` `categories` | 12 | `Category` (global) or seed `Restaurant.cuisines` | If global browse categories are desired, create a `GlobalCategory` or reuse; the `count` field is fake and should be dropped or computed | Yes |
| 7 | `MarketplaceContext` `pendingRestaurants` seed | 1 | `RestaurantApplication` | Map fields; `applicant_user_id` = placeholder; `status:"pending"` | Yes |
| 8 | `MarketplaceContext` `commissionRate` | 1 | `CommissionConfig` | Create single record `default_rate: 10` | Yes |
| 9 | `MockAuthContext` `DEMO_USERS` | 3 | `User` (via invite) | Users cannot be created directly (`create` returns 405). Must use `base44.users.inviteUser(email, role)` for each; then assign `restaurant_id`/owner link after restaurant import | Semi-manual (invite flow) |
| 10 | `SuperAdminDashboard` `MONTHLY` / `RestaurantAdminDashboard` `MONTHLY` | 12 | (none — derived) | Do NOT migrate; compute from Order records going forward. Seed orders are too few for real charts. | N/A |
| 11 | `CustomerAccount` saved addresses | 2 | `Address` (if Favorite-like entity added) | Optional; placeholder | Optional |
| 12 | Uploaded images (`IMG.*`) | 7 | (stored URLs) | Already hosted on `media.base44.com`; keep as default fallback URLs in code or seed into restaurant records | N/A |

**Migration ordering:** Users (invite) → Restaurants → Categories → MenuItems → Orders + OrderItems → Reviews → RestaurantApplications → CommissionConfig.

**Data integrity notes:**
- Seed orders/reviews reference customers by name string, not user id. Migration must either create placeholder users or leave `customer_id`/`author_id` null and accept that historical data is not linked to real accounts.
- `seedOrders` use `amount` field; new schema uses `subtotal`/`total`. Migration must map `amount`→`total` (and derive `subtotal` = `total - delivery_fee - service_fee`).
- Order status `delivering` appears in `OrderTracking.jsx` `deliveryFlow` (line 18) but `seedOrders` and `StatusBadge` use `out_for_delivery`. Migration must normalize to `out_for_delivery`.

---

## 11. Frontend Migration Plan

### 11.1 What stays client-side (presentation / UI state)

- **Cart** (`MarketplaceContext.cart`, `addToCart`, `updateQty`, `removeItem`, `clearCart`) — stays in React context/localStorage; it is ephemeral UI state.
- **Filtering/sorting** on `Restaurants.jsx` (lines 47–73) — client-side filtering of fetched restaurants is fine for the dataset size; server-side filtering optional.
- **Form state** in `Checkout.jsx`, `Register.jsx`, `BecomePartner.jsx` — local `useState`.
- **Active tab** state in dashboards — local `useState`.
- **Search query** state — local.
- **Image fallbacks** (`IMG` object) — keep as default constants.

### 11.2 What must be replaced with entity queries

| Current call site | Current source | New source |
|---|---|---|
| `Home.jsx` line 11 `useMarketplace().restaurants` | in-memory | `base44.entities.Restaurant.filter({status:"active"})` |
| `Restaurants.jsx` line 19 | in-memory | same entity query |
| `RestaurantStorefront.jsx` line 15 `getRestaurant(slug)` | in-memory | `base44.entities.Restaurant.filter({slug})` + Categories + MenuItems |
| `RestaurantCard.jsx` | in-memory restaurant | entity record |
| `Cart.jsx` `cartRestaurant` | in-memory | query restaurant by `cart.restaurantId` |
| `Checkout.jsx` `cartRestaurant` | in-memory | same |
| `OrderConfirmation.jsx` `getRestaurant` (imports `src/data/restaurants`) | hardcoded | entity query |
| `OrderTracking.jsx` `getRestaurant` | hardcoded | entity query |
| `CustomerAccount.jsx` `orders`, `reviews`, `restaurants`, `allMenuItems` | in-memory + hardcoded | `Order.filter({customer_id: me.id})`, `Review.filter({author_id: me.id})`, `Restaurant.list`, `MenuItem.list` |
| `SuperAdminDashboard.jsx` all `mp.*` | in-memory | entity queries + backend function for metrics |
| `RestaurantAdminDashboard.jsx` all `mp.*` | in-memory | entity queries scoped by `owner_id` |
| `Navbar.jsx` `cartCount`, `favoriteRestaurants` | in-memory | cart stays local; favorites → `Favorite.filter({user_id})` |

### 11.3 What must be replaced with backend function calls

| Current call | New backend function |
|---|---|
| `MarketplaceContext.placeOrder` (line 69) | `placeOrder` (§9.1) |
| `MarketplaceContext.updateOrderStatus` (line 86) | `updateOrderStatus` (§9.2) |
| `MarketplaceContext.approveApplication` (line 115) | `approveRestaurantApplication` (§9.3) |
| `MarketplaceContext.rejectApplication` (line 153) | `rejectRestaurantApplication` (§9.4) |
| `MarketplaceContext.setRestaurantStatus` (line 156) | `setRestaurantStatus` (§9.5) |
| `MarketplaceContext.setCommissionRate`/`setRestaurantCommission` | `setCommissionRate` (§9.6) |
| `MarketplaceContext.addPendingApplication` (line 109) | `submitRestaurantApplication` (§9.7) |
| `MarketplaceContext.addReview` (line 90) | `createReview` (§9.8) |
| `MarketplaceContext.addMenuItem`/`updateMenuItem`/`deleteMenuItem`/`toggleItemAvailable` | Direct entity CRUD with RLS (owner-scoped) — no function needed if RLS is correct |
| `MarketplaceContext.addCategory`/`deleteCategory` | Direct entity CRUD with RLS |
| `MarketplaceContext.updateRestaurantSettings` | Direct `Restaurant.update` with RLS (owner) |

### 11.4 Auth migration

- Remove `MockAuthProvider` from `App.jsx` line 81.
- Remove `MarketplaceProvider`'s data responsibilities (keep only cart UI state, or split cart into its own context).
- Rewrite `SignIn.jsx` to use `base44.auth.loginViaEmailPassword`.
- Rewrite `Register.jsx` to use `base44.auth.register` → OTP → `verifyOtp` → `setToken`. Customer registration only; restaurant registration submits an application (user stays CUSTOMER until approved).
- Rewrite `ForgotPassword.jsx` to use `base44.auth.resetPasswordRequest`.
- Add `ResetPassword.jsx` page (reads `?token=`) using `base44.auth.resetPassword` — currently missing entirely.
- Rewrite `RoleGuard.jsx` to read from real `useAuth().user` and check the server-validated role.
- Update `App.jsx` routes to register `/reset-password` and use `ProtectedRoute` for authenticated pages.

### 11.5 File storage

- Restaurant logo/cover uploads (`BecomePartner.jsx` `UploadBox` lines 97–106, currently non-functional) → use `base44.integrations.Core.UploadFile` to get `file_url`, store on Restaurant.
- MenuItem images (restaurant admin adding items) → same upload flow.

---

## 12. Production Implementation Phases

1. **Define entity schemas** — Create `Restaurant`, `Category`, `MenuItem`, `Order`, `OrderItem`, `Review`, `RestaurantApplication`, `CommissionConfig`, `Favorite` (optional) in `base44/entities/`. Extend `User` role enum.
2. **Configure RLS** — Owner-scoped read/write for restaurants, categories, menu items, orders (owner = restaurant owner); customer-scoped for orders/reviews/favorites; admin override.
3. **Implement real authentication** — Rewrite `SignIn`/`Register`/`ForgotPassword`/add `ResetPassword` using Base44 SDK; remove `MockAuthContext`; update `RoleGuard`.
4. **Implement backend functions** — `placeOrder`, `updateOrderStatus`, `approveRestaurantApplication`, `rejectRestaurantApplication`, `setRestaurantStatus`, `setCommissionRate`, `submitRestaurantApplication`, `createReview`, `getDashboardMetrics`.
5. **Import seed data** — Migrate restaurants, categories, menu items, orders, reviews, applications, commission config per §10. Invite demo users via `base44.users.inviteUser`.
6. **Replace restaurant data source** — Swap `MarketplaceContext.restaurants` for entity queries in `Home`, `Restaurants`, `RestaurantStorefront`, `RestaurantCard`.
7. **Replace category data source** — Swap `src/data/categories.js` for entity/global config.
8. **Replace meal data source** — Swap nested menu items for `MenuItem` queries.
9. **Implement customer order flow** — Wire `Checkout` to `placeOrder` function; `OrderConfirmation`/`OrderTracking` to entity reads + realtime subscription.
10. **Implement restaurant order flow** — Wire `RestaurantAdminDashboard` to entity queries + `updateOrderStatus` function; realtime subscription for new orders.
11. **Implement admin flow** — Wire `SuperAdminDashboard` to entity queries + admin functions; replace hardcoded `MONTHLY` with `getDashboardMetrics`.
12. **Implement review flow** — Wire `OrderTracking` review form to `createReview`.
13. **Integrate payments** — Stripe (available in region LK); payment intent in `placeOrder`; webhook for `payment_status`.
14. **Implement file uploads** — Logo/cover/menu images via `UploadFile`.
15. **Remove mock data** — Delete `src/data/restaurants.js`, `src/data/categories.js`, `MockAuthContext`, hardcoded `MONTHLY` arrays, `IMG` (or keep as defaults).
16. **Security test** — Verify RLS: customer cannot read other customers' orders; restaurant A cannot edit restaurant B's menu; non-admin cannot approve restaurants or set commission; client-supplied prices ignored.
17. **End-to-end test** — Full customer journey (register → browse → order → pay → track → review); full restaurant journey (apply → approved → add menu → receive order → update status); full admin journey (login → approve application → suspend restaurant → set commission → view metrics).
18. **Production readiness verification** — Real auth, persisted data, RLS enforced, payments live, no hardcoded business data.

---

## 13. Risks / Blockers

1. **Dual auth system** — `AuthContext` (real) and `MockAuthContext` (fake) coexist. Every page imports `useMockAuth`. Removing it touches ~10 files. Risk of breaking the app if not done atomically.
2. **User creation constraint** — Base44 `User` records cannot be created via `create` (returns 405). Demo users must be invited via `base44.users.inviteUser`, which sends real emails. Seed orders/reviews reference users by name — linking them to real invited users requires the invitees to accept.
3. **Role model mismatch** — The app uses `SUPER_ADMIN`/`RESTAURANT_ADMIN`/`CUSTOMER`; the built-in `User` entity has `admin`/`user`. The role enum must be extended, and all `RoleGuard`/dashboard checks updated consistently.
4. **Restaurant ownership bootstrap** — In the prototype, `Register.jsx` immediately grants `RESTAURANT_ADMIN` and a `restaurantId`. In production, a restaurant admin cannot exist until their application is approved. There is a chicken-and-egg gap: the applicant must be a CUSTOMER first, then upgraded. The `RestaurantAdminDashboard` currently shows an "under review" state (lines 47–58) for this case — that logic must be preserved.
5. **Payment provider** — Stripe is available in region LK, but Base44/Wix Payments is not. The prototype's simulated payment (`Checkout.jsx` line 53, `setTimeout`) must be replaced with a real Stripe integration, which requires a backend function and webhook handling.
6. **Realtime order notification** — The prototype has no realtime; the restaurant dashboard polls nothing. Production needs `base44.entities.Order.subscribe` for live order reception. This is new functionality not present in the prototype.
7. **Historical data linkage** — Seed orders/reviews have no real user ids. Migrating them with placeholder users means customers cannot "own" historical orders. Decision needed: drop seed orders, or keep them as unlinked demo data.
8. **Category model ambiguity** — The prototype has two category concepts: (a) global browse categories (`src/data/categories.js` — "Rice & Curry", "Kottu", etc.) and (b) per-restaurant menu sections (`restaurant.categories[]`). These are different things sharing the word "category". The entity model must distinguish them (e.g. `GlobalCategory` vs `MenuCategory`), or collapse browse categories into `Restaurant.cuisines` filtering.
9. **`slug` uniqueness** — `approveApplication` (line 116) generates slug from name; collisions possible. DB must enforce unique slug.
10. **Order number generation** — Currently `"LE-" + (10234 + count)` (`MarketplaceContext` line 70), client-side. Must be server-generated and unique.

---

## 14. Questions Requiring Human Decisions

1. **Role values:** Should the marketplace roles be `SUPER_ADMIN`/`RESTAURANT_ADMIN`/`CUSTOMER` (matching the prototype) or mapped to the built-in `admin`/`user`? This affects the `User` entity enum and every `RoleGuard` call.
2. **Category model:** Should global browse categories (the 12 in `src/data/categories.js`) become a separate entity, or should restaurant filtering use the `cuisines` array on Restaurant (which already powers `Restaurants.jsx` line 52 `r.cuisines.includes(cat)`)?
3. **Historical seed data:** Keep the 5 seed orders and 6 seed reviews (unlinked to real users), or start with a clean database?
4. **Payment:** Confirm Stripe as the payment provider (Wix/Base44 Payments unavailable in region). Confirm whether pay-at-pickup orders skip online payment.
5. **Commission model:** Is the flat-percentage commission (currently 10%) the final model, or will there be tiered/subscription plans later? This affects whether `CommissionConfig` stays simple or needs expansion.
6. **Multi-location restaurants:** The prototype is single-location. Is multi-location a future requirement (which would require `RestaurantLocation`), or can it stay single-address?
7. **Review deletion:** Should customers be able to delete their own reviews, or only admin (`SuperAdminDashboard` currently has `removeReview`)?
8. **Customer suspension:** `SuperAdminDashboard` `Customers` has a suspend toggle (lines 316–358) that only sets local state. Should suspension be a real user-status field, and what does it prevent (ordering only, or login)?
9. **Notifications:** No notification system exists. Are email/push notifications for new orders (to restaurant) and status updates (to customer) required for MVP?
10. **Dashboard metrics:** The `MONTHLY` arrays are hardcoded. Is historical data available to compute real metrics, or should dashboards start empty and accumulate from the launch date?

---

*End of discovery document. No application code was modified in the production of this report.*