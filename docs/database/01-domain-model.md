# 01 — MongoDB Domain Model Specification

## 1. Executive Summary & Architecture

The database tier for **LankaEats Finland** is designed as a native **MongoDB** document model managed via **Mongoose ORM** (`^8.9.0`).

### Core Architectural Decisions:
1. **Document-Oriented Design**: Replaces the legacy relational Base44 schema with MongoDB document patterns. Entities with independent lifecycles (User, Restaurant, MenuItem, Order, Review) are modeled as distinct collections with ObjectId references, while transient order line items (`OrderItem`) are embedded directly inside `Order` documents.
2. **Integer Minor Unit Currency Representation**: All monetary figures (`price`, `subtotal`, `deliveryFee`, `serviceFee`, `total`, `minOrder`) are stored exclusively as integer minor units (cents / euro-cents).
   * Example: `€12.50` -> `1250` cents.
   * Eliminates floating-point rounding errors in database storage, calculations, and aggregations.
3. **Historical Order Snapshot Invariant**: `OrderItem` structures are embedded inside `Order` documents at placement time. Updating a `MenuItem` name or price in the catalog later has zero impact on historical order totals or line item descriptions.
4. **Collision-Safe Atomic Order Numbers**: Generated via an atomic sequence counter collection (`OrderCounter`) executing `findOneAndUpdate({ $inc: { seq: 1 } })`. Enforced by a MongoDB `orderNumber` unique index.

---

## 2. Text-Based Entity Relationship Map

```
[User]
  ├── (1 : 1) owns ───────────────► [Restaurant]
  │                                   ├── (1 : N) has ───► [MenuCategory]
  │                                   │                      │
  │                                   │                      └── (1 : N) has ──► [MenuItem]
  │                                   ├── (1 : N) receives ◄──┐                      ▲
  │                                   │                       │                      │
  │                                   └── (1 : N) receives ───┼──────────┐           │
  │                                                           │          │           │
  ├── (1 : N) places ────────────────────────────────────► [Order]        │           │
  │                                                           │          │           │
  │                                                           └── embeds ┴► [OrderItem]
  │                                                                                  │
  ├── (1 : N) writes ────────────────────────────────────► [Review] ─────────────────┤
  │                                                           (1 : 1 unique orderId) │
  │                                                                                  │
  ├── (1 : N) favorited ─────────────────────────────────► [Favorite] ───────────────┘
  │                                                           (unique per user + target)
  │
  └── (1 : N) submits ───────────────────────────────────► [RestaurantApplication]

[CommissionConfig] (Global Singleton, rate 0-50%)
[GlobalCategory]   (System-wide marketplace categories)
```

---

## 3. Detailed Collection Schemas

### 3.1 `users` Collection ([user.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/user.model.ts))
* **Purpose**: Stores customer, restaurant admin, and platform admin user accounts.
* **Fields**:
  * `_id`: `ObjectId` (Primary Key)
  * `email`: `String` (Required, unique, lowercase, trimmed, indexed)
  * `fullName`: `String` (Required, trimmed)
  * `phone`: `String` (Default `""`)
  * `role`: `String`, enum `["CUSTOMER", "RESTAURANT_ADMIN", "SUPER_ADMIN"]` (Default `"CUSTOMER"`, indexed)
  * `isActive`: `Boolean` (Default `true`)
  * `createdAt`, `updatedAt`: `Date` (Automated timestamps)
* **Indexes**: `email` (Unique).

