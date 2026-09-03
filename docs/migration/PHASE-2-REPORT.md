# Phase 2 — MongoDB Domain Model & Mongoose Schemas Report

## 1. Objective

The objective of Phase 2 was to design, implement, and rigorously verify the real **MongoDB Domain Model & Mongoose Schemas** for **LankaEats Finland**.

Per Scope Control rules, Phase 2 focused exclusively on database architecture, structural validation, index constraints, monetary precision, historical order snapshotting, atomic sequence generation, connection management, and database integration testing. No Phase 3+ business logic (such as JWT authentication, REST API controllers, RBAC middleware, or payment gateways) was implemented.

---

## 2. Source Analysis

The MongoDB domain model was derived from a clean synthesis of:
1. Phase 0 audit reports (`docs/migration/03-current-data-model.md`, `04-business-rules.md`).
2. Phase 1 backend foundation code.
3. 11 legacy Base44 `.jsonc` entity schemas (`User`, `Restaurant`, `GlobalCategory`, `MenuCategory`, `MenuItem`, `Order`, `Review`, `Favorite`, `RestaurantApplication`, `CommissionConfig`).
4. 12 legacy Base44 Deno backend functions (`placeOrder`, `createReview`, `manageMenuItem`, `setCommissionRate`, etc.).
5. Actual React frontend UI component requirements.

---

## 3. Domain Decisions

1. **Document-Oriented Restructuring**: Converted relational Base44 tables into native MongoDB document schemas. Independent domain entities are referenced via `Schema.Types.ObjectId`, while transient order items (`OrderItem`) are embedded inside `Order` documents.
2. **Standardized Role Enums**: Replaced legacy boolean string flags with a typed Mongoose role enum (`"CUSTOMER"`, `"RESTAURANT_ADMIN"`, `"SUPER_ADMIN"`) on the `User` model.
3. **Physical Unique Index Enforcement**: Shifted duplicate prevention from fragile application-level code to physical MongoDB unique indexes (`email`, `slug`, `orderNumber`, `orderId`, `(restaurantId, name)`).

---

## 4. Collections Implemented

