# Phase 6 — Server-Authoritative Cart & Order Calculations Report

## 1. Objective

The objective of Phase 6 was to design, implement, and verify the independent, server-authoritative **Order Placement Engine** for **LankaEats Finland**, ensuring the backend is the sole authority for menu item prices, item availability, restaurant status, subtotal calculations, delivery fees, minimum order requirements, order totals, and customer identity.

---

## 2. Starting State

Prior to Phase 6:
* Phase 1 established backend infrastructure (Fastify, TypeScript, Pino, Vitest).
* Phase 2 established Mongoose schemas (`Order`, `OrderCounter`, `Restaurant`, `MenuItem`, `User`).
* Phase 3 established independent JWT authentication (`authenticate`) and RBAC (`authorize`).
* Phase 4 established public restaurant discovery and owner settings.
* Phase 5 established public menu catalog and owner menu item/category management.
* No order placement endpoint or server-side order calculation engine existed in the backend.

---

## 3. Legacy Checkout Analysis

Analysis of legacy order creation:
* The client submitted cart items and expected the server to process checkout.
* Financial values (item prices, delivery fee, subtotal, total) must never be trusted from client request payloads. The server must look up prices from MongoDB.

---

## 4. Existing Order Model Review

* **Order Model**: Stores `orderNumber`, `restaurantId`, `customerId`, `customerName`, `customerPhone`, `customerEmail`, `deliveryType`, `status`, `subtotal`, `deliveryFee`, `serviceFee`, `total`, `scheduledDate`, `scheduledTime`, `deliveryAddress`, `instructions`, `paymentMethod`, `paymentStatus`, `placedAt`, `items`.
* **OrderItem Schema**: Preserves historical item snapshots (`menuItemId`, `nameSnapshot`, `unitPrice`, `quantity`, `subtotal`).
* **OrderCounter Model**: Generates atomic, sequential order numbers (`generateNextOrderNumber()`).

---

## 5. Architecture

Created modular backend components in `backend/src/modules/orders/`:
* `backend/src/modules/orders/order.schemas.ts`
* `backend/src/modules/orders/order.mapper.ts`
* `backend/src/modules/orders/order.service.ts`
* `backend/src/modules/orders/order.routes.ts`

---

## 6. Files Created

* `backend/src/modules/orders/order.schemas.ts`
* `backend/src/modules/orders/order.mapper.ts`
* `backend/src/modules/orders/order.service.ts`
* `backend/src/modules/orders/order.routes.ts`
* `backend/tests/order.test.ts`
* `docs/backend/06-order-engine.md`
* `docs/reports/phase-6-report.md`

---

## 7. Files Modified

* `backend/src/utils/money.ts`
* `backend/src/routes/index.ts`

---

## 8. API Endpoint

