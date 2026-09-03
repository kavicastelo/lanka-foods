# 03 — Current Data Model & MongoDB Migration Proposal

## 1. Text-Based Entity Relationship Diagram

```
[User]
  │
  ├── (1 : 1 optional) ── owns ───────────────────────► [Restaurant]
  │                                                         │
  ├── (1 : N) ────────── creates ──► [Order]                ├── (1 : N) ── has ────► [MenuCategory]
  │                                    │                    │                          │
  │                                    └── (1 : N) ── contains ──► [OrderItem]        └── (1 : N) ── has ──► [MenuItem]
  │                                                                                    ▲                      │
  ├── (1 : N) ────────── submits ──► [Review] ─────────────────────────────────────────┤                      │
  │                                    │                                               │                      │
  │                                    └────── (linked to completed order) ────────────┘                      │
  │                                                                                                           │
  ├── (1 : N) ────────── creates ──► [Favorite] ──────────────────────────────────────────────────────────────┘
  │                                                                 (references Restaurant OR MenuItem)
  │
  └── (1 : N) ────────── submits ──► [RestaurantApplication]

[CommissionConfig] (Global Singleton, rate 0-50%)
[GlobalCategory]   (System-wide food categories)
```

---

## 2. Base44 Entity Schemas (Source of Truth: `base44/entities/*.jsonc`)

### 2.1 User Entity ([User.jsonc](file:///d:/talnova/lanka-foods/base44/entities/User.jsonc))
* **Fields**:
  * `id`: `string` (Base44 generated user ID)
  * `email`: `string` (Auth identity)
  * `role`: `enum["admin", "user"]` (Required. Platform role: `admin` maps to SUPER_ADMIN)
  * `full_name`: `string` (Stored in auth metadata)
  * `phone`: `string` (Optional contact number)
  * `restaurant_id`: `string` (Optional. Set upon restaurant application approval)
* **Access Rules**: Managed by Base44 Auth service.

### 2.2 Restaurant Entity ([Restaurant.jsonc](file:///d:/talnova/lanka-foods/base44/entities/Restaurant.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `name`: `string` (Required)
  * `slug`: `string` (Required, unique URL-safe string e.g. `galle-garden`)
  * `owner_id`: `string` (Required, references `User.id`)
  * `city`: `string` (Required)
  * `address`: `string` (Optional)
  * `phone`, `email`: `string` (Contact details)
  * `cover_image_url`, `logo_text`: `string` (Branding)
  * `description`: `string`
  * `cuisines`: `array[string]` (e.g. `["Rice & Curry", "Kottu"]`)
  * `price_range`: `string` (e.g. `€`, `€€`)
  * `prep_time`: `string` (e.g. `20-30 min`)
  * `min_order`: `number` (Minimum order in euros)
  * `delivery_fee`: `number` (Delivery fee in euros)
  * `pickup`, `delivery`, `halal`, `catering`, `is_open`, `featured`: `boolean`
  * `hours`: `string` (Opening hours description)
  * `time_slots`: `array[string]` (Available order slots e.g. `["11:00", "12:00"]`)
  * `status`: `enum["pending", "active", "suspended", "rejected", "changes_requested"]` (Required)
  * `commission_rate`: `number` (Optional per-restaurant rate override)

### 2.3 MenuItem Entity ([MenuItem.jsonc](file:///d:/talnova/lanka-foods/base44/entities/MenuItem.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `restaurant_id`: `string` (Required, references `Restaurant.id`)
  * `category_id`: `string` (Required, references `MenuCategory.id`)
  * `name`: `string` (Required)
  * `description`: `string`
  * `price`: `number` (Required, in euros)
  * `image_url`: `string`
  * `is_vegetarian`, `is_available`, `is_popular`: `boolean`
  * `sort_order`: `number`

### 2.4 MenuCategory Entity ([MenuCategory.jsonc](file:///d:/talnova/lanka-foods/base44/entities/MenuCategory.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `restaurant_id`: `string` (Required, references `Restaurant.id`)
  * `name`: `string` (Required, section title e.g. `Rice & Curry`)
  * `sort_order`: `number`

### 2.5 Order Entity ([Order.jsonc](file:///d:/talnova/lanka-foods/base44/entities/Order.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `order_number`: `string` (Required, e.g. `LE-10234`)
  * `restaurant_id`: `string` (Required, references `Restaurant.id`)
  * `customer_id`: `string` (Required, references `User.id`)
  * `customer_name`, `customer_phone`, `customer_email`: `string` (Denormalized snapshot)
  * `delivery_type`: `enum["pickup", "delivery"]` (Required)
  * `status`: `enum["received", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "rejected"]` (Required)
  * `subtotal`, `delivery_fee`, `service_fee`, `total`: `number` (Server-calculated monetary totals)
  * `scheduled_date`, `scheduled_time`, `delivery_address`, `instructions`: `string`
  * `payment_method`: `enum["card", "mobile", "pickup"]`
  * `payment_status`: `enum["pending", "paid", "refunded", "failed"]`
  * `placed_at`: `ISO date-time string`

