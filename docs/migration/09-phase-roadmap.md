# 09 — Migration Phase Roadmap

This document outlines the recommended implementation order for completely decoupling the application from Base44 and establishing an independent Node.js + TypeScript + MongoDB + Cloudflare R2 architecture.

---

## Active MVP Migration Sequence

```
Phase 1  — Backend Foundation & Infrastructure Setup
  ↓
Phase 2  — MongoDB Schemas & Mongoose Models
  ↓
Phase 3  — Independent Authentication & RBAC Engine
  ↓
Phase 4  — Restaurant & Global Category Services
  ↓
Phase 5  — Menu Management & Catalog Services
  ↓
Phase 6  — Ordering Engine & Calculation Validation
  ↓
Phase 7  — Order Lifecycle & State Machine Service
  ↓
Phase 8  — Customer Reviews & Rating Verification System
  ↓
Phase 9  — Favorites Service
  ↓
Phase 10 — Restaurant Partner Application & Approval Workflow
  ↓
Phase 11 — Commission Calculation & Settlement Engine
  ↓
Phase 12 — Dashboard Metrics & Analytics Aggregations
  ↓
Phase 13 — Media Storage Migration (Cloudflare R2)
  ↓
Phase 14 — Frontend API Client Replacement & Decoupling
  ↓
Phase 15 — End-to-End Integration & Security Hardening
  ↓
Phase 16 — Build Optimization, Linting & Type Cleanup
  ↓
Phase 17 — Independent Production Deployment & Base44 Removal
```

---

## Deferred: Online Payment Gateway (POST-MVP)

Online payment processing (Stripe / Paytrail / MobilePay) is intentionally excluded from the initial MVP.

Customers and restaurant owners will use their agreed/manual transaction method.

The platform will initially manage:
- order records & calculations
- payment method/status metadata where required
- restaurant subscriptions manually
- platform commission calculations manually

No Stripe, Paytrail, MobilePay API, payment intents, gateway webhooks, or automated payment processing will be implemented during the MVP migration.

Online payment integration is a future post-MVP phase.

When implemented later, it should be treated as a separate architecture phase rather than retroactively changing the MVP phases.

---

## Phase Details

### Phase 1: Backend Foundation & Infrastructure Setup
* **Objective**: Create independent Node.js + Fastify + TypeScript project.
* **Dependencies**: None.
* **Scope**: Project structure, environment validation (Zod), Pino logger, centralized error handler, CORS, Helmet, health endpoints (`GET /health`, `GET /health/ready`).

### Phase 2: MongoDB Schemas & Mongoose Models
* **Objective**: Reconstruct real domain models from legacy code.
* **Dependencies**: Phase 1.
* **Scope**: Mongoose schemas for `User`, `Restaurant`, `MenuCategory`, `MenuItem`, `Order`, `OrderCounter`, `Review`, `Favorite`, `Application`, `CommissionLog`. All monetary values in integer cents. Indexes added for queries.

### Phase 3: Independent Authentication & RBAC Engine
* **Objective**: Implement server-managed JWT authentication & role-based access control.
* **Dependencies**: Phase 2.
* **Scope**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Password hashing with bcrypt, JWT cookies/headers, RBAC roles (`CUSTOMER`, `RESTAURANT_ADMIN`, `SUPER_ADMIN`).

### Phase 4: Restaurant & Global Category Services
* **Objective**: Implement restaurant discovery and administrative controls.
* **Dependencies**: Phase 3.
* **Scope**: `GET /api/restaurants`, `GET /api/restaurants/:slug`, `GET /api/restaurant/me`, `PATCH /api/restaurant/settings`, `GET /api/categories`, `POST/PATCH/DELETE /api/admin/categories`.

### Phase 5: Menu Management & Catalog Services
* **Objective**: Implement menu item and category CRUD with public catalog.
* **Dependencies**: Phase 4.
* **Scope**: `GET /api/restaurants/:slug/menu` (public available items), `GET/POST/PATCH/DELETE /api/restaurant/menu-categories`, `GET/POST/PATCH/DELETE /api/restaurant/menu-items`.

