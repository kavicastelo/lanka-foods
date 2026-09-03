# 08 — Customer Reviews & Rating Verification System Specification

## 1. Overview & Architecture

Phase 8 implements the **Customer Reviews & Rating Verification System** for LankaEats Finland.

```
Client (Customer / Public User)
   │
   │ 1. Submits Review Payload: { orderId, rating, foodRating, comment }
   ▼
POST /api/reviews (Protected: Bearer JWT + CUSTOMER role)
   │
   │ 2. Authenticates Customer identity from session (request.user.id)
   ▼
Server Review Engine (backend/src/modules/reviews/review.service.ts)
   │
   ├── 3. Order Ownership Check (order.customerId === request.user.id)
   ├── 4. Order Eligibility Check (order.status === 'completed')
   ├── 5. Application Duplicate Check (Review.findOne({ orderId }))
   ├── 6. Derives Restaurant Identity (restaurantId = order.restaurantId)
   ├── 7. Sets Verification Status (isVerified = true)
   ├── 8. Creates Review Document (MongoDB unique index on orderId guarantees 1 review per order)
   └── 9. Recalculates & Updates Restaurant Rating Aggregation (ratingAverage, reviewCount)
```

---

## 2. API Endpoints

### 2.1 Create Verified Review
* **Method**: `POST`
* **Path**: `/api/reviews`
* **Auth**: Protected (`[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* **Request Body**:
  ```json
  {
    "orderId": "67be1234567890abcdef1234",
    "rating": 5,
    "foodRating": 5,
    "comment": "Delicious Kottu Roti, super fresh!"
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "message": "Review created successfully",
    "review": {
      "id": "67be9876543210fedcba4321",
      "restaurantId": "67be00000000000000000001",
      "orderId": "67be1234567890abcdef1234",
      "authorId": "67be55555555555555555555",
      "authorName": "John Doe",
      "rating": 5,
      "foodRating": 5,
      "comment": "Delicious Kottu Roti, super fresh!",
      "isVerified": true,
      "createdAt": "2026-09-03T18:30:00.000Z"
    }
  }
  ```

### 2.2 Get Restaurant Public Reviews
* **Method**: `GET`
* **Path**: `/api/restaurants/:identifier/reviews` (where `:identifier` is restaurant ID or slug)
* **Auth**: Public
* **Query Params**: `page` (default 1), `limit` (default 20, max 50)
* **Success Response (200 OK)**:
  ```json
  {
    "data": [ ... ],
    "summary": {
      "ratingAverage": 4.5,
      "reviewCount": 12
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
  ```

### 2.3 Get Customer Created Reviews
* **Method**: `GET`
* **Path**: `/api/reviews/my-reviews`
* **Auth**: Protected (`[authenticate, authorize(['CUSTOMER', 'SUPER_ADMIN'])]`)
* **Query Params**: `page` (default 1), `limit` (default 20, max 50)

---

## 3. Database Indexes

- `reviewSchema.index({ orderId: 1 }, { unique: true })`: Enforces maximum 1 review per order at the database level.
- `reviewSchema.index({ restaurantId: 1, createdAt: -1 })`: Supports fast paginated lookup of restaurant reviews.
- `reviewSchema.index({ authorId: 1, createdAt: -1 })`: Supports fast paginated lookup of customer's review history.

---

## 4. Rating Aggregation Strategy

When a review is created, the backend executes an aggregation query on `Review`:
```typescript
const stats = await Review.aggregate([
  { $match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) } },
  { $group: { _id: '$restaurantId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
]);
```
The resulting `ratingAverage` (rounded to 1 decimal place) and `reviewCount` are persisted directly on the `Restaurant` document.
