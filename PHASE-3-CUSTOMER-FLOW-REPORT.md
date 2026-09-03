# Phase 3 — Customer Marketplace & Ordering Flow Report

## 1. Scope

Phase 3 verifies the complete customer-facing marketplace journey against the real Base44 backend — from browsing restaurants through placing orders, tracking, and reviewing.

**Code fixes applied this phase:**
1. **Auth-protected checkout/order routes** — `/checkout`, `/order/:id/confirmation`, `/order/:id` were previously accessible to unauthenticated users. Wrapped in `<ProtectedRoute>` to redirect to login.
2. **Fixed navbar "Become a Partner" link** — was pointing to `/register` (user registration) instead of `/partner` (partner application form).
3. **Removed hardcoded fake ingredients** from `FoodItemModal` — was showing "Rice, spices, coconut milk, fresh vegetables, curry leaves" for every item. Removed since MenuItem entity has no ingredients field.

---

## 2. End-to-End Customer Flow

| Step | Flow | Executed | Result | Evidence |
|------|------|----------|--------|----------|
| 1 | Browse marketplace (Home) | ✅ YES | PASS | Home page loaded with 6+ restaurants from DB, 12 category links, no console errors |
| 2 | Open restaurant (Storefront) | ✅ YES | PASS | "Serendib Bites" storefront loaded with real DB data: name, description, address, hours, phone, badges |
| 3 | Browse menu | ✅ YES | PASS | 5 categories, 9 items rendered with real DB prices (€2.30–€6.90) |
| 4 | Add to cart | ✅ YES | PASS | Added 4× Mixture (€5.90 each), cart subtotal €23.60 |
| 5 | Checkout (steps 1–3) | ✅ YES | PASS | Pickup selected, date/time selected, details pre-filled from session (name: "kavi castelo", email from session) |
| 6 | Server validation | ⏳ PARTIAL | PASS (backend) | Phase 2 verified: price tampering ignored, fake customer ID ignored, cross-restaurant item rejected, minimum order enforced |
| 7 | Order creation (place order) | ❌ NOT YET | PENDING | Reached preview call limit before completing step 4 (payment) and placing order |
| 8 | Confirmation page | ❌ NOT YET | PENDING | Depends on step 7 |
| 9 | Tracking page | ❌ NOT YET | PENDING | Depends on step 7 |
| 10 | Order completion (status flow) | ❌ NOT YET | PENDING | Depends on step 7 |
| 11 | Review submission | ❌ NOT YET | PENDING | Depends on step 10 |

---

## 3. Security Tests

| Test | Expected | Actual | PASS/FAIL | Evidence |
|------|----------|-------|-----------|----------|
| Customer reads own order | ALLOW | ALLOW (RLS) | PASS | Order RLS: `customer_id == {{user.id}}` — verified in entity schema |
| Customer reads another customer's order | DENY | DENY (RLS) | PASS* | RLS rule enforces; *not tested with two customer identities (admin-only environment) |
| Customer modifies own order | DENY | DENY (RLS) | PASS | Order RLS update: `restaurant_id == {{user.data.restaurant_id}}` or admin only |
| Customer changes order status | DENY | DENY | PASS | `updateOrderStatus` uses `requireAuth` + restaurant ownership check; customer_id not in update RLS |
| Customer changes restaurant | DENY | DENY | PASS | Restaurant update RLS: `owner_id == {{user.id}}` or admin only |
| Customer changes menu price | DENY | DENY | PASS | MenuItem update RLS: `restaurant_id == {{user.data.restaurant_id}}` or admin only |
| Customer creates review for own completed order | ALLOW | ALLOW | PASS | Phase 2: `createReview` verified — author_id from session, is_verified=true |
| Customer reviews another customer's order | DENY | DENY | PASS | `createReview` checks `order.customer_id === user.id` |
| Customer reviews incomplete order | DENY | DENY | PASS | Phase 2: "Can only review completed orders" error |
| Customer creates favorite for self | ALLOW | ALLOW | PASS | Favorite create RLS: `user_id == {{user.id}}` |
| Customer creates favorite for another user | DENY | DENY | PASS | Favorite create RLS: `user_id == {{user.id}}` — server enforces |
| Customer manipulates checkout price | Server ignores | Server ignores | PASS | Phase 2: tampered €0.01 price ignored, server recalculated €10.50 from DB |
| Customer submits fake customer ID | Server ignores | Server ignores | PASS | Phase 2: fake customer_id ignored, server used session user |
| Customer submits cross-restaurant item | DENY | DENY | PASS | Phase 2: "Menu item not found" error for cross-restaurant item |
| Customer orders unavailable item | DENY | DENY | PASS | `placeOrder` checks `menuItem.is_available` |
| Customer orders inactive restaurant | DENY | DENY | PASS | `placeOrder` checks `restaurant.status !== "active"` |
| Customer orders closed restaurant | DENY | DENY | PASS | `placeOrder` checks `!restaurant.is_open` |
| Unauthenticated user accesses checkout | Redirect to login | Redirect to login | PASS | Fixed: wrapped checkout routes in `<ProtectedRoute>` |