### Phase 6: Ordering Engine & Calculation Validation
* **Objective**: Build server-authoritative order placement.
* **Dependencies**: Phase 5.
* **Scope**: `POST /api/orders`: Server-side price lookup, integer-cent calculations, minimum order validation, fulfillment checks, historical item snapshots, atomic order number generation (`LE-10001`).

### Phase 7: Order Lifecycle & State Machine
* **Objective**: Build order status updates and customer tracking.
* **Dependencies**: Phase 6.
* **Scope**: State machine transition validation (`received` → `accepted` → `preparing` → `ready` → `out_for_delivery` → `completed`), `PATCH /api/orders/:id/status`, `GET /api/orders/my-orders`, `GET /api/orders/:id`, `GET /api/restaurant/orders`.

### Phase 8: Customer Reviews & Rating Verification System
* **Objective**: Implement verified order reviews and rating aggregation.
* **Dependencies**: Phase 7.
* **Scope**: `POST /api/reviews`: Ensure caller owns completed order, enforce 1 review per order via database unique index, calculate aggregate ratings on `Restaurant`, public `GET /api/restaurants/:identifier/reviews`, customer `GET /api/reviews/my-reviews`.

### Phase 9: Favorites Service
* **Objective**: Implement customer favorites.
* **Dependencies**: Phase 4 & 5.
* **Scope**: `GET /api/favorites`, `POST /api/favorites/toggle`.

### Phase 10: Restaurant Application Workflow — ACTIVE / COMPLETED
* **Objective**: Implement partner onboarding and admin approval.
* **Dependencies**: Phase 3 & 4.
* **Scope**: `POST /api/partner/apply`, `GET /api/admin/applications`, `POST /api/admin/applications/:id/approve` (creates `Restaurant` and links `ownerId`), `POST /api/admin/applications/:id/reject`.

### Phase 11: Commission & Financial System — ACTIVE / COMPLETED
* **Objective**: Implement commission tracking.
* **Dependencies**: Phase 4 & 7.
* **Scope**: Default rate configuration, per-restaurant overrides, gross revenue vs platform fee calculations.

### Phase 12: Dashboard Metrics & Analytics — ACTIVE / COMPLETED
* **Objective**: Build aggregation endpoints for Admin and Restaurant dashboards.
* **Dependencies**: Phase 7, 8, 11.
* **Scope**: `GET /api/dashboard/metrics?scope=restaurant|admin`: MongoDB aggregation pipelines for monthly revenue, top-selling items, order status breakdown, review ratings.

### Phase 13: Media Storage Migration (Cloudflare R2) — ACTIVE / COMPLETED
* **Objective**: Replace Base44 CDN image URLs with Cloudflare R2 / S3 storage.
* **Dependencies**: None.
* **Scope**: Image upload endpoint (`POST /api/upload`), replace hardcoded `media.base44.com` links in static files.

### Phase 14: Frontend API Client Replacement — ACTIVE / COMPLETED
* **Objective**: Replace `@base44/sdk` in frontend with custom Axios API client.
* **Dependencies**: Phases 3-13.
* **Scope**: Rewrite `src/api/base44Client.js` to `src/api/apiClient.js`, update `useMarketplaceData.js` query & mutation functions to call Node REST API endpoints.

### Phase 15: End-to-End Integration & Verification — ACTIVE / COMPLETED
* **Objective**: Verify all user journeys end-to-end against the new Node backend.
* **Dependencies**: Phase 14.
* **Scope**: Customer browse, cart, checkout, order tracking, restaurant dashboard, admin dashboard.

### Phase 16: Build Optimization, Linting & Cleanup — ACTIVE / COMPLETED
* **Objective**: Fix static analysis errors and prune bloat.
* **Dependencies**: Phase 15.
* **Scope**: Fix TS prop types in `src/pages/*`, clean up ESLint unused imports, remove `@base44/*` packages, remove unused npm packages (`three`, `html2canvas`, `jspdf`, `moment`).

### Phase 17: Base44 Complete Removal & Production Launch — ACTIVE / COMPLETED
* **Objective**: Fully remove `@base44/vite-plugin` and `base44/` directory, deploy standalone app.
* **Dependencies**: Phase 16.
* **Scope**: Update `vite.config.js` to pure React configuration, deploy Node backend and React frontend to independent infrastructure.
