# Phase 3 — Independent Authentication & RBAC Engine Report

## 1. Objective

The objective of Phase 3 was to design, implement, and verify an independent, server-authoritative **Authentication and Role-Based Access Control (RBAC) Engine** for **LankaEats Finland**, completely eliminating runtime dependencies on `@base44/sdk` for user identity, token verification, and permission enforcement.

---

## 2. Starting State

Prior to Phase 3:
* The React frontend relied on `@base44/sdk` and `src/lib/AuthContext.jsx` for authentication and role detection.
* No server-side JWT verification, password hashing, user registration, or RBAC authorization middleware existed in the Node.js backend foundation.

---

## 3. Legacy Authentication Analysis

Analysis of legacy Base44 usage:
* **SDK Dependency**: Client called `base44.auth.me()` and `base44.auth.login()`.
* **Insecure Role Checks**: Role derivation occurred on the client (`src/lib/marketplaceAuth.js`), trusting local storage flags and SDK properties.
* **Backend Decoupling Goal**: Replace Base44 auth calls with REST endpoints (`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`) and Fastify middleware (`authenticate`, `authorize`).

---

## 4. Authentication Architecture

* **Framework Integration**: `@fastify/jwt` (`^8.0.1`) registered in [backend/src/app.ts](file:///d:/talnova/lanka-foods/backend/src/app.ts#L40).
* **Token Transport**: Standard HTTP `Authorization: Bearer <JWT_TOKEN>` header.
* **Token Duration**: Configured via `JWT_EXPIRES_IN` (default `7d`).
* **Request Context**: Context decorated with typed `request.user` containing `{ id, email, fullName, role, isActive }`.

---

## 5. Password Security

* **Hashing Algorithm**: `bcryptjs` with 10 salt rounds (`hashPassword()`).
* **Storage Invariant**: Plaintext passwords are never saved to MongoDB, printed to logs, or returned in API responses.
* **Mongoose Protection**: `passwordHash` field configured with `select: false` in [backend/src/models/user.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/user.model.ts#L45).

---

## 6. User Model Changes

Updated [backend/src/models/user.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/user.model.ts#L1):
* Added `passwordHash: { type: String, default: '', select: false }`.
* Added password hashing (`hashPassword`) and comparison (`comparePassword`) helper functions.

---

## 7. Registration Flow (`POST /api/auth/register`)

* **Input Validation**: Zod schema in [auth.schemas.ts](file:///d:/talnova/lanka-foods/backend/src/modules/auth/auth.schemas.ts).
* **Email Normalization**: Lowercased and trimmed (`input.email.toLowerCase().trim()`).
* **Public Role Enforcement**: Always assigns `role: "CUSTOMER"`. Ignores any client-supplied `role` field.
* **Duplicate Protection**: Returns `409 CONFLICT` if email is already registered.

---

## 8. Login Flow (`POST /api/auth/login`)

* **Credential Verification**: Uses `comparePassword` against `+passwordHash`.
* **Generic Error Response**: Returns generic `401 UNAUTHORIZED` (`"Invalid email or password."`) on credential failures to prevent account enumeration.
* **Disabled Account Check**: Returns `401 UNAUTHORIZED` (`"Account is disabled. Please contact support."`) if `user.isActive === false`.

---

## 9. JWT Design

* **Secret Management**: Configured via `JWT_SECRET` environment variable (validated via Zod).
* **Payload Structure**: `{ sub: string, role: UserRole, email: string }`.
* **Payload Security**: No password hashes, internal secrets, or sensitive metadata included in tokens.

---

## 10. Authentication Middleware

* **Location**: [backend/src/middleware/authenticate.ts](file:///d:/talnova/lanka-foods/backend/src/middleware/authenticate.ts#L1).
* **Validation Flow**:
  1. Extracts `Bearer` token from `Authorization` header.
  2. Verifies signature using `request.jwtVerify()`.
  3. Queries database for `User` document to verify account activity (`isActive === true`).
  4. Attaches `request.user` to Fastify request context.

---

## 11. RBAC Engine

* **Location**: [backend/src/middleware/authorize.ts](file:///d:/talnova/lanka-foods/backend/src/middleware/authorize.ts#L1).
* **Function**: Reusable preHandler hook factory accepting allowed role arrays (e.g. `authorize(['RESTAURANT_ADMIN', 'SUPER_ADMIN'])`).
* **Response**: Returns `403 FORBIDDEN` for authenticated users with insufficient permissions.

---

## 12. Account Status Handling

* Tested account deactivation (`isActive: false`). Disabled users cannot authenticate or access protected endpoints even with previously signed tokens.

---

## 13. Rate Limiting

* Registered `@fastify/rate-limit` in [backend/src/app.ts](file:///d:/talnova/lanka-foods/backend/src/app.ts#L46).
* Enforced per-route rate limits (10 req/min) on `/api/auth/register` and `/api/auth/login`.

---

## 14. Logging Security

* Sensitive headers (`authorization`, `cookie`, `x-access-token`, `password`, `secret`) are redacted automatically by Pino logger.

---

## 15. API Endpoints

* `POST /api/auth/register` (Public registration, rate-limited)
* `POST /api/auth/login` (Public login, rate-limited)
* `GET /api/auth/me` (Protected profile endpoint)
* `GET /api/test/customer`, `GET /api/test/restaurant-admin`, `GET /api/test/super-admin` (Minimal RBAC verification endpoints)

---

## 16. Test Strategy

Executed comprehensive integration and security test suite in [backend/tests/auth.test.ts](file:///d:/talnova/lanka-foods/backend/tests/auth.test.ts#L1) using `vitest` and `mongodb-memory-server`.

---

## 17. Test Results

Vitest execution summary:
```text
✓ tests/health.test.ts (6 tests)
✓ tests/database.test.ts (20 tests)
✓ tests/auth.test.ts (19 tests)

Test Files  3 passed (3)
     Tests  45 passed (45)
  Duration  12.16s
```

---

## 18. Adversarial Security Testing

1. **Privilege Escalation via Public Registration**: Attempted registering with `role: "SUPER_ADMIN"`. Server ignored requested role and created `CUSTOMER` account (**PASS**).
2. **Duplicate Email Registration**: Attempted registering duplicate email (`DUPLICATE@example.com` vs `duplicate@example.com`). Returned `409 CONFLICT` (**PASS**).
3. **Concurrent Registration Attack**: Executed 5 concurrent registration requests for same email. Exactly 1 succeeded, 4 failed cleanly (**PASS**).
4. **Invalid Credentials & Account Enumeration Prevention**: Attempted login with wrong password and unknown email. Both returned identical generic `401 UNAUTHORIZED` messages (**PASS**).
5. **Inactive User Authentication**: Attempted login for disabled user (`isActive: false`). Returned `401 UNAUTHORIZED` (**PASS**).
6. **Missing / Malformed / Expired Tokens**: Accessing `/api/auth/me` without header or with invalid token returned `401 UNAUTHORIZED` (**PASS**).
7. **Forged Signature Attack**: Accessing protected route using token signed with invalid secret returned `401 UNAUTHORIZED` (**PASS**).
8. **Horizontal Privilege Escalation Prevention**: User A called `/api/auth/me?userId=user_b_id`. Server returned User A profile derived strictly from verified JWT token (**PASS**).
9. **RBAC Permission Matrix**:
   * CUSTOMER accessing SUPER_ADMIN endpoint -> `403 FORBIDDEN` (**PASS**).
   * RESTAURANT_ADMIN accessing SUPER_ADMIN endpoint -> `403 FORBIDDEN` (**PASS**).
   * SUPER_ADMIN accessing SUPER_ADMIN endpoint -> `200 OK` (**PASS**).

---

## 19. Runtime Verification

* Launch compiled backend server (`node dist/server.js`). Verified auth routes and RBAC hooks initialize cleanly alongside database connection.

---

## 20. Failures

* None (0 backend failures).

---

## 21. Blocked Items

* None.

---

## 22. Deferred Work

* Restaurant & Menu REST APIs (Phases 4-5).
* Order Placement & Order State Machine (Phases 6-7).
* Reviews & Favorites REST APIs (Phases 8-9).
* Cloudflare R2 uploads (Phase 14).
* Frontend API decoupling from Base44 (Phases 15-18).

---

## 23. Acceptance Criteria

| Criteria | Result | Evidence |
|---|---|---|
| Password hashing implemented via bcryptjs | `PASS` | [user.model.ts](file:///d:/talnova/lanka-foods/backend/src/models/user.model.ts) (`hashPassword`, `comparePassword`) |
| Plaintext passwords never persisted or returned | `PASS` | Tested in `auth.test.ts` (`passwordHash` not equal to plaintext) |
| Registration endpoint implemented | `PASS` | `POST /api/auth/register` in [auth.routes.ts](file:///d:/talnova/lanka-foods/backend/src/modules/auth/auth.routes.ts) |
| Public registration defaults to CUSTOMER | `PASS` | Verified privilege escalation attempt was neutralized |
| Email normalization implemented | `PASS` | `toLowerCase().trim()` verified in registration & login |
| Duplicate email registration rejected safely | `PASS` | Returned `409 CONFLICT` |
| Login endpoint implemented | `PASS` | `POST /api/auth/login` in [auth.routes.ts](file:///d:/talnova/lanka-foods/backend/src/modules/auth/auth.routes.ts) |
| Generic invalid credential error returned | `PASS` | Generic 401 response prevents account enumeration |
| Inactive users cannot authenticate | `PASS` | Disabled accounts rejected at login & token validation |
| JWT signing & validation environment configured | `PASS` | `@fastify/jwt` using `JWT_SECRET` |
| Authentication middleware implemented | `PASS` | [authenticate.ts](file:///d:/talnova/lanka-foods/backend/src/middleware/authenticate.ts) decorates `request.user` |
| Forged/modified/invalid tokens rejected | `PASS` | Tested in `auth.test.ts` (returned 401) |
| `/api/auth/me` uses verified JWT identity | `PASS` | User impersonation parameter `?userId=` ignored |
| RBAC middleware & matrix verified | `PASS` | Tested CUSTOMER, RESTAURANT_ADMIN, SUPER_ADMIN permissions |
| Rate limiting implemented | `PASS` | `@fastify/rate-limit` registered |
| Backend typecheck, lint, build, tests pass | `PASS` | 45/45 tests passed, 0 typecheck/lint errors |

---

## 24. Final Status

`PASS`

All objectives and acceptance criteria for Phase 3 have been fully achieved and verified with extensive adversarial security testing.