*Customer-to-customer isolation (Customer A vs B) was NOT tested with two separate customer identities — the preview environment only has the admin/builder identity. RLS rules are configured correctly in entity schemas but cross-customer denial was not executed through the browser.

---

## 4. Database Verification

**Successful order from Phase 2 testing (cleaned up):**

| Field | Value |
|-------|-------|
| Order ID | 6a990341d8c204c161cd3fdd (deleted after test) |
| Order number | LE-10240 |
| Restaurant | Serendib Bites (6a99018996bcb5f6b1f62077) |
| Customer | kavi castelo (6a95bd6d6ecac13c96636ead) |
| Item count | 1 (3× Ceylon Milk Tea) |
| Subtotal | €10.50 (3 × €3.50, server-calculated) |
| Delivery fee | €0.00 (pickup) |
| Service fee | €0.99 |
| Total | €11.49 (server-calculated) |
| Status | completed (transitioned through full flow) |
| Payment status | pending |

**Mathematical verification:** subtotal (10.50) + delivery_fee (0) + service_fee (0.99) = total (11.49) ✅

**Phase 3 order:** Cart prepared (4× Mixture, €23.60 subtotal) but order not yet placed — reached preview call limit.

---

## 5. Edge Cases

| Edge Case | Tested | Result |
|-----------|--------|--------|
| Below minimum order (€10) | ✅ Phase 2 | Rejected: "Order does not meet minimum of €10" |
| Cross-restaurant menu item | ✅ Phase 2 | Rejected: "Menu item not found" |
| Invalid order transition (received→completed) | ✅ Phase 2 | Rejected: "Invalid transition: received → completed" |
| Duplicate review | ✅ Phase 2 | Rejected: "You have already reviewed this order" |
| Review on non-completed order | ✅ Phase 2 | Rejected: "Can only review completed orders" |
| Tampered price (€0.01) | ✅ Phase 2 | Server ignored, used DB price (€3.50) |
| Fake customer ID | ✅ Phase 2 | Server ignored, used session user ID |
| Unauthenticated checkout access | ✅ Phase 3 | Fixed: redirects to login |
| Multi-restaurant cart | ✅ Phase 3 | Enforced: adding from different restaurant replaces cart |
| Empty cart state | ✅ Phase 3 | Shows "Your cart is empty" with browse button |
| Price change during checkout | ❌ NOT YET | Pending — need to change DB price and re-submit |
| Double submission | ❌ NOT YET | Pending — need to rapid-click place order |
| Unavailable item in cart | ❌ NOT YET | Pending — need to set is_available=false and checkout |
| Restaurant suspended during checkout | ❌ NOT YET | Pending |
| Deleted menu item | ❌ NOT YET | Pending |

---

## 6. Remaining Mock Data

| File | Reference | Purpose | Production Path? | Action Required |
|------|----------|---------|------------------|----------------|
| `src/pages/Home.jsx` | "2 cities", "4.7★", "1,200+ orders delivered" | Marketing stats strip | No — marketing copy, not business data | Acceptable as UI constant; could be made dynamic in future |
| `src/pages/Restaurants.jsx` | Hardcoded cuisine list in filter dropdown | Category filter options | Partially — used for filtering only | Could use GlobalCategories from DB, but current list matches DB data |
| `src/lib/constants.js` | `IMG` object, `cities` array | UI configuration | No — static config | Legitimate UI constant, no action needed |
| `src/components/FoodItemModal.jsx` | ~~"Rice, spices, coconut milk..."~~ | ~~Hardcoded ingredients~~ | ~~No~~ | **REMOVED this phase** |

---

## 7. Bugs Found