All Mongoose models created in [backend/src/models/](file:///d:/talnova/lanka-foods/backend/src/models/):

| Collection Name | Model Class | Primary Key | Key Fields & Types |
|---|---|---|---|
| `users` | `User` | `ObjectId` | `email` (unique), `fullName`, `phone`, `role` (enum), `isActive` |
| `restaurants` | `Restaurant` | `ObjectId` | `name`, `slug` (unique), `ownerId` (ref), `city`, `minOrder` (cents), `deliveryFee` (cents), `status` (enum), `commissionRate` |
| `global_categories` | `GlobalCategory` | `ObjectId` | `name`, `slug` (unique), `imageUrl`, `sortOrder`, `isActive` |
| `menu_categories` | `MenuCategory` | `ObjectId` | `restaurantId` (ref), `name`, `sortOrder` (Compound unique `restaurantId + name`) |
| `menu_items` | `MenuItem` | `ObjectId` | `restaurantId` (ref), `categoryId` (ref), `name`, `price` (cents), `isVegetarian`, `isAvailable` |
| `orders` | `Order` | `ObjectId` | `orderNumber` (unique), `restaurantId` (ref), `customerId` (ref), `status` (enum), `subtotal` (cents), `total` (cents), `items` (embedded `[OrderItemSchema]`) |
| `order_counters` | `OrderCounter` | `String` (`"order_number"`) | `seq` (Number sequence counter for atomic `LE-10001` generation) |
| `reviews` | `Review` | `ObjectId` | `restaurantId` (ref), `orderId` (ref unique), `authorId` (ref), `rating` (1-5), `text` |
| `favorites` | `Favorite` | `ObjectId` | `userId` (ref), `restaurantId` (ref sparse unique), `menuItemId` (ref sparse unique) |
| `restaurant_applications` | `RestaurantApplication` | `ObjectId` | `applicantUserId` (ref), `businessName`, `email`, `status` (enum) |
| `commission_configs` | `CommissionConfig` | `ObjectId` | `key` (`"default_config"` unique), `defaultRate` (0-50%), `updatedBy` (ref) |

---

## 5. Relationships

```
User (1) ──── (N) Restaurant [via ownerId]
Restaurant (1) ──── (N) MenuCategory [via restaurantId]
MenuCategory (1) ──── (N) MenuItem [via categoryId]
User (1) ──── (N) Order [via customerId]
Restaurant (1) ──── (N) Order [via restaurantId]
Order (1) ──── (1) Review [via orderId - Unique]
User (1) ──── (N) Favorite [via userId - Unique (userId + target)]
```

---

## 6. Money Representation

* **Standard**: Persisted exclusively as **integer minor units** (cents / euro-cents).
* **Example**: `€12.50` -> `1250` cents, `€0.99` -> `99` cents.
* **Utility Helpers**: [backend/src/utils/money.ts](file:///d:/talnova/lanka-foods/backend/src/utils/money.ts) provides `eurosToCents(euros)` and `centsToEuros(cents)`.
* **Verification**: `eurosToCents(12.5) === 1250` and `centsToEuros(1250) === 12.5` verified in unit and integration test suite.

---

## 7. Order Snapshot Design

* **Structure**: `OrderItemSchema` is embedded as an array `items` directly inside `Order` documents.
* **Snapshot Fields**: `menuItemId`, `nameSnapshot`, `unitPrice` (in cents), `quantity`, `subtotal` (in cents).
* **Invariant Verification**:
  1. Created `MenuItem` "Original Chicken Kottu" at €12.50 (1250 cents).
  2. Placed `Order` referencing item.
  3. Mutated original `MenuItem` in database to "Updated Special Kottu" at €15.00 (1500 cents).
  4. Reloaded `Order` from database. Verified line item retained `"Original Chicken Kottu"` at `1250` cents.

---

## 8. Order Number Strategy

* **Mechanism**: Atomic sequence counter in `order_counters` collection via `OrderCounter.findOneAndUpdate({ _id: "order_number" }, { $inc: { seq: 1 } }, { upsert: true, new: true })`.
* **Format**: `"LE-10001"`, `"LE-10002"`, etc.
* **Uniqueness**: Enforced by physical database unique index `orderNumber: 1`. Tested under concurrent order generation.

---

## 9. Indexes

Verified physical creation in MongoDB via `collection.listIndexes()`:
* **User**: `email` (Unique).
* **Restaurant**: `slug` (Unique), `ownerId`, `status`, `city`, `(status, city)` compound.
* **GlobalCategory**: `slug` (Unique), `isActive`.
* **MenuCategory**: `restaurantId`, `(restaurantId, name)` compound unique.
* **MenuItem**: `restaurantId`, `categoryId`, `(restaurantId, isAvailable)` compound.
* **Order**: `orderNumber` (Unique), `customerId`, `restaurantId`, `(restaurantId, status)` compound, `(customerId, status)` compound.
* **Review**: `orderId` (Unique — guarantees 1 review per completed order), `restaurantId`, `authorId`.
* **Favorite**: `(userId, restaurantId)` compound unique sparse, `(userId, menuItemId)` compound unique sparse.
* **RestaurantApplication**: `applicantUserId`, `(applicantUserId, status)` compound.

---

## 10. Database Connection

Implemented connection management in [backend/src/infrastructure/database/index.ts](file:///d:/talnova/lanka-foods/backend/src/infrastructure/database/index.ts#L1):
* `connectDatabase(uri)` initializes Mongoose connection with auto-indexing enabled.
* `disconnectDatabase()` cleans up connections.
* `isDatabaseConnected()` returns current readiness state (`readyState === 1`).
* Environment configuration validated via Zod (`MONGODB_URI`).

---

## 11. Test Strategy

Testing executed against a real in-memory MongoDB database server using `mongodb-memory-server` and `vitest`.
* **Test File**: [backend/tests/database.test.ts](file:///d:/talnova/lanka-foods/backend/tests/database.test.ts)
* **Coverage**: Connection failures, schema validation, enum restrictions, monetary conversions, unique index collisions, OrderItem historical snapshots, concurrent order number generation, and `listIndexes()` physical index inspection.

---

## 12. Test Results

Vitest execution output:
```text
✓ tests/health.test.ts (6 tests) 47ms
✓ tests/database.test.ts (20 tests) 2971ms

Test Files  2 passed (2)
     Tests  26 passed (26)
  Duration  4.01s
```

---

## 13. Runtime Verification

* Connected to MongoDB Memory Server.
* Verified database readiness integrated into `GET /health/ready` (`{"status":"ready","initialized":true,"databaseConnected":true}`).
* Verified `GET /health` remains a fast liveness check.

---

## 14. Failures

* None on Phase 2 database model or backend infrastructure.

---

## 15. Blocked Items

* None.

---

## 16. Deferred Work

The following business systems remain deliberately deferred to future phases:
* JWT authentication & user authorization engine (Phase 3).
* Restaurant & Menu REST APIs (Phases 4-5).
* Order placement service & state machine (Phases 6-7).
* Review & Favorite REST APIs (Phases 8-9).
* Cloudflare R2 media uploads (Phase 14).
* Frontend API decoupling from Base44 (Phases 15-18).

---

## 17. Acceptance Criteria

| Criteria | Result | Evidence |
|---|---|---|
| MongoDB configuration exists | `PASS` | `MONGODB_URI` in [env.ts](file:///d:/talnova/lanka-foods/backend/src/config/env.ts) and [.env](file:///d:/talnova/lanka-foods/backend/.env) |
| Database connection & disconnect implemented | `PASS` | [database/index.ts](file:///d:/talnova/lanka-foods/backend/src/infrastructure/database/index.ts) (`connectDatabase`, `disconnectDatabase`) |
| User schema implemented | `PASS` | [user.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/user.model.ts) (`email` unique index, role enum) |
| Restaurant schema implemented | `PASS` | [restaurant.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/restaurant.model.ts) (`slug` unique index, minor unit fees) |
| GlobalCategory schema implemented | `PASS` | [global-category.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/global-category.model.ts) |
| MenuCategory schema implemented | `PASS` | [menu-category.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/menu-category.model.ts) (compound unique `restaurantId + name`) |
| MenuItem schema implemented | `PASS` | [menu-item.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/menu-item.model.ts) (price in cents) |
| Order schema & embedded OrderItem snapshot | `PASS` | [order.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/order.model.ts) (verified price snapshot immutability) |
| Review schema implemented | `PASS` | [review.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/review.model.ts) (`orderId` unique index) |
| Favorite schema implemented | `PASS` | [favorite.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/favorite.model.ts) (compound unique sparse indexes) |
| RestaurantApplication schema implemented | `PASS` | [restaurant-application.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/restaurant-application.model.ts) |
| CommissionConfig schema implemented | `PASS` | [commission-config.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/commission-config.model.ts) |
| Required enums & fields enforced | `PASS` | Verified via invalid enum & missing field tests |
| Monetary representation documented & enforced | `PASS` | Integer minor units (cents) verified in [money.ts](file:///d:/talnova/lanka-foods/backend/src/utils/money.ts) |
| Historical order snapshot behavior verified | `PASS` | Verified in `database.test.ts` (MenuItem price mutation did not alter past order) |
| Order number uniqueness verified | `PASS` | Atomic sequence counter `OrderCounter` + unique index tested |
| Physical indexes verified in MongoDB | `PASS` | `listIndexes()` verified physical creation in MongoDB Memory Server |
| Database integration tests pass | `PASS` | 20/20 database integration tests passed |
| `/health/ready` reflects DB readiness | `PASS` | Verified `databaseConnected` status |
| Backend typecheck & lint pass | `PASS` | `npm run backend:typecheck` & `backend:lint` passed with 0 errors |
| Backend build succeeds | `PASS` | `npm run backend:build` compiled cleanly to `backend/dist/` |

---

## 18. Final Status

`PASS`

All database domain modeling objectives, Mongoose schema constraints, index definitions, snapshot invariants, and automated test requirements for Phase 2 have been fully implemented and verified against an active MongoDB engine.
