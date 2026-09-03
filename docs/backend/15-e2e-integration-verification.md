# 15 — End-to-End Integration & System Verification Specification

## 1. Integrated System Architecture

Phase 15 verifies the full end-to-end integration across all system layers following the migration away from Base44:

```
                    ┌─────────────────────┐
                    │      Frontend       │
                    │ Customer/Admin UI   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Frontend API Client│
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Node.js / Fastify   │
                    │       API           │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │   Domain   │   │    Auth    │   │   Media    │
       │  Services  │   │   / RBAC   │   │  Service   │
       └──────┬─────┘   └────────────┘   └─────┬──────┘
              │                                │
              ▼                                ▼
       ┌────────────┐                    ┌────────────┐
       │  MongoDB   │                    │ Cloudflare │
       │  Authority │                    │     R2     │
       └────────────┘                    └────────────┘
```

---

## 2. Server Authority Matrix

1. **Identity & Authentication**: Session identity derived strictly from server-signed JWT tokens (`/api/auth/me`).
2. **Authorization & RBAC**: Access permissions (`CUSTOMER`, `RESTAURANT_ADMIN`, `SUPER_ADMIN`) enforced server-side.
3. **Prices & Cart Totals**: Item prices, subtotals, delivery fees, and order totals calculated authoritatively by backend (`POST /api/orders`).
4. **Order State Machine**: State transitions (`received` → `accepted` → `preparing` → `ready` → `out_for_delivery` / `completed`) guarded by Phase 7 state machine.
5. **Commission & Financial Records**: Verified order completions automatically calculate platform fees and generate financial records (`FinancialRecord`).
6. **Review Verification**: Review verification (`isVerified`) derived from completed customer order history.
7. **Supplier Onboarding**: Partner application approvals promote user roles and instantiate active restaurants atomically.
8. **Media Infrastructure**: Presigned R2 upload URLs issued with server-controlled object key names and size/MIME validation.

---

## 3. Integrated Test Suite (`backend/tests/e2e-integration.test.ts`)

The end-to-end integration suite executes 16 comprehensive integration scenarios verifying:

- **System Health & Infrastructure**: `GET /health` and `GET /health/ready` confirming MongoDB connectivity.
- **Customer Journey**: Browse active restaurants → View public menu catalog → Create order → Track order status → Save favorites.
- **Order Lifecycle & Financials**: `accepted` → `preparing` → `ready` → `out_for_delivery` → `completed` → Financial record generation → Customer review submission → Super admin manual settlement.
- **Supplier Onboarding**: Partner application submission → Super Admin review → Approval → Role promotion to `RESTAURANT_ADMIN` & restaurant activation.
- **Analytics & Dashboards**: Platform-wide metrics and scoped restaurant metrics derived from real domain records.
- **Security & IDOR Defense**: Cross-tenant restaurant update rejection (403), cross-tenant order status tampering rejection (403), and unauthenticated/unauthorized metric request rejection (403).

---

## 4. Payment Gateway Status

Automated payment gateway integration remains: **DEFERRED / POST-MVP**. All MVP financial settlements and customer transactions follow manual off-platform workflows.
