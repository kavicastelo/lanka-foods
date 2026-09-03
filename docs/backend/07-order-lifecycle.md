# 07 — Order Lifecycle & State Machine Service Specification

## 1. Overview & Architecture

Phase 7 implements the **Server-Authoritative Order Lifecycle & State Machine Service** for LankaEats Finland.

```
                               ┌───────────────┐
                               │   received    │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │   accepted    │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │   preparing   │
                               └───────┬───────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │     ready     │
                               └───────┬───────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │ (delivery)                          │ (pickup)
                    ▼                                     ▼
           ┌──────────────────┐                  ┌──────────────────┐
           │ out_for_delivery │                  │    completed     │
           └────────┬─────────┘                  └──────────────────┘
                    │
                    ▼
           ┌──────────────────┐
           │    completed     │
           └──────────────────┘
```

---

## 2. Allowed Lifecycle Transitions

### 2.1 Pickup Orders (`deliveryType === 'pickup'`)
- `received` -> `accepted` | `rejected` | `cancelled`
- `accepted` -> `preparing` | `cancelled`
- `preparing` -> `ready`
- `ready` -> `completed`
- `completed` -> (TERMINAL STATE)

### 2.2 Delivery Orders (`deliveryType === 'delivery'`)
- `received` -> `accepted` | `rejected` | `cancelled`
- `accepted` -> `preparing` | `cancelled`
- `preparing` -> `ready`
- `ready` -> `out_for_delivery`
- `out_for_delivery` -> `completed`
- `completed` -> (TERMINAL STATE)

---

## 3. Authorization Matrix

| Actor | Action | Endpoint | Scope / Boundaries |
|---|---|---|---|
| `CUSTOMER` | Read Own Orders | `GET /api/orders/my-orders` | Filtered strictly by JWT `request.user.id`. Query parameter spoofing ignored. |
| `CUSTOMER` | Read Order Detail | `GET /api/orders/:id` | Allowed ONLY if `order.customerId === user.id`. Otherwise returns `404 NOT_FOUND`. |
| `CUSTOMER` | Update Status | `PATCH /api/orders/:id/status` | **BLOCKED (403 FORBIDDEN)**. Customers cannot transition order status. |
| `RESTAURANT_ADMIN` | Read Restaurant Orders | `GET /api/restaurant/orders` | Resolved via `Restaurant.findOne({ ownerId: user.id })`. |
| `RESTAURANT_ADMIN` | Update Order Status | `PATCH /api/orders/:id/status` | Allowed ONLY for owned restaurant. Subject to State Machine validation. |
| `SUPER_ADMIN` | Read / Update Any Order | All endpoints | Can manage any order, BUT MUST OBEY STATE MACHINE TRANSITION RULES. |

---

## 4. Status History Audit Trail

All status updates push an entry to `statusHistory`:
```json
{
  "status": "accepted",
  "changedAt": "2026-09-03T18:15:00.000Z",
  "changedBy": "67be1234567890abcdef1234"
}
```

---

## 5. Concurrency Strategy

Status updates execute using atomic MongoDB update operators:
`Order.findOneAndUpdate({ _id: id, status: currentStatus }, { $set: { status: nextStatus }, $push: { statusHistory: ... } })`

If the order status changed concurrently, `findOneAndUpdate` returns `null` and the server rejects the request with HTTP `409 CONFLICT`.
