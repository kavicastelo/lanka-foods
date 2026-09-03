# 16 — Build Optimization, Linting & Cleanup Specification

## 1. Overview & Objectives

Phase 16 brings the verified LankaEats Finland application to a clean, maintainable, production-buildable state.

Primary goals achieved:
1. **Frontend Linting & Unused Import Removal**: Resolved all ESLint errors/warnings (`npm run lint` passes with 0 warnings and 0 errors).
2. **Dependency Pruning**: Removed unused bloated dependencies (`three`, `html2canvas`, `jspdf`, `moment`) from `package.json`.
3. **Backend Type Safety & Linting**: `npm run backend:typecheck` and `npm run backend:lint` pass with 0 warnings and 0 errors.
4. **Security Bundle Audit**: Confirmed browser distribution bundle (`dist/`) contains no secret keys (`MONGODB_URI`, `R2_SECRET_ACCESS_KEY`, `JWT_SECRET`).
5. **Clean Build Verification**: Vite production frontend build compiles in 4.93s; TypeScript backend build compiles cleanly to `backend/dist/`.

---

## 2. Quality & Build Commands

- **Frontend Typecheck**: `npm run typecheck`
- **Frontend Lint**: `npm run lint` (0 errors, 0 warnings)
- **Frontend Build**: `npm run build` (Vite production bundle output)
- **Backend Typecheck**: `npm run backend:typecheck` (0 errors)
- **Backend Lint**: `npm run backend:lint` (0 errors, 0 warnings)
- **Backend Test**: `npm run backend:test` (192 / 192 tests passing across 14 files)
- **Backend Build**: `npm run backend:build` (`tsc` output to `backend/dist/`)

---

## 3. Payment Gateway Constraint

Automated payment processing remains: **DEFERRED / POST-MVP**.
No automated payment SDKs, payment webhooks, or payment intent endpoints were introduced. All customer/supplier financial settlements follow manual off-platform workflows.
