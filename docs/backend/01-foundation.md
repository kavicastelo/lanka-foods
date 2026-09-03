# 01 — Backend Foundation Documentation

## 1. Overview & Architecture Decision

The backend for **LankaEats Finland** is architected as an independent, modular monolith built with **Node.js**, **TypeScript**, and **Fastify**.

### Key Architectural Decisions:
* **HTTP Framework**: Fastify `^4.28.1`. Chosen for native TypeScript support, high performance, built-in schema validation, request ID correlation, native Pino logger integration, and clean test injection capabilities.
* **Language**: TypeScript `^5.8.2` configured with strict type-checking (`"strict": true`, `"noImplicitAny": true`).
* **Module System**: Modern Node.js ES Modules (`"type": "module"`, `"moduleResolution": "NodeNext"`).
* **Configuration Management**: Centralized environment parsing and schema validation using `dotenv` and `zod`.
* **Logging**: Structured JSON request logging via `pino` with sensitive header redaction (`authorization`, `cookie`, `x-access-token`, `password`, `secret`).
* **Security & CORS**: Baseline HTTP security headers via `@fastify/helmet` and explicit origin filtering via `@fastify/cors`.
* **Testing Engine**: Vitest `^2.1.8` for fast, in-memory integration testing using Fastify's native `inject()` API.

---

## 2. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Zod environment schema & validation
│   │   └── index.ts                # Centralized typed configuration exports
│   │
│   ├── infrastructure/
│   │   ├── logger/
│   │   │   └── index.ts            # Pino logger configuration & header redaction
│   │   └── database/
│   │       └── index.ts            # Database infrastructure placeholder (Phase 2)
│   │
│   ├── middleware/
│   │   ├── error-handler.ts        # Centralized Fastify error handler
│   │   └── not-found.ts            # JSON 404 handler for unknown routes
│   │
│   ├── routes/
│   │   ├── health.routes.ts        # Health (/health) & Readiness (/health/ready) endpoints
│   │   └── index.ts                # Central route registration manager
│   │
│   ├── app.ts                      # Fastify application factory (buildApp)
│   └── server.ts                   # Server bootstrap & graceful shutdown logic
│
├── tests/
│   ├── setup.ts                    # Vitest test environment configuration
│   └── health.test.ts              # Infrastructure integration & attack test suite
│
├── .env                            # Local development environment file
├── .env.example                    # Safe template environment file (no secrets)
├── eslint.config.js                # TypeScript ESLint configuration
├── package.json                    # Isolated backend dependencies & scripts
└── tsconfig.json                   # Strict TypeScript compiler options
```

---

## 3. Configuration & Environment Validation

Configuration is validated synchronously upon application startup via `loadEnvConfig()` in `src/config/env.ts`:

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SERVICE_NAME: z.string().default('lankaeats-backend'),
  SERVICE_VERSION: z.string().default('1.0.0'),
});
```

If an environment variable fails validation, the server outputs formatted diagnostic errors and terminates process startup immediately.

---

## 4. Error Handling & 404 Specification

All backend errors return a consistent JSON response shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /does-not-exist not found"
  }
}
```

* **HTTP Status Codes**:
  * `400 Bad Request` (`code: "BAD_REQUEST"`)
  * `401 Unauthorized` (`code: "UNAUTHORIZED"`)
  * `403 Forbidden` (`code: "FORBIDDEN"`)
  * `404 Not Found` (`code: "NOT_FOUND"`)
  * `413 Payload Too Large` (`code: "PAYLOAD_TOO_LARGE"`)
  * `500 Internal Server Error` (`code: "INTERNAL_SERVER_ERROR"`)
* **Production Security**: Stack traces and raw internal error details are suppressed in production mode.

---

## 5. Security & Request Management

* **Security Headers**: Managed via `@fastify/helmet`.
* **CORS Policy**: Restricted to configured origins in `CORS_ORIGINS` (default `http://localhost:5173`). Wildcard `*` is prohibited in production configuration.
* **Payload Limits**: Max request body size restricted to 1 MB (`bodyLimit: 1048576`).
* **Request ID Correlation**: Requests generate or propagate `x-request-id` headers for end-to-end log correlation.

---

## 6. Health & Readiness Endpoints

### 6.1 `GET /health`
* **Purpose**: Primary liveness probe.
* **Response Status**: `200 OK`
* **Response Body**:
  ```json
  {
    "status": "ok",
    "service": "lankaeats-backend",
    "version": "1.0.0",
    "timestamp": "2026-09-03T16:15:00.000Z",
    "uptime": 12.45
  }
  ```

### 6.2 `GET /health/ready`
* **Purpose**: Readiness probe verifying server process initialization.
* **Response Status**: `200 OK`
* **Response Body**:
  ```json
  {
    "status": "ready",
    "service": "lankaeats-backend",
    "initialized": true,
    "timestamp": "2026-09-03T16:15:00.000Z"
  }
  ```

---

## 7. Development & Operations Scripts

Root and backend scripts provide clean operations workflows:

```bash
# Run backend in hot-reload development mode
npm run backend:dev

# Run TypeScript type check
npm run backend:typecheck

# Run backend ESLint check
npm run backend:lint

# Run Vitest test suite
npm run backend:test

# Build production bundle
npm run backend:build

# Start production server
npm run backend:start
```

---

## 8. Deliberately Deferred Functionality

As required by Phase 1 scope control rules, the following business systems are **deliberately NOT implemented yet**:

* MongoDB connections, Mongoose models, database schemas (Phase 2).
* JWT authentication, user registration, login, password hashing, RBAC (Phase 3).
* Restaurant, menu, ordering, review, and favorite business logic (Phases 4-13).
* Cloudflare R2 media storage (Phase 14).
* Frontend API decoupling or Base44 replacement (Phase 15-18).
