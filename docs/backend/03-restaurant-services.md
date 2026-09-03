# 03 — Restaurant & Global Category Services Specification

## 1. Overview & Architecture

Phase 4 establishes the **Restaurant Discovery, Storefront, Owner Management, and Global Category Services** for LankaEats Finland.

```
Client (React SPA / API Client)
   │
   ├── Public APIs (Discovery & Storefront)
   │     ├── GET /api/restaurants (Paginated listing & filters)
   │     ├── GET /api/restaurants/:slug (Storefront details)
   │     └── GET /api/categories (Global cuisine categories)
   │
   ├── Owner APIs (Requires Bearer JWT + RESTAURANT_ADMIN role)
   │     ├── GET /api/restaurant/me (Server-authoritative owner restaurant)
   │     └── PATCH /api/restaurant/settings (Mass-assignment safe owner updates)
   │
   └── Admin APIs (Requires Bearer JWT + SUPER_ADMIN role)
         ├── POST /api/admin/categories (Create category)
         ├── PATCH /api/admin/categories/:id (Update category)
         └── DELETE /api/admin/categories/:id (Soft-deactivate category)
```

---

## 2. Authorization & Ownership Enforcement Matrix

| Action | Public | CUSTOMER | RESTAURANT_ADMIN | SUPER_ADMIN | Security Checks |
|---|---|---|---|---|---|
| Browse Active Restaurants (`GET /api/restaurants`) | `YES` | `YES` | `YES` | `YES` | Excludes internal fields (`ownerId`, `commissionRate`) |
| View Storefront (`GET /api/restaurants/:slug`) | `YES` | `YES` | `YES` | `YES` | 404 for pending/suspended/nonexistent |
| View Active Categories (`GET /api/categories`) | `YES` | `YES` | `YES` | `YES` | Sorted by `sortOrder` |
| View Own Restaurant (`GET /api/restaurant/me`) | `NO` | `NO` | `OWN ONLY` | `YES` | Server lookup: `Restaurant.findOne({ ownerId: request.user.id })` |
| Update Settings (`PATCH /api/restaurant/settings`) | `NO` | `NO` | `OWN ONLY` | `YES` | Server-side allowlist; mass assignment of `ownerId`/`status`/`commissionRate` blocked |
| Category Management (`POST/PATCH/DELETE /api/admin/categories`) | `NO` | `NO` | `NO` | `YES` | Role-gated via `authorize(['SUPER_ADMIN'])` |

---

## 3. Server-Authoritative Ownership Model

1. **Identity Resolution**: Owner APIs (`GET /api/restaurant/me`, `PATCH /api/restaurant/settings`) ignore client-supplied `?ownerId=` or body `ownerId` inputs. The backend queries MongoDB strictly using `request.user.id` extracted from the cryptographically verified JWT token.
2. **Cross-Restaurant Attack Defense**: User A authenticated as a RESTAURANT_ADMIN cannot view or mutate Restaurant B owned by User B.
3. **Mass Assignment Protection**: Updates via `PATCH /api/restaurant/settings` apply only allowlisted fields (`name`, `description`, `phone`, `email`, `address`, `city`, `prepTime`, `minOrder`, `deliveryFee`, `pickup`, `delivery`, `halal`, `catering`, `isOpen`, `hours`, `timeSlots`, `cuisines`, `priceRange`, `coverImageUrl`, `logoText`). Protected fields (`ownerId`, `status`, `commissionRate`, `featured`, `_id`) are stripped before saving to MongoDB.

---

## 4. Query Security & DoS Defenses

* **Regex Escaping**: User search input (`search`, `city`, `cuisine`) is sanitized via `escapeRegex()` before constructing MongoDB regex queries, preventing Regular Expression Denial of Service (ReDoS) and regex injection.
* **Pagination Bounds**: Query `limit` is capped at a maximum of 50 per request to prevent memory exhaustion and uncontrolled database queries.
* **Sorting Allowlist**: Sorting is limited strictly to pre-approved fields (`name`, `createdAt`, `minOrder`, `deliveryFee`).
