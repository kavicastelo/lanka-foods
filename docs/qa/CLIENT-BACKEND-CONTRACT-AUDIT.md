# LankaEats Finland — Client-Backend Contract Audit Matrix

## 1. Overview
This document records the exact API contract alignment between the React frontend application (`src/api/*`, `src/hooks/useMarketplaceData.js`, `src/lib/marketplaceAuth.js`) and the Node.js + Fastify backend REST API (`backend/src/modules/*`).

---

## 2. API Endpoint & Payload Contract Matrix

| Domain | Operation | Frontend Caller | HTTP Method | Endpoint Route | Request Shape | Response Shape | Auth Required | Roles Permitted | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **Auth** | Register | `authApi.register` | `POST` | `/api/auth/register` | `{ fullName, email, password, phone }` | `{ message, user, token }` | No | Public | **PASS** |
| **Auth** | Login | `authApi.login` | `POST` | `/api/auth/login` | `{ email, password }` | `{ message, user, token }` | No | Public | **PASS** |
| **Auth** | Get Me | `authApi.getMe` | `GET` | `/api/auth/me` | None | `{ user }` | Yes | All | **PASS** |
| **Auth** | Update Me | `authApi.updateMe` | `PATCH` | `/api/auth/me` | `{ fullName, phone }` | `{ message, user }` | Yes | All | **PASS** |
| **Restaurants** | Public List | `restaurantsApi.getRestaurants` | `GET` | `/api/restaurants` | Query: `{ status, city, search, page, limit }` | `{ restaurants, pagination }` | No | Public | **PASS** |
| **Restaurants** | Storefront Detail | `restaurantsApi.getRestaurantBySlug` | `GET` | `/api/restaurants/:slug` | Params: `:slug` | `{ restaurant }` | No | Public | **PASS** |
| **Restaurants** | Owner Restaurant | `restaurantsApi.getMyRestaurant` | `GET` | `/api/restaurant/me` | None | `{ restaurant }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Restaurants** | Owner Settings | `restaurantsApi.updateMySettings` | `PATCH` | `/api/restaurant/settings` | Settings payload | `{ message, restaurant }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Public Catalog | `menuApi.getPublicMenuBySlug` | `GET` | `/api/restaurants/:slug/menu` | Params: `:slug` | `{ restaurant, categories }` | No | Public | **PASS** |
| **Menu** | Owner Categories List | `menuApi.getOwnerMenuCategories` | `GET` | `/api/restaurant/menu-categories` | None | `{ categories }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Create Category | `menuApi.createMenuCategory` | `POST` | `/api/restaurant/menu-categories` | `{ name, sortOrder }` | `{ message, category }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Update Category | `menuApi.updateMenuCategory` | `PATCH` | `/api/restaurant/menu-categories/:id` | `{ name, sortOrder }` | `{ message, category }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Delete Category | `menuApi.deleteMenuCategory` | `DELETE` | `/api/restaurant/menu-categories/:id` | None | `{ message }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Owner Items List | `menuApi.getOwnerMenuItems` | `GET` | `/api/restaurant/menu-items` | None | `{ items }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Create Menu Item | `menuApi.createMenuItem` | `POST` | `/api/restaurant/menu-items` | `{ categoryId, name, description, price (cents), ... }` | `{ message, item }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Update Menu Item | `menuApi.updateMenuItem` | `PATCH` | `/api/restaurant/menu-items/:id` | Item fields payload | `{ message, item }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Menu** | Delete Menu Item | `menuApi.deleteMenuItem` | `DELETE` | `/api/restaurant/menu-items/:id` | None | `{ message }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Orders** | Create Order | `ordersApi.createOrder` | `POST` | `/api/orders` | `{ restaurantId, items, deliveryType, ... }` | `{ message, order }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Orders** | List Orders | `ordersApi.getOrders` | `GET` | `/api/orders` | Query: `{ status, page, limit }` | `{ orders, pagination }` | Yes | All | **PASS** |
| **Orders** | Order Detail | `ordersApi.getOrderById` | `GET` | `/api/orders/:id` | Params: `:id` | `{ order }` | Yes | All (Owned) | **PASS** |
| **Orders** | Update Order Status | `ordersApi.updateOrderStatus` | `PATCH` | `/api/orders/:id/status` | `{ status, reason }` | `{ message, order }` | Yes | RESTAURANT_ADMIN, SUPER_ADMIN | **PASS** |
| **Partner** | Apply Partner | `applicationsApi.apply` | `POST` | `/api/partner/apply` | `{ businessName, ownerName, email, phone, city, address, businessType, cuisine, description, pickup, delivery }` | `{ message, application }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Partner** | My Application | `applicationsApi.getMyApplication` | `GET` | `/api/partner/my-application` | None | `{ application }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Admin** | Application List | `applicationsApi.getApplications` | `GET` | `/api/admin/applications` | Query: `{ status, page, limit }` | `{ applications, pagination }` | Yes | SUPER_ADMIN | **PASS** |
| **Admin** | Approve Application | `applicationsApi.approveApplication` | `POST` | `/api/admin/applications/:id/approve` | None | `{ message, application, restaurant }` | Yes | SUPER_ADMIN | **PASS** |
| **Admin** | Reject Application | `applicationsApi.rejectApplication` | `POST` | `/api/admin/applications/:id/reject` | `{ reason }` | `{ message, application }` | Yes | SUPER_ADMIN | **PASS** |
| **Reviews** | Create Review | `reviewsApi.createReview` | `POST` | `/api/reviews` | `{ restaurantId, orderId, rating, comment }` | `{ message, review }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Reviews** | List Restaurant Reviews | `reviewsApi.getRestaurantReviews` | `GET` | `/api/restaurants/:restaurantId/reviews` | Params: `:restaurantId` | `{ reviews }` | No | Public | **PASS** |
| **Favorites** | Get Favorites | `favoritesApi.getFavorites` | `GET` | `/api/favorites` | None | `{ restaurants, items, raw }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Favorites** | Toggle Restaurant | `favoritesApi.addFavorite` / `removeFavorite` | `POST` / `DELETE` | `/api/favorites/restaurants/:restaurantId` | Params: `:restaurantId` | `{ favorited, favorite }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |
| **Favorites** | Toggle Menu Item | `favoritesApi.addFavorite` / `removeFavorite` | `POST` / `DELETE` | `/api/favorites/menu-items/:menuItemId` | Params: `:menuItemId` | `{ favorited, favorite }` | Yes | CUSTOMER, SUPER_ADMIN | **PASS** |

---

## 3. Role-Based Contract Alignment
- Backend User Schema Roles: `CUSTOMER`, `RESTAURANT_ADMIN`, `SUPER_ADMIN`.
- Frontend `getMarketplaceRole(user)` derives:
  - `user.role === 'SUPER_ADMIN' || user.role === 'admin'` -> `ROLES.SUPER_ADMIN`
  - `user.role === 'RESTAURANT_ADMIN'` or has owner restaurant -> `ROLES.RESTAURANT_ADMIN`
  - Otherwise -> `ROLES.CUSTOMER`
- `<RoleGuard>` protects `/admin/dashboard` for `SUPER_ADMIN`, `/restaurant/dashboard` for `RESTAURANT_ADMIN`, `/account` for `CUSTOMER`.