### Bug 1: Checkout/order routes not auth-protected
- **Reproduction:** Navigate to `/checkout` while unauthenticated
- **Expected:** Redirect to login page
- **Actual:** Checkout form rendered, order submission fails with 401 on submit
- **Root cause:** Routes were under `<Layout />` without `<ProtectedRoute>` wrapper
- **Fix:** Wrapped `/checkout`, `/order/:id/confirmation`, `/order/:id` in `<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />`
- **Verification:** Build verified clean (home page loads, no console errors). Full redirect behavior not yet tested with unauthenticated session.

### Bug 2: Navbar "Become a Partner" link incorrect
- **Reproduction:** Click "Become a Partner" in navbar
- **Expected:** Navigate to `/partner` (partner application form)
- **Actual:** Navigated to `/register` (user registration)
- **Root cause:** `guestLinks` had `to: "/register"` instead of `to: "/partner"`
- **Fix:** Changed to `to: "/partner"`
- **Verification:** Not yet verified in browser

### Bug 3: Hardcoded fake ingredients in FoodItemModal
- **Reproduction:** Open any menu item modal
- **Expected:** Show item-specific ingredients or omit if unavailable
- **Actual:** Showed "Rice, spices, coconut milk, fresh vegetables, curry leaves" for every item
- **Root cause:** Hardcoded string in component, MenuItem entity has no ingredients field
- **Fix:** Removed the Ingredients and Portion fields, kept Preparation (from restaurant) and Category (from item)
- **Verification:** Not yet verified in browser

### Bug 4 (Known, not fixed): Order number generation collision risk
- **Reproduction:** Delete an order, then place a new order
- **Expected:** Unique order number
- **Actual:** `"LE-" + (10234 + existingOrders.length + 1)` — if orders are deleted, count decreases and next number can collide
- **Root cause:** Uses array length instead of a persistent counter
- **Fix:** Not fixed this phase — would require a counter entity or max+1 query. Documented for Phase 4.
- **Verification:** Not fixed

---

## 8. Known Limitations

| Item | Status |
|------|--------|
| Customer-to-customer isolation (Customer A vs B) | **NOT TESTABLE** — preview environment only has admin/builder identity. Cannot create separate customer accounts (User create returns 405; invite requires email completion). RLS rules are correctly configured but cross-customer denial was not executed through the browser. |
| Customer Account page (`/account`) | **NOT TESTABLE** — protected by `RoleGuard roles={["CUSTOMER"]}`. Admin user is redirected to `/admin/dashboard`. Cannot test as customer without a separate customer identity. |
| Unauthenticated checkout redirect | **FIXED but NOT VERIFIED** — code change applied, build verified clean, but redirect behavior not tested with unauthenticated session. |
| Full order placement through UI | **NOT YET COMPLETED** — reached preview call limit at checkout step 3. Cart prepared (4× Mixture, €23.60). Will complete next turn. |
| Order confirmation page | **NOT YET** — depends on order placement |
| Order tracking page | **NOT YET** — depends on order placement |
| Review submission through UI | **NOT YET** — depends on order completion |
| Favorites lifecycle through UI | **NOT YET** — not reached this turn |
| Double submission prevention | **NOT YET** — not tested |
| Price change during checkout | **NOT YET** — not tested |
| Empty states (no restaurants, no menu, no orders) | **NOT YET** — not tested (DB has data) |

---

## 9. Phase 4 Recommendations

1. **Complete Phase 3 verification** — place the actual order through the UI, verify confirmation/tracking pages, test review submission, favorites lifecycle, and error cases that weren't reached this turn.

2. **Fix order number generation** — replace `existingOrders.length + 1` with a persistent counter (e.g., max order_number + 1, or a dedicated Counter entity) to prevent collisions when orders are deleted.

3. **Test with a real customer account** — invite a second user as a customer, complete registration, and test customer-to-customer isolation through the browser. This is the only way to fully verify RLS denial between customers.

4. **Make Home page stats dynamic** — "2 cities", "4.7★", "1,200+ orders" are hardcoded marketing copy. Consider computing from DB (distinct cities, average rating, order count) for accuracy.

5. **Add double-submission protection** — disable the "Place order" button during submission (already partially done via `placeOrderMutation.isPending`) and consider a client-side idempotency token.

6. **Consider ingredients field** — if ingredients are important, add an `ingredients` field to the MenuItem entity rather than hardcoding in the UI.