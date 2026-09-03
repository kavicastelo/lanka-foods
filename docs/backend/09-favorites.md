# 09 — Favorites Service Specification

## 1. Overview & Architecture

Phase 9 implements the **Favorites Service** for LankaEats Finland.

```
Client (Customer / Public User)
   │
   │ 1. Submits Favorite Toggle / List Request
   ▼
GET /api/favorites | POST /api/favorites/toggle | POST /api/favorites/restaurants/:id | ...
   │
   │ 2. Authenticates Customer identity from session (request.user.id)
   ▼
Server Favorites Engine (backend/src/modules/favorites/favorite.service.ts)
   │
   ├── 3. Validates Target Existence (Restaurant / MenuItem in MongoDB)
   ├── 4. Ownership Enforcement (strictly derives userId from session)
   ├── 5. Application & Database Duplicate Prevention (unique indexes on userId + restaurantId / menuItemId)
   └── 6. Returns Populated Favorites DTO / Confirmation Status
```

---

## 2. Supported Favorite Target Types

1. **Restaurants**: Target type `'restaurant'`. Referenced via `restaurantId`.
2. **Menu Items**: Target type `'menu_item'`. Referenced via `menuItemId`.

---

## 3. API Endpoints

### 3.1 Get Customer Favorites
* **Method**: `GET`
* **Path**: `/api/favorites`
* **Auth**: Protected (`[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* **Success Response (200 OK)**:
  ```json
  {
    "restaurants": ["67be00000000000000000001"],
    "items": ["67be00000000000000000002"],
    "raw": [
      {
        "id": "67be88888888888888888888",
        "userId": "67be55555555555555555555",
        "targetType": "restaurant",
        "targetId": "67be00000000000000000001",
        "restaurantId": "67be00000000000000000001",
        "restaurant": {
          "id": "67be00000000000000000001",
          "name": "Nuwara Eliya Tea Garden",
          "slug": "nuwara-eliya-tea-garden",
          "coverImageUrl": "",
          "city": "Helsinki",
          "ratingAverage": 4.5,
          "reviewCount": 10
        },
        "createdAt": "2026-09-03T18:35:00.000Z"
      }
    ]
  }
  ```

### 3.2 Toggle Favorite State
* **Method**: `POST`
* **Path**: `/api/favorites/toggle`
* **Auth**: Protected (`[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* **Request Body**:
  ```json
  {
    "targetType": "restaurant",
    "targetId": "67be00000000000000000001"
  }
  ```

### 3.3 Check Favorite Status
* **Method**: `GET`
* **Path**: `/api/favorites/status`
* **Auth**: Protected (`[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* **Query Params**: `restaurantId` or `menuItemId`

### 3.4 Explicit Restaurant & Menu Item Favorite Operations
* `POST /api/favorites/restaurants/:restaurantId`
* `DELETE /api/favorites/restaurants/:restaurantId`
* `POST /api/favorites/menu-items/:menuItemId`
* `DELETE /api/favorites/menu-items/:menuItemId`

---

## 4. Database Indexes

- `favoriteSchema.index({ userId: 1, restaurantId: 1 }, { unique: true, partialFilterExpression: { restaurantId: { $type: 'objectId' } } })`
- `favoriteSchema.index({ userId: 1, menuItemId: 1 }, { unique: true, partialFilterExpression: { menuItemId: { $type: 'objectId' } } })`
- `favoriteSchema.index({ userId: 1 })`