### 3.2 `restaurants` Collection ([restaurant.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/restaurant.model.ts))
* **Purpose**: Stores multi-vendor food business profiles, operating state, fulfillment parameters, and ownership references.
* **Fields**:
  * `_id`: `ObjectId` (Primary Key)
  * `name`: `String` (Required, trimmed)
  * `slug`: `String` (Required, unique, lowercase, trimmed, indexed)
  * `ownerId`: `ObjectId`, ref `'User'` (Required, indexed)
  * `city`: `String` (Required, indexed)
  * `address`, `phone`, `email`, `coverImageUrl`, `logoText`, `description`: `String`
  * `cuisines`: `[String]` (e.g. `["Rice & Curry", "Kottu"]`)
  * `priceRange`: `String`, enum `["€", "€€", "€€€"]` (Default `"€€"`)
  * `prepTime`: `String` (Default `"20-30 min"`)
  * `minOrder`: `Number` (Required, in cents e.g., `1500` for €15.00)
  * `deliveryFee`: `Number` (Required, in cents e.g., `350` for €3.50)
  * `pickup`, `delivery`, `halal`, `catering`, `isOpen`: `Boolean`
  * `hours`: `String` (Default `"11:00 - 21:00"`)
  * `timeSlots`: `[String]` (Default `["11:00", "12:00", "17:00", "18:00", "19:00"]`)
  * `featured`: `Boolean` (Default `false`, indexed)
  * `status`: `String`, enum `["pending", "active", "suspended", "rejected", "changes_requested"]` (Default `"pending"`, indexed)
  * `commissionRate`: `Number` (Optional per-restaurant percentage override)
  * `createdAt`, `updatedAt`: `Date`
* **Indexes**: `slug` (Unique), `ownerId`, `status`, `city`, `(status, city)` compound.

### 3.3 `global_categories` Collection ([global-category.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/global-category.model.ts))
* **Purpose**: Marketplace-wide dish classifications (e.g. Rice & Curry, Kottu, Hoppers).
* **Fields**: `name`, `slug` (Unique), `imageUrl`, `sortOrder`, `isActive` (Indexed), `createdAt`, `updatedAt`.

### 3.4 `menu_categories` Collection ([menu-category.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/menu-category.model.ts))
* **Purpose**: Restaurant-specific menu section headers.
* **Fields**: `restaurantId` (Ref `'Restaurant'`), `name`, `sortOrder`, `createdAt`, `updatedAt`.
* **Compound Index**: `(restaurantId, name)` (Unique — prevents duplicate section headers within the same restaurant).

### 3.5 `menu_items` Collection ([menu-item.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/menu-item.model.ts))
* **Purpose**: Catalog of dishes offered by restaurants.
* **Fields**: `restaurantId` (Ref `'Restaurant'`), `categoryId` (Ref `'MenuCategory'`), `name`, `description`, `price` (Required, cents), `imageUrl`, `isVegetarian`, `isAvailable` (Indexed), `isPopular`, `sortOrder`, `createdAt`, `updatedAt`.
* **Indexes**: `restaurantId`, `categoryId`, `(restaurantId, isAvailable)` compound.

### 3.6 `orders` Collection ([order.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/order.model.ts))
* **Purpose**: Main order header and historical line item snapshots.
* **Fields**:
  * `orderNumber`: `String` (Required, unique e.g., `"LE-10001"`, indexed)
  * `restaurantId`: `ObjectId`, ref `'Restaurant'` (Required, indexed)
  * `customerId`: `ObjectId`, ref `'User'` (Required, indexed)
  * `customerName`, `customerPhone`, `customerEmail`: `String` (Customer contact snapshot)
  * `deliveryType`: `String`, enum `["pickup", "delivery"]`
  * `status`: `String`, enum `["received", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "rejected"]` (Default `"received"`, indexed)
  * `subtotal`, `deliveryFee`, `serviceFee`, `total`: `Number` (Monetary totals in cents)
  * `scheduledDate`, `scheduledTime`, `deliveryAddress`, `instructions`: `String`
  * `paymentMethod`: `String`, enum `["card", "mobile", "pickup"]`
  * `paymentStatus`: `String`, enum `["pending", "paid", "refunded", "failed"]`
  * `placedAt`: `Date` (Default `Date.now`)
  * `items`: `[OrderItemSchema]` (Embedded array, non-empty validation):
    * `menuItemId`: `ObjectId`, ref `'MenuItem'`
    * `nameSnapshot`: `String` (Historical item name)
    * `unitPrice`: `Number` (Historical unit price in cents)
    * `quantity`: `Number`
    * `subtotal`: `Number` (Historical line total in cents)
    * `instructions`: `String`
  * `createdAt`, `updatedAt`: `Date`
