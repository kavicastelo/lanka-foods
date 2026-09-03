# Phase 17 — Production Deployment & Launch Guide

## 1. Target System Architecture

```text
                    ┌─────────────────────┐
                    │      Customers      │
                    │ Restaurant Admins   │
                    │     Super Admin     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Production Frontend │
                    │   (Vite + React)    │
                    └──────────┬──────────┘
                               │
                         HTTPS / REST
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Node.js / Fastify  │
                    │    Backend API      │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       Domain Services      MongoDB        Cloudflare R2
             │          (App Database)     (Media Store)
             └─────────────────┴─────────────────┘

                 NO BASE44 IN PRODUCTION
```

---

## 2. Production Environment Configuration

### Frontend Public Environment Variables (`.env.production`)
```ini
VITE_API_BASE_URL=https://api.lankaeats.fi
```
*Note: Expose ONLY safe public variables to frontend builds. Never include database URIs, JWT secrets, or R2 credentials in Vite environment files.*

### Backend Production Environment Variables (`backend/.env`)
```ini
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGINS=https://lankaeats.fi,https://www.lankaeats.fi
SERVICE_NAME=lankaeats-backend
SERVICE_VERSION=1.0.0

MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/lankaeats_prod?retryWrites=true&w=majority

JWT_SECRET=<strong-random-256-bit-string>
JWT_EXPIRES_IN=7d

R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<cloudflare-access-key-id>
R2_SECRET_ACCESS_KEY=<cloudflare-secret-access-key>
R2_BUCKET_NAME=lankaeats-production-media
R2_PUBLIC_BASE_URL=https://media.lankaeats.fi
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

---

## 3. Build & Deployment Procedure

### Frontend Production Build
```bash
npm ci
npm run typecheck
npm run lint
npm run build
```
*Artifacts: Static production bundle generated in `dist/`.*

### Backend Production Build
```bash
cd backend
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```
*Artifacts: Compiled JavaScript server bundle generated in `backend/dist/`.*

### Server Process Launch
```bash
cd backend
npm run start
```
*Process Manager*: Use PM2 or systemd in production (e.g. `pm2 start dist/server.js --name lankaeats-backend`).

---

## 4. Health & Readiness Verification

- **Health Check Endpoint**: `GET /health` (Returns HTTP 200 `{ status: "ok" }`)
- **Readiness Check Endpoint**: `GET /health/ready` (Verifies MongoDB connection state; returns 200 `{ status: "ready" }` or 503 `{ status: "unhealthy" }`)

---

## 5. Rollback Plan

1. **Deployment Failure Detection**: If health/readiness endpoints fail post-deploy or critical error rates spike on Pino logging, trigger immediate rollback.
2. **Traffic Redirection**: Revert reverse proxy / DNS pointing to previous stable container/process version.
3. **Application State Rollback**: Restart backend from previous tag/git commit output in `backend/dist/`.
4. **Database Rollback Integrity**: Standard schema additions are backward-compatible. Maintain database backup snapshot prior to major deployments.

---

## 6. Backup & Disaster Recovery Strategy

- **Database Backups**: Managed MongoDB Atlas continuous daily snapshot backup with point-in-time recovery enabled.
- **Media Recovery**: Cloudflare R2 versioning enabled with cross-region bucket replication options.
- **Recovery Time Objective (RTO)**: < 15 minutes.
- **Recovery Point Objective (RPO)**: < 1 hour.
