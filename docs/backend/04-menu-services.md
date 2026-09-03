# 04 — Menu Management & Catalog Services Specification

## 1. Overview & Architecture

Phase 5 establishes the **Public Restaurant Menu Catalog, Owner Menu Category Management, and Owner Menu Item Management Services** for LankaEats Finland.

```
Client (React SPA / API Client)
   │
   ├── Public APIs (No Auth Required)
   │     └── GET /api/restaurants/:slug/menu (Active catalog: categories + available items)
   │
   ├── Owner Menu Categories (Requires Bearer JWT + RESTAURANT_ADMIN)
   │     ├── GET /api/restaurant/menu-categories (List owner's categories)
   │     ├── POST /api/restaurant/menu-categories (Create category, name unique per restaurant)
   │     ├── PATCH /api/restaurant/menu-categories/:id (Update category name / sortOrder)
   │     └── DELETE /api/restaurant/menu-categories/:id (Delete category; blocked if items exist)
   │
   └── Owner Menu Items (Requires Bearer JWT + RESTAURANT_ADMIN)
         ├── GET /api/restaurant/menu-items (List owner's items including unavailable)
         ├── POST /api/restaurant/menu-items (Create item, validates category relationship & price)
         ├── PATCH /api/restaurant/menu-items/:id (Update item fields / availability)
         └── DELETE /api/restaurant/menu-items/:id (Delete menu item)
```

---

## 2. Ownership & Data Relationship Hierarchy

```
User (JWT Verified Identity)
   │
   └── Restaurant (ownerId === user.id)
         │
         ├── MenuCategory (restaurantId === restaurant.id)
         │
         └── MenuItem (restaurantId === restaurant.id & categoryId belongs to SAME restaurant)
```

---

## 3. Server-Authoritative Security & Validation Rules

1. **Server-Authoritative `restaurantId`**: Client attempts to pass `restaurantId` in request bodies or parameters are ignored. The backend resolves `restaurantId` strictly via `Restaurant.findOne({ ownerId: request.user.id })`.
2. **Cross-Restaurant Category Assignment Defense**: When creating or updating a `MenuItem`, the server verifies that `categoryId` exists AND belongs to the authenticated owner's restaurant (`category.restaurantId === restaurant._id`). Cross-restaurant category linking returns `400 BAD_REQUEST`.
3. **Cross-Restaurant Ownership Attack Defense**: Owner A attempting to modify or delete Category B or Item B belonging to Owner B returns `404 NOT_FOUND` or `403 FORBIDDEN`. Database state remains unchanged.
4. **Monetary Integer Cents Enforcement**: `price` MUST be a non-negative finite integer representing euro cents (`price >= 0`). Floats, NaN, negative values, and non-numeric inputs are rejected at schema validation.
5. **Category Deletion Protection**: Deleting a `MenuCategory` containing existing items is blocked with `400 BAD_REQUEST` (`"Cannot delete category containing existing menu items"`).
