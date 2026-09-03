# Phase 7 — Order Lifecycle & State Machine Service Report

## 1. Objective

The objective of Phase 7 was to design, implement, and verify the server-authoritative **Order Lifecycle & State Machine Service** for **LankaEats Finland**, ensuring the backend is the sole authority for order status transitions, preventing arbitrary or invalid client transitions, enforcing ownership authorization, and maintaining server-side status audit history.

---

## 2. Starting State

Prior to Phase 7:
* Phase 6 established server-authoritative order placement (`POST /api/orders`) in `received` status.
* No status transition update endpoint (`PATCH /api/orders/:id/status`), customer order list (`GET /api/orders/my-orders`), or restaurant order list (`GET /api/restaurant/orders`) existed.

---

## 3. Architecture

Implemented modular lifecycle components in `backend/src/modules/orders/`:
* `backend/src/modules/orders/order.state-machine.ts`: Deterministic transition validator.
* `backend/src/modules/orders/order.schemas.ts`: Zod validation schemas for status updates and pagination.
* `backend/src/modules/orders/order.mapper.ts`: Extended response DTO mapping with `statusHistory`.
* `backend/src/modules/orders/order.service.ts`: Service methods `updateOrderStatus`, `getCustomerOrders`, `getOrderById`, `getRestaurantOrders`.
* `backend/src/modules/orders/order.routes.ts`: Fastify route registry.

---

## 4. State Machine Definition

Enforces strict lifecycle states: `received` -> `accepted` -> `preparing` -> `ready` -> `out_for_delivery` -> `completed` (with `cancelled` / `rejected` options where valid).

---

## 5. Pickup Transition Diagram

`received` -> `accepted` -> `preparing` -> `ready` -> `completed`

---

## 6. Delivery Transition Diagram

`received` -> `accepted` -> `preparing` -> `ready` -> `out_for_delivery` -> `completed`

---

## 7. Authorization Matrix

* `CUSTOMER`: Can read own orders. Cannot update status (returns 403).
* `RESTAURANT_ADMIN`: Can read & update owned restaurant orders.
* `SUPER_ADMIN`: Can manage all orders, subject to State Machine transition rules.

---

## 8. API Endpoints

* `PATCH /api/orders/:id/status` (Protected: `[authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])]`)
* `GET /api/orders/my-orders` (Protected: `[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* `GET /api/orders/:id` (Protected: `[authenticate]`)
* `GET /api/restaurant/orders` (Protected: `[authenticate, authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])]`)

---

## 9. Security Protections

1. Customer status update attack (**BLOCKED 403**)
2. Cross-restaurant status update attack (**BLOCKED 404**)
3. Customer data leak (**BLOCKED 404**)
4. Query parameter customerId spoofing (**IGNORED**)
5. Invalid state jump (**REJECTED 400**)
6. Delivery lifecycle bypass (**REJECTED 400**)
7. Pickup lifecycle violation (**REJECTED 400**)
8. Terminal state modification (**REJECTED 400**)

---

## 10. Concurrency Strategy

Uses atomic MongoDB condition matching `Order.findOneAndUpdate({ _id: id, status: currentStatus }, ...)`. Returns `409 CONFLICT` if another request modified the status concurrently.

---

## 11. Files Created

* `backend/src/modules/orders/order.state-machine.ts`
* `backend/tests/order-lifecycle.test.ts`
* `docs/backend/07-order-lifecycle.md`
* `docs/reports/phase-7-report.md`

---

## 12. Files Modified

* `backend/src/models/order.model.ts`
* `backend/src/modules/orders/order.schemas.ts`
* `backend/src/modules/orders/order.mapper.ts`
* `backend/src/modules/orders/order.service.ts`
* `backend/src/modules/orders/order.routes.ts`

---

## 13. Database Index Changes

* Added `{ customerId: 1, placedAt: -1 }` compound index on `Order` schema.

---

## 14. Happy Path Tests

* Pickup lifecycle (received -> accepted -> preparing -> ready -> completed): PASSED
* Delivery lifecycle (received -> accepted -> preparing -> ready -> out_for_delivery -> completed): PASSED
* Customer order history: PASSED
* Restaurant order history: PASSED
* Order detail lookup: PASSED

---

## 15. Adversarial Tests

* Customer status update attack: PASSED (403)
* Cross-restaurant status update attack: PASSED (404)
* Customer data leak: PASSED (404)
* Invalid state jumps & terminal state locks: PASSED (400)
* Super admin state machine compliance: PASSED (400)

---

## 16. Regression Test Results

* 106 / 106 tests passed cleanly across all 7 test files.

---

## 17. Typecheck Result

* `npm run backend:typecheck`: PASSED (0 errors).

---

## 18. Lint Result

* `npm run backend:lint`: PASSED (0 warnings, 0 errors).

---

## 19. Build Result

* `npm run backend:build`: PASSED (Compiled cleanly to `backend/dist/`).

---

## 20. Failures

* None.

---

## 21. Blocked Items

* None.

---

## 22. Deferred Work

* Payment Gateway Integration (Phase 8).

---

## 23. Acceptance Criteria

| Criteria | Result | Evidence |
|---|---|---|
| State machine implemented | `PASS` | `order.state-machine.ts` |
| Pickup lifecycle enforced | `PASS` | `order-lifecycle.test.ts` |
| Delivery lifecycle enforced | `PASS` | `order-lifecycle.test.ts` |
| Invalid transitions & terminal states blocked | `PASS` | `order-lifecycle.test.ts` |
| CUSTOMER blocked from status update | `PASS` | HTTP 403 verified |
| RESTAURANT_ADMIN restricted to own orders | `PASS` | HTTP 404 verified |
| SUPER_ADMIN obeys state machine | `PASS` | HTTP 400 verified |
| Customer order queries isolated by JWT | `PASS` | Query params ignored |
| Concurrency safety implemented | `PASS` | Atomic `$set` + status match |
| All tests, typecheck, lint, build pass | `PASS` | 106/106 tests passed |

---

## 24. Final Status

`PASS`

Phase 7 implementation, testing, and documentation are complete. Phase 8 was explicitly NOT started.
