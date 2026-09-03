# 13 — Media Storage & Cloudflare R2 Specification

## 1. Overview & Architecture

Phase 13 implements the **Media Storage & Cloudflare R2 Infrastructure** for LankaEats Finland.

```
Frontend (Browser)
   │
   │ 1. Requests Presigned Upload URL: POST /api/media/upload-url
   ▼
Backend Media Service (backend/src/modules/media/media.service.ts)
   │
   ├── 2. Validates Authentication & RBAC Ownership (Restaurant Owner or Super Admin)
   ├── 3. Validates MIME Type (jpeg, png, webp) & File Size (Max 5MB)
   ├── 4. Generates Collision-Resistant Server Key (e.g. restaurants/{id}/cover/{uuid}.png)
   └── 5. Issues Presigned S3/R2 Upload URL + Public CDN URL
   │
   │ 6. Uploads Binary File Directly to Cloudflare R2 Storage (S3-Compatible API)
   ▼
Cloudflare R2 Storage (Binary Objects) ◄───────► MongoDB (Domain References)
```

---

## 2. Configuration & Credentials

All storage credentials are read from environment variables:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (default: `lankaeats-media`)
- `R2_PUBLIC_BASE_URL` (default: `https://media.lankaeats.fi`)
- `R2_ENDPOINT`

*Note: Credentials are never committed to git or logged. In test/local environments without credentials, `R2StorageService` falls back to a safe mock adapter generating synthetic presigned URLs.*

---

## 3. Object Key Strategy

- `restaurant_cover`: `restaurants/{restaurantId}/cover/{uuid}.{ext}`
- `restaurant_logo`: `restaurants/{restaurantId}/logo/{uuid}.{ext}`
- `menu_item`: `menu-items/{restaurantId}/{uuid}.{ext}`
- `application_logo`: `applications/{userId}/{uuid}.{ext}`
- `application_cover`: `applications/{userId}/{uuid}.{ext}`

---

## 4. API Endpoints

### 4.1 Request Presigned Upload URL
* **Method**: `POST`
* **Path**: `/api/media/upload-url`
* **Auth**: Protected (`[authenticate]`)
* **Request Body**:
  ```json
  {
    "category": "restaurant_cover",
    "fileName": "cover_hero.png",
    "fileType": "image/png",
    "fileSize": 2048000,
    "restaurantId": "67be00000000000000000001"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/lankaeats-media/restaurants/67be.../cover/uuid.png?X-Amz-Signature=...",
    "publicUrl": "https://media.lankaeats.fi/restaurants/67be.../cover/uuid.png",
    "objectKey": "restaurants/67be.../cover/uuid.png",
    "expiresInSeconds": 900
  }
  ```

### 4.2 Delete Media Object
* **Method**: `DELETE`
* **Path**: `/api/media`
* **Auth**: Protected (`[authenticate]`)
* **Request Body**:
  ```json
  {
    "objectKey": "restaurants/67be00000000000000000001/cover/uuid.png",
    "restaurantId": "67be00000000000000000001"
  }
  ```

---

## 5. Security Defenses

1. **Path Traversal Protection**: Filenames or object keys containing `..` or leading `/` are rejected with `400 BAD_REQUEST`.
2. **Strict MIME & Size Limits**: Only `image/jpeg`, `image/png`, `image/webp` under 5MB are accepted.
3. **Cross-Restaurant IDOR Protection**: Restaurant Admins can only issue upload URLs or delete objects for restaurants they own (`restaurant.ownerId === request.user.id`).
4. **Credential Protection**: S3 credentials and secret keys are never returned in responses or output logs.
