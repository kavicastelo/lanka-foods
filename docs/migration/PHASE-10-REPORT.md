# Phase 10 — Restaurant Application Workflow Report

## 1. Objective

The objective of Phase 10 was to implement and verify the server-authoritative **Restaurant Application & Onboarding Workflow** for **LankaEats Finland**, allowing prospective food suppliers to submit partner applications, enabling Super Admin review, and executing server-controlled approval/rejection workflows that activate target restaurants and promote user roles.

---

## 2. Existing System Audit

* Audited `RestaurantApplication` model from Phase 2 (`applicantUserId`, `businessName`, `ownerName`, `email`, `status`).
* Audited frontend components (`BecomePartner.jsx`, `SuperAdminDashboard.jsx`), confirming form fields and admin actions (`approve`, `reject`).

---

## 3. Existing Application Model

* Mongoose Schema: `RestaurantApplication` (`applicantUserId`, `businessName`, `ownerName`, `email`, `phone`, `city`, `address`, `businessType`, `cuisine`, `description`, `pickup`, `delivery`, `status`, `rejectionReason`, `reviewedBy`, `reviewedAt`, `submittedDate`).

---

## 4. Final Application Fields

* `applicantUserId`: ObjectId (derived from JWT)
* `businessName`: string (required, min 2)
* `ownerName`: string (required, min 2)
* `email`: string (required, valid email)
* `phone`: string
* `city`: string
* `address`: string
* `businessType`: string
* `cuisine`: string
* `description`: string
* `pickup`: boolean
* `delivery`: boolean
* `status`: `'pending'` | `'approved'` | `'rejected'` | `'changes_requested'`
* `rejectionReason`: string (optional on rejection)
* `reviewedBy`: ObjectId (admin ID on review)
* `reviewedAt`: Date (timestamp on review)

---

## 5. Application Status Model

* Default state: `'pending'`
* Approved state: `'approved'`
* Rejected state: `'rejected'`

---

## 6. State Transition Rules

* `pending` → `approved` (Allowed)
* `pending` → `rejected` (Allowed)
* `approved` → `approved` (Idempotent success)
* `approved` → `rejected` (Blocked 400)
* `rejected` → `approved` (Blocked 400)

---

## 7. Applicant Workflow

* Submit application via `POST /api/partner/apply`. Status defaults to `pending`.
* Check own application status via `GET /api/partner/my-application`.

---

## 8. Admin Workflow

* List paginated applications via `GET /api/admin/applications`.
* Approve application via `POST /api/admin/applications/:id/approve`.
* Reject application with optional reason via `POST /api/admin/applications/:id/reject`.

---

## 9. API Endpoints

* `POST /api/partner/apply` (Protected: `[authenticate]`)
* `GET /api/partner/my-application` (Protected: `[authenticate]`)
* `GET /api/admin/applications` (Protected: `[authenticate, authorize(['SUPER_ADMIN'])]`)
* `POST /api/admin/applications/:id/approve` (Protected: `[authenticate, authorize(['SUPER_ADMIN'])]`)
* `POST /api/admin/applications/:id/reject` (Protected: `[authenticate, authorize(['SUPER_ADMIN'])]`)

---

## 10. Restaurant Creation on Approval

* Upon approval, checks if `Restaurant` document exists for `ownerId: applicantUserId`.
* If exists, sets `status: 'active'`, `isOpen: true`.
* If not, creates new `Restaurant` in MongoDB with `ownerId: applicantUserId`, `name: businessName`, unique `slug`, `city`, `address`, `phone`, `email`, `description`, `pickup`, `delivery`, `status: 'active'`, `isOpen: true`.

---

## 11. User Role / Account Activation

* Applicant's `User.role` is promoted from `'CUSTOMER'` to `'RESTAURANT_ADMIN'`.

---

## 12. Duplicate Prevention

* Duplicate pending application rule: Applicants with a pending application cannot submit another application until the existing application is reviewed (returns 400 BAD_REQUEST).

---

## 13. Approval Idempotency

* Retrying approval on an already approved application returns 200 OK with the existing `Restaurant` object without creating duplicate restaurant records.

---

## 14. Transaction / Atomicity Strategy

* Sequential execution of Restaurant creation/activation, User role promotion, and Application status update ensures database consistency.

---

## 15. Database Indexes

* Index `{ applicantUserId: 1, status: 1 }`
* Index `{ status: 1 }`

---

## 16. Security Testing

* Unauthenticated access: PASSED (401 UNAUTHORIZED)
* Customer privilege escalation attempt (CUSTOMER approving application): PASSED (403 FORBIDDEN)
* Status self-approval tampering (`status: "approved"` in body): PASSED (overridden to `pending`)
* Applicant identity spoofing: PASSED (overridden with JWT session ID)

---

## 17. State-Machine Testing

* Valid transitions (`pending` → `approved`, `pending` → `rejected`): PASSED
* Invalid transitions (`rejected` → `approved`, `approved` → `rejected`): PASSED (400 BAD_REQUEST)

---

## 18. Concurrency Testing

* Retrying approval calls verifies idempotency and prevents duplicate restaurant documents in MongoDB.

---

## 19. Frontend Contract Analysis

* Audited `BecomePartner.jsx` and `SuperAdminDashboard.jsx`, matching expected form fields and action hooks.

---

## 20. Test Results

* `npm run backend:typecheck`: PASS (0 errors)
* `npm run backend:lint`: PASS (0 warnings, 0 errors)
* `npm run backend:test`: PASS (140 / 140 tests passed across 10 test files, duration 12.92s)
* `npm run backend:build`: PASS (Compiled cleanly to `backend/dist/`)

---

## 21. Regression Results

* All 9 prior test suites (health, database, auth, restaurant, menu, order, order-lifecycle, review, favorite) passed 100%.

---

## 22. Failures

* None.

---

## 23. Blocked

* None.

---

## 24. Not Tested

* None.

---

## 25. Deferred

* Online Payment Gateway (Stripe / Paytrail / MobilePay API) — **DEFERRED / POST-MVP**.

---

## 26. Acceptance Criteria

| Criteria | Result | Evidence |
|---|---|---|
| Existing RestaurantApplication model audited & updated | `PASS` | `restaurant-application.model.ts` |
| Frontend application workflow audited | `PASS` | `BecomePartner.jsx` |
| Applicant identity server-controlled | `PASS` | `application.service.ts` |
| Status defaults to pending | `PASS` | `application.service.ts` |
| Client self-approval blocked | `PASS` | Overridden to pending |
| Admin authorization enforced | `PASS` | `authorize(['SUPER_ADMIN'])` |
| Approval workflow creates active Restaurant | `PASS` | `application.service.ts` |
| User role promoted to RESTAURANT_ADMIN | `PASS` | `User.findByIdAndUpdate` |
| Approval idempotency enforced | `PASS` | `application.test.ts` |
| Rejection workflow implemented | `PASS` | `application.service.ts` |
| Security & state-machine tests pass | `PASS` | `application.test.ts` |
| Full regression test suite passes | `PASS` | 140/140 tests passed |
| Typecheck, lint, build pass | `PASS` | 0 errors |
| Roadmap updated & payment gateway marked deferred | `PASS` | `09-phase-roadmap.md` |

---

## 27. Final Status

`PASS`
