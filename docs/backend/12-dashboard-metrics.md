# 12 — Dashboard Metrics & Analytics Specification

## 1. Overview & Architecture

Phase 12 implements the read-only **Dashboard Metrics & Analytics Service** for LankaEats Finland.

```
Client (Super Admin or Restaurant Owner)
   │
   │ 1. Submits Dashboard Query: GET /api/dashboard/metrics?scope=admin|restaurant
   ▼
Server Analytics Engine (backend/src/modules/dashboard/dashboard.service.ts)
   │
   ├── 2. Role Authorization & Restaurant Ownership Enforcement
   ├── 3. MongoDB Server-Side Aggregation Pipelines ($match, $group, $sort, $limit)
   │       ├── Order Collection: total, completed, subtotal gross, status breakdown, top items
   │       ├── Review Collection: rating average, review count
   │       ├── FinancialRecord Collection (Phase 11 Source of Truth): platform commission & net earnings
   │       ├── Restaurant Collection: total & active count
   │       └── RestaurantApplication Collection: pending application count
   └── 4. Returns Predictable Dashboard DTO (No NaN / Null / Infinity)
```

---

## 2. Metric Definitions & Financial Source of Truth

- **Gross Sales**: Sum of completed order subtotals converted from cents to Euros (`orderSubtotal / 100`).
- **Platform Commission**: Sum of finalized Phase 11 `FinancialRecord` commission fees (`commissionAmount / 100`).
- **Restaurant Net Earnings**: Sum of finalized Phase 11 `FinancialRecord` net payouts (`restaurantNetAmount / 100`).
- **Average Rating**: Mean rating from verified reviews or stored restaurant rating average. Returns `0` if 0 reviews exist.
- **Top Selling Items**: Top 5 menu items by quantity sold, aggregated from historical `order.items` snapshots (`nameSnapshot`, `quantity`).

---

## 3. API Endpoints

### 3.1 Unified Dashboard Metrics Route (Frontend Compatibility)
* **Method**: `GET`
* **Path**: `/api/dashboard/metrics`
* **Auth**: Protected (`[authenticate]`)
* **Query Params**: `scope` (`'admin'` | `'restaurant'`), `restaurantId` (required if `scope === 'restaurant'`)

### 3.2 Super Admin Dashboard Metrics Route
* **Method**: `GET`
* **Path**: `/api/admin/dashboard/metrics`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)

### 3.3 Restaurant Owner Dashboard Metrics Route
* **Method**: `GET`
* **Path**: `/api/restaurants/:restaurantId/dashboard/metrics`
* **Auth**: Protected (`[authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])]`)

---

## 4. Response DTO Contracts

### 4.1 Restaurant Dashboard DTO
```json
{
  "data": {
    "totalOrders": 12,
    "completedOrders": 10,
    "totalRevenue": 180.00,
    "avgRating": 4.5,
    "reviewCount": 8,
    "menuItemCount": 15,
    "monthlyData": [
      { "month": "Mar", "orders": 5, "gross": 75.00 }
    ],
    "topItems": [
      { "name": "Chicken Kottu", "qty": 14 }
    ],
    "statusData": [
      { "name": "completed", "value": 10 },
      { "name": "preparing", "value": 2 }
    ]
  }
}
```

### 4.2 Super Admin Dashboard DTO
```json
{
  "data": {
    "totalRestaurants": 5,
    "activeRestaurants": 4,
    "pendingApplications": 2,
    "totalOrders": 45,
    "totalReviews": 20,
    "avgRating": 4.6,
    "commissionRate": 10,
    "monthlyData": [
      {
        "month": "Mar",
        "orders": 15,
        "gross": 450.00,
        "platform": 45.00,
        "restaurant": 405.00
      }
    ],
    "restaurantRevenue": [
      {
        "id": "67be00000000000000000001",
        "name": "Nuwara Eliya Tea Garden",
        "orderCount": 12,
        "gross": 200.00,
        "platform": 20.00,
        "restaurantRev": 180.00,
        "rate": 10
      }
    ]
  }
}
```

---

## 5. Security & Isolation Defenses

1. **Strict Ownership Enforcement**: Restaurant Admins can only view metrics for restaurants they own (`restaurant.ownerId === request.user.id`). Cross-restaurant access returns `403 FORBIDDEN`.
2. **Zero Data Safety**: New restaurants or empty databases return numeric `0` and empty arrays (`[]`) without throwing runtime errors or returning `NaN` / `null` / `Infinity`.