* **Indexes**: `orderNumber` (Unique), `customerId`, `restaurantId`, `(restaurantId, status)` compound, `(customerId, status)` compound.

### 3.7 `order_counters` Collection ([order-counter.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/order-counter.model.ts))
* **Purpose**: Atomic sequence counter for collision-free sequential order number generation.
* **Fields**: `_id`: `"order_number"`, `seq`: `Number` (Default `10000`).

### 3.8 `reviews` Collection ([review.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/review.model.ts))
* **Purpose**: Customer ratings and reviews for completed orders.
* **Fields**: `restaurantId` (Ref `'Restaurant'`), `orderId` (Ref `'Order'`, Unique), `authorId` (Ref `'User'`), `authorName`, `rating` (1-5), `foodRating` (1-5), `text`, `isVerified`, `createdAt`, `updatedAt`.
* **Indexes**: `orderId` (Unique — guarantees max 1 review per completed order), `restaurantId`, `authorId`.

### 3.9 `favorites` Collection ([favorite.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/favorite.model.ts))
* **Purpose**: User favorited restaurants or dishes.
* **Fields**: `userId` (Ref `'User'`), `restaurantId` (Ref `'Restaurant'`, optional), `menuItemId` (Ref `'MenuItem'`, optional), `createdAt`, `updatedAt`.
* **Indexes**: `(userId, restaurantId)` compound unique sparse, `(userId, menuItemId)` compound unique sparse.

### 3.10 `restaurant_applications` Collection ([restaurant-application.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/restaurant-application.model.ts))
* **Purpose**: Prospective partner onboarding applications.
* **Fields**: `applicantUserId` (Ref `'User'`), `businessName`, `ownerName`, `email`, `phone`, `city`, `address`, `businessType`, `cuisine`, `description`, `pickup`, `delivery`, `logoUrl`, `coverUrl`, `status` (`enum["pending", "changes_requested", "approved", "rejected"]`), `submittedDate`, `createdAt`, `updatedAt`.
* **Indexes**: `applicantUserId`, `(applicantUserId, status)` compound.

### 3.11 `commission_configs` Collection ([commission-config.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/commission-config.model.ts))
* **Purpose**: Platform default commission percentage configuration.
* **Fields**: `key` (Default `"default_config"`, Unique), `defaultRate` (0-50, default 10), `updatedBy` (Ref `'User'`), `updatedDate`, `createdAt`, `updatedAt`.

---

## 4. Monetary Representation Standard

Monetary values are converted using explicit helper functions in [src/utils/money.ts](file:///d:/talnova/lanka-foods/backend/src/utils/money.ts):
```typescript
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}
export function centsToEuros(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
```
* **Storage Invariant**: `1250` cents = `€12.50`.

---

## 5. Key Deviations from Legacy Base44 Entity Definitions

1. **Role Standardization**: Replaced Base44's string flags with explicit enum `["CUSTOMER", "RESTAURANT_ADMIN", "SUPER_ADMIN"]` on the User document.
2. **Embedded Order Items**: Converted relational `OrderItem` table into an embedded array `items` inside `Order` documents, ensuring price/name snapshotting.
3. **Atomic Order Numbers**: Replaced `orders.length + 1` calculation with atomic `OrderCounter` increments.
4. **Database-Enforced Uniqueness**: Replaced application-level duplicate checks with physical MongoDB unique indexes (`email`, `slug`, `orderNumber`, `orderId`, `(restaurantId, name)`).