### 2.6 OrderItem Entity ([OrderItem.jsonc](file:///d:/talnova/lanka-foods/base44/entities/OrderItem.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `order_id`: `string` (Required, references `Order.id`)
  * `menu_item_id`: `string` (Nullable reference to `MenuItem.id`)
  * `name`: `string` (Required, snapshot at order time)
  * `price`: `number` (Required, price snapshot at order time)
  * `quantity`: `number` (Required)
  * `instructions`: `string`
  * `customer_id`, `restaurant_id`: `string` (Denormalized references for RLS checks)

### 2.7 Review Entity ([Review.jsonc](file:///d:/talnova/lanka-foods/base44/entities/Review.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `restaurant_id`: `string` (Required, references `Restaurant.id`)
  * `order_id`: `string` (Required, unique reference to `Order.id`)
  * `author_id`: `string` (Required, references `User.id`)
  * `author_name`: `string` (Denormalized)
  * `rating`, `food_rating`: `number` (1 to 5)
  * `text`: `string`
  * `is_verified`: `boolean` (True if linked to a completed order)

### 2.8 Favorite Entity ([Favorite.jsonc](file:///d:/talnova/lanka-foods/base44/entities/Favorite.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `user_id`: `string` (Required, references `User.id`)
  * `restaurant_id`: `string` (Nullable reference to `Restaurant.id`)
  * `menu_item_id`: `string` (Nullable reference to `MenuItem.id`)

### 2.9 RestaurantApplication Entity ([RestaurantApplication.jsonc](file:///d:/talnova/lanka-foods/base44/entities/RestaurantApplication.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `business_name`, `owner_name`, `email`: `string` (Required)
  * `phone`, `city`, `address`, `business_type`, `cuisine`, `description`: `string`
  * `pickup`, `delivery`: `boolean`
  * `logo_url`, `cover_url`: `string`
  * `status`: `enum["pending", "changes_requested", "approved", "rejected"]` (Required)
  * `submitted_date`: `ISO date string`
  * `applicant_user_id`: `string` (Required, references `User.id`)

### 2.10 CommissionConfig Entity ([CommissionConfig.jsonc](file:///d:/talnova/lanka-foods/base44/entities/CommissionConfig.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `default_rate`: `number` (Required, platform default commission e.g. 10)
  * `updated_by`: `string` (References `User.id`)
  * `updated_date`: `ISO date-time string`

### 2.11 GlobalCategory Entity ([GlobalCategory.jsonc](file:///d:/talnova/lanka-foods/base44/entities/GlobalCategory.jsonc))
* **Fields**:
  * `id`: `string` (Primary Key)
  * `name`: `string` (Required)
  * `slug`: `string` (Required)
  * `image_url`: `string`
  * `sort_order`: `number`
  * `is_active`: `boolean`

---

## 3. PROPOSED MongoDB Target Model (NOT IMPLEMENTED)

> `PROPOSED — NOT CURRENTLY IMPLEMENTED`

When migrating to Node.js + Mongoose, the normalized Base44 relational structures should be converted into document schemas:

1. **`users` Collection**: Stores user profile, password hash, role (`CUSTOMER`, `RESTAURANT_ADMIN`, `SUPER_ADMIN`), and optional `restaurantId` ObjectId.
2. **`restaurants` Collection**: Stores restaurant profile, status, operating hours, delivery options, time slots, and commission rate override.
3. **`menu_categories` Collection**: Stores menu section headers linked to `restaurantId`.
4. **`menu_items` Collection**: Stores dishes linked to `restaurantId` and `categoryId`.
5. **`orders` Collection**: Embeds `items` array directly (`[{ menuItemId, name, price, quantity, instructions }]`) rather than maintaining a separate `order_items` collection.
6. **`reviews` Collection**: Stores verified customer reviews with `orderId` unique index to enforce 1 review per completed order.
7. **`favorites` Collection**: Stores customer favorites indexed on `(userId, restaurantId)` and `(userId, menuItemId)`.
8. **`restaurant_applications` Collection**: Partner onboard applications.
9. **`commission_configs` Collection**: Platform-wide configuration singleton.
