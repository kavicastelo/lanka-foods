# 14 — Frontend API Client Architecture & Integration Specification

## 1. Overview & Architecture

Phase 14 migrates the React + Vite frontend from legacy Base44 SDK calls to an independent HTTP API client layer connecting directly to our Fastify + Node.js + MongoDB backend.

```
React Frontend (src/pages/* & src/components/*)
   │
   │ 1. Data Hooks & UI Mutations (src/hooks/useMarketplaceData.js)
   ▼
Central Domain API Services (src/api/*)
   │ ├── authApi.js
   │ ├── restaurantsApi.js
   │ ├── menuApi.js
   │ ├── ordersApi.js
   │ ├── reviewsApi.js
   │ ├── favoritesApi.js
   │ ├── applicationsApi.js
   │ ├── financialsApi.js
   │ ├── dashboardApi.js
   │ └── mediaApi.js
   ▼
Central Axios API Client (src/api/apiClient.js)
   │ ├── Intercepts Requests: Attaches Authorization: Bearer <token>
   │ ├── Converts Error Responses into Predictable ApiError Objects
   │ └── Handles 401 Session Expiration Events (lankaeats:unauthorized)
   ▼
Node.js + Fastify Backend (http://localhost:4000)
```

---

## 2. API Base URL Configuration

The frontend uses Vite's environment variable system:
- `VITE_API_BASE_URL` (default: `http://localhost:4000`)

*Note: Environment variables exposed to the browser contain no secret keys.*

---

## 3. Central API Client (`src/api/apiClient.js`)

- **Token Storage**: Managed via `localStorage.getItem('access_token')` and `localStorage.setItem('access_token')`.
- **Request Interceptor**: Injects `Authorization: Bearer <token>` into outgoing request headers.
- **Error Interceptor**: Converts HTTP error status codes (400, 401, 403, 404, 409, 500) into standardized `ApiError(message, status, code, details)`. Dispatches `lankaeats:unauthorized` event on 401.

---

## 4. Domain API Modules

| Module | Endpoints Called | Description |
| :--- | :--- | :--- |
| `authApi.js` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Independent authentication & identity |
| `restaurantsApi.js` | `GET /api/restaurants`, `GET /api/restaurants/:id`, `PATCH /api/restaurants/:id` | Restaurant storefronts & profiles |
| `menuApi.js` | `GET /api/restaurants/:id/menu-items`, `POST /api/menu-items`, `PATCH /api/menu-items/:id` | Menu items & catalog management |
| `ordersApi.js` | `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/:id/status` | Server-authoritative order creation & state transitions |
| `reviewsApi.js` | `GET /api/restaurants/:id/reviews`, `POST /api/reviews` | Customer ratings & verified reviews |
| `favoritesApi.js` | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:type/:id` | Customer saved restaurants & menu items |
| `applicationsApi.js` | `POST /api/partner/apply`, `GET /api/admin/applications`, `POST /api/admin/applications/:id/approve` | Supplier onboarding & admin review |
| `financialsApi.js` | `GET /api/admin/commission-config`, `POST /api/admin/commission-config`, `GET /api/admin/financial-records` | Commission tracking & settlements |
| `dashboardApi.js` | `GET /api/dashboard/metrics`, `GET /api/admin/dashboard/metrics` | Server-aggregated analytics |
| `mediaApi.js` | `POST /api/media/upload-url`, `DELETE /api/media` | Cloudflare R2 presigned upload URL requests |

---

## 5. React Data Fetching & Mutation Invalidation

Hooks in `src/hooks/useMarketplaceData.js` wrap `@tanstack/react-query`:
- **Active Restaurants**: `useActiveRestaurants()` → `restaurantsApi.getRestaurants({ status: 'active' })`
- **Menu Items**: `useRestaurantMenu(id)` → `menuApi.getMenuItems(id)`
- **Order Placement**: `usePlaceOrder()` → `ordersApi.createOrder()` (invalidates `myOrders` cache)
- **Order Status Update**: `useUpdateOrderStatus()` → `ordersApi.updateOrderStatus()` (invalidates `restaurantOrders`, `order`, `dashboardMetrics`)

---

## 6. Security & Data Isolation

1. **No Frontend Calculations**: Order subtotals, delivery fees, and platform commissions are calculated authoritatively by the backend.
2. **Identity Isolation**: Frontend user role is derived strictly from server identity response (`GET /api/auth/me`).
3. **Storage Security**: Browser never receives Cloudflare R2 credentials or database connection strings.
