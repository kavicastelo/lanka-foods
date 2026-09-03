# 11 — Commission & Financial System Specification

## 1. Overview & Architecture

Phase 11 implements the **Commission & Financial System** for LankaEats Finland.

```
Order Lifecycle Event (Order Transitions to 'completed')
   │
   │ 1. Triggers FinancialService.calculateAndCreateCommissionRecord(orderId)
   ▼
Server Commission Engine (backend/src/modules/financials/financial.service.ts)
   │
   ├── 2. Determines Effective Commission Rate Snapshot (Restaurant override or Global Default)
   ├── 3. Performs Deterministic Minor-Unit Arithmetic (in Cents)
   │       ├── commissionableAmount = order.subtotal
   │       ├── commissionAmount = Math.round((subtotal * rate) / 100)
   │       └── restaurantNetAmount = subtotal - commissionAmount
   ├── 4. Stores Immutable FinancialRecord with Unique Index on orderId
   └── 5. Supports Administrative Manual Settlement (PENDING -> SETTLED)
```

---

## 2. Financial Domain & Money Representation

- All monetary figures are stored and processed in **integer minor units (cents)** matching the project-wide currency convention.
- **`orderSubtotal`**: Food items total in cents.
- **`deliveryFee`**: Delivery fee in cents.
- **`orderTotal`**: Total order amount in cents.
- **`commissionableAmount`**: Food subtotal amount eligible for commission calculation.
- **`commissionRate`**: Historical rate percentage snapshot (e.g. `10` for 10%, `20` for 20%).
- **`commissionAmount`**: Platform commission fee retained by LankaEats in cents.
- **`restaurantNetAmount`**: Net earnings owed to the restaurant in cents.
- **`status`**: `'PENDING'` | `'SETTLED'` | `'VOID'`.

---

## 3. Historical Rate Snapshotting Guarantee

When an order reaches `'completed'` status, the applicable `commissionRate` is captured as an immutable snapshot on the `FinancialRecord`. Subsequent changes to the global default commission rate or restaurant-specific commission rate overrides **do not retroactively recalculate** historical financial records.

---

## 4. API Endpoints

### 4.1 Get Global Commission Config (Admin Only)
* **Method**: `GET`
* **Path**: `/api/admin/commission-config`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)

### 4.2 Update Global Commission Config (Admin Only)
* **Method**: `POST`
* **Path**: `/api/admin/commission-config`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)
* **Request Body**: `{ "defaultRate": 12 }` (0% to 50%)

### 4.3 List Financial Records (Admin Only)
* **Method**: `GET`
* **Path**: `/api/admin/financial-records`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)
* **Query Params**: `page`, `limit`, `restaurantId`, `status`

### 4.4 Manual Record Settlement (Admin Only)
* **Method**: `POST`
* **Path**: `/api/admin/financial-records/:id/settle`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)

### 4.5 Restaurant Financial View (Owner or Admin)
* **Method**: `GET`
* **Path**: `/api/restaurants/:restaurantId/financials`
* **Auth**: Protected (`[authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])]`)

---

## 5. Security & Idempotency Rules

1. **Server Authority**: Commission rate, commission amount, and settlement status are derived on the server. Client attempts to submit financial amounts are ignored.
2. **Cross-Restaurant Protection**: Restaurant Admins can only view financials for restaurants they own (`ownerId === request.user.id`). Cross-restaurant access returns `403 FORBIDDEN`.
3. **Duplicate Prevention**: Compound unique index on `orderId` in MongoDB prevents duplicate financial record creation.
4. **Settlement Idempotency**: Re-settling an already settled record returns `200 OK` without overwriting historical settlement timestamps or admin user IDs.
