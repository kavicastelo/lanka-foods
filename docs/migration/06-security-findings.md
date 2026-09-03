# 06 — Security Findings & Vulnerability Audit

This document records all security risks, client-side trust issues, authorization bypasses, and data integrity vulnerabilities identified during the Phase 0 audit.

---

## 1. Vulnerability Summary & Severity Matrix

| Risk ID | Severity | Category | Affected File & Lines | Description | Impact |
|---|---|---|---|---|---|
| **SEC-01** | **P0** | Direct Entity Mutation | [RestaurantAdminDashboard.jsx:271](file:///d:/talnova/lanka-foods/src/pages/RestaurantAdminDashboard.jsx#L271) | Client-side code directly invokes `base44.entities.Restaurant.update(id, {...})` to modify restaurant parameters (delivery fee, min order, name, pickup/delivery status). | If Base44 RLS is misconfigured or bypassed, any user could modify any restaurant's parameters directly from the browser console. |
| **SEC-02** | **P0** | Direct Entity Deletion | [SuperAdminDashboard.jsx:366](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L366) | Client-side code directly calls `base44.entities.Review.delete(id)`. | Unprivileged users could trigger review deletion requests if client credentials allow entity deletion. |
| **SEC-03** | **P0** | Bypassed Backend Validation | [Register.jsx:72-87](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L72-L87) | When registering a restaurant on the signup form, `Register.jsx` directly calls `base44.entities.RestaurantApplication.create({...})` instead of invoking the `submitRestaurantApplication` backend function. | Bypasses backend duplicate application checks (`applicant_user_id` pending check in `submitRestaurantApplication/entry.ts:31-40`), allowing multiple pending applications. |
| **SEC-04** | **P1** | Secret & Token Storage | [app-params.js:23,30](file:///d:/talnova/lanka-foods/src/lib/app-params.js#L23), [AuthContext.jsx:42](file:///d:/talnova/lanka-foods/src/lib/AuthContext.jsx#L42) | Authentication access tokens are stored in unencrypted browser `localStorage` under `base44_access_token` and read from URL query parameters (`access_token`). | Susceptible to XSS token theft and URL referer token leakage. |
| **SEC-05** | **P1** | Client-Derived Role Trust | [marketplaceAuth.js:24-30](file:///d:/talnova/lanka-foods/src/lib/marketplaceAuth.js#L24-L30) | Marketplace role is derived on the client by checking `user.role === 'admin'` and `user.restaurant_id`. | Front-end UI visibility (dashboards, nav links) relies strictly on client-side state. Server MUST independently re-verify roles on every API call. |
| **SEC-06** | **P2** | Missing Payment Gateway Integration | [Checkout.jsx:153-162](file:///d:/talnova/lanka-foods/src/pages/Checkout.jsx#L153-L162), [placeOrder/entry.ts:133-134](file:///d:/talnova/lanka-foods/base44/functions/placeOrder/entry.ts#L133-L134) | Selection of "Card" or "Mobile payment" sets `payment_status: "pending"` without invoking any actual payment processor (Stripe/MobilePay). Orders complete automatically. | Business financial risk: Orders are processed as placed without actual funds transfer verification. |
| **SEC-07** | **P2** | Lack of Rate Limiting | [SignIn.jsx:17](file:///d:/talnova/lanka-foods/src/pages/SignIn.jsx#L17), [Register.jsx:23,37](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L23) | Login and registration forms make raw authentication requests without rate limiting, CAPTCHA, or lockout logic. | Vulnerable to automated credential stuffing and brute force attacks. |
| **SEC-08** | **P3** | Hardcoded Third-Party Asset Dependence | [constants.js:5-11](file:///d:/talnova/lanka-foods/src/lib/constants.js#L5-L11), [SignIn.jsx:33](file:///d:/talnova/lanka-foods/src/pages/SignIn.jsx#L33) | Image assets are served directly from external Base44 CDN (`media.base44.com`). | External domain dependency risk if Base44 infrastructure is decommissioned. |

---

## 2. Detail Analysis of Critical Security Risks

### 2.1 Direct Entity Mutation Bypasses (`SEC-01`, `SEC-02`, `SEC-03`)
In a secure architecture, the client should NEVER mutate database entities directly using SDK table references.
* **Current Behavior**:
  * [RestaurantAdminDashboard.jsx:271](file:///d:/talnova/lanka-foods/src/pages/RestaurantAdminDashboard.jsx#L271): `await base44.entities.Restaurant.update(restaurant.id, {...})`
  * [SuperAdminDashboard.jsx:366](file:///d:/talnova/lanka-foods/src/pages/SuperAdminDashboard.jsx#L366): `await base44.entities.Review.delete(id)`
  * [Register.jsx:72](file:///d:/talnova/lanka-foods/src/pages/Register.jsx#L72): `await base44.entities.RestaurantApplication.create({...})`
* **Remediation Requirement**: In the Node.js backend, all database collections MUST be private. The client must never make direct database calls. All mutations MUST pass through authenticated, validated REST routes (`PATCH /api/restaurant/profile`, `DELETE /api/admin/reviews/:id`, `POST /api/partner/apply`).

### 2.2 Payment Gateway Missing (`SEC-06`)
* **Current Behavior**: When a user selects payment method "Card" or "Mobile payment" in `Checkout.jsx:153-162`, the order status is marked as `received` and `payment_status` is set to `pending`. No payment gateway webhook or charging logic exists.
* **Remediation Requirement**: Phase 7/8 must integrate Stripe or Finnish banking gateways (e.g. Paytrail/MobilePay) and verify webhooks before transitioning orders to `accepted`.