* `POST /api/orders` (Protected: `[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)

---

## 9. Request Validation

* Zod validation schema (`createOrderSchema`) enforces:
  * `restaurantId`: required ObjectId string
  * `items`: array of 1 to 50 items (`menuItemId`, `quantity` 1–99)
  * `deliveryType`: `'pickup'` | `'delivery'`
  * `deliveryAddress`: required (>= 5 chars) if `deliveryType === 'delivery'`

---

## 10. Server-Authoritative Price Calculation

* For every submitted item, unit price is fetched directly from MongoDB `MenuItem.price`. Client-supplied `price` or `unitPrice` fields are ignored.

---

## 11. Integer-Cent Money Handling

* All monetary values (`unitPrice`, `subtotal`, `deliveryFee`, `serviceFee`, `total`) are calculated and stored strictly in integer cents (e.g. 1050 = €10.50). Floating-point currency math is prevented.

---

## 12. Restaurant Validation

* Verifies target restaurant exists, `status === 'active'`, and `isOpen === true`.

---

## 13. Cross-Restaurant Protection

* Verifies `menuItem.restaurantId.toString() === restaurant._id.toString()`. Submitting items from a different restaurant returns `400 BAD_REQUEST`.

---

## 14. Minimum Order Validation

* Verifies `calculatedSubtotal >= restaurant.minOrder`. Subtotal below minimum requirement returns `400 BAD_REQUEST`.

---

## 15. Delivery/Pickup Validation

* Verifies `restaurant.pickup` when `deliveryType === 'pickup'`, and `restaurant.delivery` when `deliveryType === 'delivery'`.

---

## 16. Delivery Fee Calculation

* `deliveryFee` is fetched directly from `restaurant.deliveryFee` for delivery orders (0 for pickup orders). Client-provided fees are ignored.

---

## 17. Order Snapshots

* Order items store historical snapshots (`nameSnapshot`, `unitPrice`, `subtotal`) so future menu price modifications do not alter past order records.

---

## 18. Customer Identity Security

* `customerId`, `customerName`, `customerEmail`, and `customerPhone` are populated strictly from the authenticated JWT user in MongoDB (`User.findById(request.user.id)`). Client-supplied `customerId` is ignored.

---

## 19. Order Number Generation

* Uses `generateNextOrderNumber()` backed by atomic `$inc` updates on `OrderCounter` (`LE-10001`, `LE-10002`).

---

## 20. Initial Order/Payment State

* New orders default to `status: 'received'` and `paymentStatus: 'pending'`.

---

## 21. Duplicate Submission Strategy

* Atomic order counter generation prevents duplicate order number collisions. Validation occurs prior to persistence.

---

## 22. Database Indexes

* Utilizes indexes `{ restaurantId: 1, status: 1 }`, `{ customerId: 1, status: 1 }`, and `{ orderNumber: 1 }`.

---

## 23. Security Protections

1. Price tampering defense (**PASS**)
2. Total tampering defense (**PASS**)
3. Customer ID spoofing defense (**PASS**)
4. Cross-restaurant item defense (**PASS**)
5. Unavailable item defense (**PASS**)
6. Below minimum order defense (**PASS**)
7. Inactive restaurant defense (**PASS**)
8. Fulfillment method validation (**PASS**)
9. Quantity tampering defense (**PASS**)
10. Mass assignment status override defense (**PASS**)

---

## 24. Test Strategy

Executed comprehensive integration and security test suite in `backend/tests/order.test.ts`.

---

## 25. Happy Path Test Results

* Pickup order placement: PASSED
* Delivery order placement: PASSED
* Unique sequential order number generation: PASSED

---

## 26. Adversarial Test Results

* Price tampering attack (`price: 1`): PASSED (server used DB price 1050)
* Total tampering attack (`total: 1`): PASSED (server calculated true total)
* Customer ID spoofing attack: PASSED (overridden with JWT user ID)
* Status mass assignment attack (`status: "completed"`): PASSED (set to `'received'`)
* Cross-restaurant item attack: PASSED (returned 400)
* Unavailable item attack: PASSED (returned 400)
* Below minimum order attack: PASSED (returned 400)
* Inactive restaurant attack: PASSED (returned 400)
* Quantity validation attack (0, -2, 1.5): PASSED (returned 400)
* Missing delivery address attack: PASSED (returned 400)
* Role authorization attack (RESTAURANT_ADMIN creating order): PASSED (returned 403)

---

## 27. Data Integrity Verification

* Verified in MongoDB that stored order totals match server calculations and customer identity matches authenticated user.

---

## 28. Concurrency/Duplicate Testing

* Atomic order counter sequence increment verified across successive order creation requests.

---

## 29. Typecheck Results

* `npm run backend:typecheck`: PASSED (0 errors).

---

## 30. Lint Results

* `npm run backend:lint`: PASSED (0 warnings, 0 errors).

---

## 31. Build Results

* `npm run backend:build`: PASSED (Compiled cleanly to `backend/dist/`).

---

## 32. Full Test Suite Results

```text
✓ tests/health.test.ts (6 tests)
✓ tests/database.test.ts (20 tests)
✓ tests/auth.test.ts (19 tests)
✓ tests/restaurant.test.ts (17 tests)
✓ tests/menu.test.ts (16 tests)
✓ tests/order.test.ts (14 tests)

Test Files  6 passed (6)
     Tests  92 passed (92)
  Duration  12.54s
```

---

## 33. Failures

* None (0 backend failures).

---

## 34. Blocked Items

* None.

---

## 35. Deferred Work

* Order Status Lifecycle State Machine (Phase 7).
* Payment Gateway Integration (Phase 8).

---

## 36. Acceptance Criteria

| Criteria | Result | Evidence |
|---|---|---|
| `POST /api/orders` implemented | `PASS` | `order.routes.ts` |
| Authentication & CUSTOMER role required | `PASS` | `authenticate` + `authorize(['CUSTOMER', 'SUPER_ADMIN'])` |
| Restaurant status validated | `PASS` | Reject non-active / closed restaurants |
| Prices looked up from database | `PASS` | Client price values ignored |
| Server-calculated subtotal, delivery fee, total | `PASS` | Calculated in integer cents |
| Quantity validation enforced | `PASS` | Zod min 1, max 99, integer |
| Cross-restaurant items rejected | `PASS` | `order.service.ts` returns 400 |
| Unavailable items rejected | `PASS` | `order.service.ts` returns 400 |
| Minimum order enforced | `PASS` | `calculatedSubtotal < minOrder` returns 400 |
| Fulfillment rules & address enforced | `PASS` | Zod refinement & pickup/delivery checks |
| Customer ID derived from JWT | `PASS` | Overrides client payload |
| Server order number generation | `PASS` | Atomic `generateNextOrderNumber()` |
| Historical snapshots stored | `PASS` | `nameSnapshot`, `unitPrice`, `subtotal` saved |
| Mass assignment blocked | `PASS` | Server sets `status: 'received'`, `paymentStatus: 'pending'` |
| Backend typecheck, lint, build, tests pass | `PASS` | 92/92 tests passed, 0 typecheck/lint errors |

---

## 37. Final Status

`PASS`

All objectives and acceptance criteria for Phase 6 have been fully achieved and verified with extensive integration and security testing.
