# 10 — Restaurant Application Workflow Specification

## 1. Overview & Architecture

Phase 10 implements the **Restaurant Application & Onboarding Workflow** for LankaEats Finland.

```
Prospective Supplier (Authenticated Customer)
   │
   │ 1. Submits Application: { businessName, ownerName, email, phone, city, address, businessType, cuisine, description, pickup, delivery }
   ▼
POST /api/partner/apply (Protected: Bearer JWT)
   │
   │ 2. Server derives applicantUserId = request.user.id, status = 'pending'
   ▼
Pending Application in MongoDB (RestaurantApplication)
   │
   ├── 3. GET /api/admin/applications (Super Admin Review)
   ├── 4. POST /api/admin/applications/:id/approve (Super Admin Approval)
   │       ├── Sets status = 'approved', reviewedBy = adminUserId, reviewedAt = now
   │       ├── Creates or activates Restaurant document with ownerId = applicantUserId
   │       └── Promotes applicant User role to 'RESTAURANT_ADMIN' if 'CUSTOMER'
   └── 5. POST /api/admin/applications/:id/reject (Super Admin Rejection)
           └── Sets status = 'rejected', rejectionReason = reason
```

---

## 2. Application Status Model & State Transitions

* **`pending`**: Default state upon submission.
* **`approved`**: Set by Super Admin approval. Promotes applicant to `RESTAURANT_ADMIN` and activates `Restaurant`. (Terminal / Idempotent retry safe).
* **`rejected`**: Set by Super Admin rejection. (Terminal).

---

## 3. API Endpoints

### 3.1 Submit Partner Application
* **Method**: `POST`
* **Path**: `/api/partner/apply`
* **Auth**: Protected (`[authenticate]`)
* **Request Body**:
  ```json
  {
    "businessName": "Lankan Spice Haven",
    "ownerName": "Jane Doe",
    "email": "jane@lankaspice.fi",
    "phone": "+358401234567",
    "city": "Helsinki",
    "address": "Mannerheimintie 10",
    "businessType": "Restaurant",
    "cuisine": "Sri Lankan",
    "description": "Authentic Kottu Roti & Curry",
    "pickup": true,
    "delivery": true
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Application submitted successfully",
    "application": {
      "id": "67be11111111111111111111",
      "applicantUserId": "67be55555555555555555555",
      "businessName": "Lankan Spice Haven",
      "status": "pending",
      "submittedDate": "2026-09-03T18:40:00.000Z"
    }
  }
  ```

### 3.2 Get Applicant's Application Status
* **Method**: `GET`
* **Path**: `/api/partner/my-application`
* **Auth**: Protected (`[authenticate]`)

### 3.3 List Applications (Admin Only)
* **Method**: `GET`
* **Path**: `/api/admin/applications`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)
* **Query Params**: `page`, `limit`, `status` (`pending` | `approved` | `rejected`)

### 3.4 Approve Application (Admin Only)
* **Method**: `POST`
* **Path**: `/api/admin/applications/:id/approve`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)

### 3.5 Reject Application (Admin Only)
* **Method**: `POST`
* **Path**: `/api/admin/applications/:id/reject`
* **Auth**: Protected (`[authenticate, authorize(['SUPER_ADMIN'])]`)
* **Request Body**: `{ "reason": "Incomplete registration documents." }`

---

## 4. Security & Atomicity Guarantees

1. **Applicant Identity Protection**: Applicant user ID is derived strictly from `request.user.id`. Client attempts to submit `applicantUserId` or `status: "approved"` are ignored.
2. **Privilege Escalation Defense**: CUSTOMER accounts attempting to access admin application listing or approval endpoints return `403 FORBIDDEN`.
3. **Approval Idempotency**: Re-calling approve on an already approved application returns `200 OK` with the existing `Restaurant` object without creating duplicate restaurant documents.
