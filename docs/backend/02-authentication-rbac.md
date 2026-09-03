# 02 — Authentication & RBAC Engine Architecture Specification

## 1. Overview & Architecture

The **LankaEats Finland** backend implements a server-authoritative, stateless **JWT (JSON Web Token)** authentication system and a reusable **Role-Based Access Control (RBAC)** authorization engine built on Fastify and Mongoose.

```
Client (React SPA / mobile / API client)
   │
   │ 1. HTTP Request with `Authorization: Bearer <token>`
   ▼
Fastify Server Pipeline
   │
   │ 2. `@fastify/jwt` verifies signature & expiration
   ▼
[authenticate] Middleware Hook (src/middleware/authenticate.ts)
   │
   │ 3. Database user account lookup & active status verification
   ▼
Request Context (`request.user`)
   │
   │ 4. `request.user` decorated with { id, email, fullName, role, isActive }
   ▼
[authorize] PreHandler Hook (src/middleware/authorize.ts)
   │
   │ 5. Validates `request.user.role` against required route permissions
   ▼
Route Handler / Business Service
```

---

## 2. Server-Authoritative Identity Principle

**Crucial Security Invariant**: The server never trusts client-provided identity claims (such as `userId`, `customerId`, `role`, or `ownerId` in request bodies, query strings, or headers).
* Identity is derived **exclusively** from the cryptographically verified JWT payload (`sub` claim) and database user validation.
* Any client attempt to pass a `userId` query parameter or body property during authenticated operations (e.g. `GET /api/auth/me?userId=victim_id`) is ignored; the server responds with the authenticated token owner's identity.

---

## 3. Password Storage & Hashing Policy

* **Algorithm**: `bcryptjs` salted password hashing with 10 salt rounds (`hashPassword()`).
* **Storage Invariant**: Plaintext passwords are never persisted to MongoDB, printed to server logs, or returned in API responses.
* **Schema Security**: The `passwordHash` field on the `User` schema is configured with `select: false` so database queries omit hashes unless explicitly requested via `.select('+passwordHash')`.

---

## 4. Account Registration (`POST /api/auth/register`)

1. **Validation**: Enforces strict Zod schema validation ([auth.schemas.ts](file:///d:/talnova/lanka-foods/backend/src/modules/auth/auth.schemas.ts)) requiring valid email format, full name (≥ 2 chars), and password length (8–100 chars).
2. **Email Normalization**: Emails are automatically converted to lowercase and trimmed before uniqueness verification.
3. **Privilege Escalation Neutralization**: Public registration requests **always** assign the `CUSTOMER` role. Client attempts to pass `role: "SUPER_ADMIN"` or `role: "RESTAURANT_ADMIN"` in registration bodies are ignored.
4. **Duplicate Prevention**: Rejects duplicate email attempts with `409 CONFLICT` errors backed by MongoDB's `email` unique index.

---

## 5. Account Login (`POST /api/auth/login`)

1. **Email Normalization**: Normalizes login email input.
2. **Generic Error Response**: If the email is not found or the password comparison fails, the backend returns a generic `401 UNAUTHORIZED` error (`"Invalid email or password."`) to prevent account enumeration.
3. **Disabled Account Protection**: If `user.isActive === false`, authentication is rejected (`"Account is disabled. Please contact support."`) and no token is issued.
4. **JWT Generation**: Signs a JWT token containing `{ sub: user._id, role: user.role, email: user.email }` expiring in 7 days (configurable via `JWT_EXPIRES_IN`).

---

## 6. Current User Profile (`GET /api/auth/me`)

* **Protection**: Requires `authenticate` preHandler hook.
* **Response**: Returns current user profile without `passwordHash`.

---

## 7. Role-Based Access Control (RBAC) Matrix

Marketplace roles:
* `CUSTOMER`: Standard customer account (can browse, manage own cart, place orders, write reviews for completed orders).
* `RESTAURANT_ADMIN`: Partner restaurant operator (can manage assigned restaurant menu, view incoming orders, update order status).
* `SUPER_ADMIN`: Platform administrator (can approve/reject restaurant applications, adjust commission configurations, manage users).

### Authorization Middleware:
```typescript
// Reusable preHandler authorization hook
authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])
```

* **Missing Token**: Returns `401 UNAUTHORIZED`.
* **Insufficient Role**: Returns `403 FORBIDDEN` (`"Access denied. Insufficient permissions for this resource."`).

---

## 8. Rate Limiting & DoS Protection

* High-value authentication endpoints (`POST /api/auth/register`, `POST /api/auth/login`) are rate-limited via `@fastify/rate-limit` (10 requests per minute in production).
