# 04 — Extracted Business Rules

This document records all business rules explicitly encoded in the current codebase.

---

## 1. Cart & Ordering Engine Rules

### Rule 1.1 — Single-Restaurant Cart Restriction
* **Statement**: A shopping cart can only contain items from a single restaurant at any one time. Adding an item from a different restaurant automatically wipes existing items from the cart.
* **Evidence**: [MarketplaceContext.jsx:15-17](file:///d:/talnova/lanka-foods/src/context/MarketplaceContext.jsx#L15-L17)
  ```javascript
  if (prev.restaurantId && prev.restaurantId !== restaurantId) {
      return { restaurantId, items: [{ ...item, qty, instructions }] };
  }
  ```
* **Status**: `VERIFIED`

### Rule 1.2 — Server-Authoritative Item Price Lookup & Snapshotting
* **Statement**: Client-submitted item prices are ignored during order placement. The backend fetches authoritative menu item prices from the database and creates immutable price snapshots in `OrderItem`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:84,90](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L84-L90)
  ```typescript
  const lineTotal = menuItem.price * quantity;
  subtotal += lineTotal;
  orderItems.push({ ..., price: menuItem.price });
  ```
* **Status**: `VERIFIED`

### Rule 1.3 — Server-Side Fee & Total Calculation
* **Statement**: Order total is computed on the backend as `subtotal + deliveryFee + serviceFee`. Service fee is fixed at `€0.99`. Delivery fee is set to `restaurant.delivery_fee` if `deliveryType === "delivery"`, else `0`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:99-101](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L99-L101)
* **Status**: `VERIFIED`

### Rule 1.4 — Minimum Order Value Enforcement
* **Statement**: If `restaurant.min_order` is set, an order cannot be placed if the computed `subtotal` is less than `restaurant.min_order`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:103-109](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L103-L109)
* **Status**: `VERIFIED`

### Rule 1.5 — Restaurant Availability & Open Status Guard
* **Statement**: Orders cannot be placed if `restaurant.status !== "active"` or `restaurant.is_open !== true`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:34-39](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L34-L39)
* **Status**: `VERIFIED`

### Rule 1.6 — Delivery / Pickup Fulfillment Validation
* **Statement**: Orders with `deliveryType === "delivery"` require `restaurant.delivery === true` and non-empty `deliveryAddress`. Orders with `deliveryType === "pickup"` require `restaurant.pickup === true`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:41-50](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L41-L50)
* **Status**: `VERIFIED`

### Rule 1.7 — Order Number Generation Scheme
* **Statement**: Human-readable order numbers are generated sequentially with format `"LE-" + (10234 + total_existing_orders + 1)`.
* **Evidence**: [base44/functions/placeOrder/entry.ts:112-113](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L112-L113)
* **Status**: `VERIFIED`

---

## 2. Order Lifecycle State Machine

### Rule 2.1 — Permissible Order Status Transitions
* **Statement**: Order status transitions are restricted by a legal state machine validator:
  * `received` → `accepted`, `rejected`, `cancelled`
  * `accepted` → `preparing`, `cancelled`, `rejected`
  * `preparing` → `ready`, `cancelled`
  * `ready` → `out_for_delivery`, `completed`, `cancelled`
  * `out_for_delivery` → `completed`, `cancelled`
  * Terminal states (no transitions allowed out): `completed`, `cancelled`, `rejected`
* **Evidence**: [base44/shared/auth.ts:44-53](file:///d:/talnova/lanka-foods/base44/shared/auth.ts#L44-L53), [base44/functions/updateOrderStatus/entry.ts:34-39](file:///d:/talnova/lanka-foods/base44/functions/updateOrderStatus/entry.ts#L34-L39)
* **Status**: `VERIFIED`

### Rule 2.2 — Order Status Update Authorization
* **Statement**: Order status updates can only be executed by the authenticated owner of the receiving restaurant (`restaurant.owner_id === user.id`) or a platform administrator (`user.role === "admin"`).
* **Evidence**: [base44/functions/updateOrderStatus/entry.ts:23-31](file:///d:/talnova/lanka-foods/base44/functions/updateOrderStatus/entry.ts#L23-L31)
* **Status**: `VERIFIED`

---

## 3. Customer Reviews & Ratings Rules

### Rule 3.1 — Verified Purchase Requirement for Reviews
* **Statement**: Reviews can only be submitted for existing orders where `order.customer_id === user.id` AND `order.status === "completed"`.
* **Evidence**: [base44/functions/createReview/entry.ts:23-36](file:///d:/talnova/lanka-foods/base44/functions/createReview/entry.ts#L23-L36)
* **Status**: `VERIFIED`

### Rule 3.2 — Single Review Per Order
* **Statement**: A customer can submit at most one review per completed order ID (`existingReviews.length > 0` returns error 400).
* **Evidence**: [base44/functions/createReview/entry.ts:39-47](file:///d:/talnova/lanka-foods/base44/functions/createReview/entry.ts#L39-L47)
* **Status**: `VERIFIED`

### Rule 3.3 — Rating Range Boundaries
* **Statement**: Ratings must be numbers between 1 and 5 inclusive.
* **Evidence**: [base44/functions/createReview/entry.ts:12](file:///d:/talnova/lanka-foods/base44/functions/createReview/entry.ts#L12)
* **Status**: `VERIFIED`

---

## 4. Restaurant Partner Onboarding & Admin Approval Rules

### Rule 4.1 — Single Pending Application Rule
* **Statement**: Prospective restaurant owners can have at most one pending application (`status === "pending"`).
* **Evidence**: [base44/functions/submitRestaurantApplication/entry.ts:31-40](file:///d:/talnova/lanka-foods/base44/functions/submitRestaurantApplication/entry.ts#L31-L40)
* **Status**: `VERIFIED`

### Rule 4.2 — Idempotent Restaurant Creation on Application Approval
* **Statement**: Approving an application creates a new `Restaurant` record, generates a URL slug from `business_name`, sets `owner_id = application.applicant_user_id`, sets `restaurant_id` on the applicant's `User` record, and updates application status to `"approved"`. Re-approving returns the existing restaurant record idempotently.
* **Evidence**: [base44/functions/approveRestaurantApplication/entry.ts:25-113](file:///d:/talnova/lanka-foods/base44/functions/approveRestaurantApplication/entry.ts#L25-L113)
* **Status**: `VERIFIED`

---

## 5. Commission & Financial Rules

### Rule 5.1 — Commission Rate Calculation Hierarchy
* **Statement**: Platform commission rate is determined per restaurant:
  1. `Restaurant.commission_rate` (if set)
  2. `CommissionConfig.default_rate` (global platform setting, default 10%)
  3. Hardcoded `10%` fallback.
* **Evidence**: [base44/functions/getDashboardMetrics/entry.ts:156](file:///d:/talnova/lanka-foods/base44/functions/getDashboardMetrics/entry.ts#L156), [SuperAdminDashboard.jsx:38](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L38)
* **Status**: `VERIFIED`

### Rule 5.2 — Commission Rate Boundaries
* **Statement**: Commission rates can only be set by platform administrators and must be a number between `0` and `50` percent.
* **Evidence**: [base44/functions/setCommissionRate/entry.ts:8,13](file:///d:/talnova/lanka-foods/base44/functions/setCommissionRate/entry.ts#L8)
* **Status**: `VERIFIED`
