# LIGHTHOUSE PERFORMANCE BASELINE DOCUMENT

**Date**: September 7, 2026  
**Environment**: Production Preview Build (`npm run build` served via `vite preview` on `http://localhost:4173`), connected to local Fastify backend API (`http://localhost:4000`).  
**Lighthouse Version**: 13.4.1 (Chrome Headless)

---

## 1. Application-Wide Route Inventory & Classification

| Route Path | Classification | Category | SEO Target |
| :--- | :--- | :--- | :--- |
| `/` | `INDEXABLE` / `DYNAMIC PUBLIC` | Landing / Homepage | Target 100/100 |
| `/restaurants` | `INDEXABLE` / `DYNAMIC PUBLIC` | Restaurant Marketplace | Target 100/100 |
| `/restaurant/:slug` | `INDEXABLE` / `DYNAMIC PUBLIC` | Restaurant Storefront & Menu | Target 100/100 |
| `/about` | `INDEXABLE` | Marketing / Content | Target 100/100 |
| `/partner` | `INDEXABLE` | Marketing | Target 100/100 |
| `/for-partners` | `INDEXABLE` | Marketing | Target 100/100 |
| `/terms` | `INDEXABLE` | Legal | Target 100/100 |
| `/privacy` | `INDEXABLE` | Legal | Target 100/100 |
| `/contact` | `INDEXABLE` | Contact | Target 100/100 |
| `/cart` | `NOINDEX` / `PUBLIC` | Shopping Cart | Performance/A11y/BP 100 |
| `/login` | `NOINDEX` / `AUTH` | Auth Entry | Performance/A11y/BP 100 |
| `/register` | `NOINDEX` / `AUTH` | Auth Entry | Performance/A11y/BP 100 |
| `/forgot-password` | `NOINDEX` / `AUTH` | Auth Entry | Performance/A11y/BP 100 |
| `/reset-password` | `NOINDEX` / `AUTH` | Auth Entry | Performance/A11y/BP 100 |
| `/checkout` | `AUTHENTICATED` / `PRIVATE` | Customer Checkout | Performance/A11y/BP 100 |
| `/order/:id/confirmation` | `AUTHENTICATED` / `PRIVATE` | Order Confirmation | Performance/A11y/BP 100 |
| `/order/:id` | `AUTHENTICATED` / `PRIVATE` | Order Tracking | Performance/A11y/BP 100 |
| `/account` | `AUTHENTICATED` / `PRIVATE` | Customer Account | Performance/A11y/BP 100 |
| `/restaurant/dashboard` | `ADMIN` / `PRIVATE` | Restaurant Admin | Performance/A11y/BP 100 |
| `/admin/dashboard` | `ADMIN` / `PRIVATE` | Super Admin | Performance/A11y/BP 100 |

---

## 2. Initial Baseline Lighthouse Scores

### 2.1 Route: `/` (Home Page)

| Device | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Mobile** | **66** | **81** | **92** | **83** | 3.2 s | 9.4 s | 0 ms | 0.000 | 4.8 s |
| **Desktop** | **95** | **86** | **92** | **83** | 1.1 s | 1.1 s | 0 ms | 0.022 | 1.1 s |

### 2.2 Route: `/restaurants` (Restaurant Listing Page)

| Device | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Mobile** | **68** | **80** | **96** | **82** | 3.2 s | 9.0 s | 0 ms | 0.058 | 3.3 s |
| **Desktop** | **96** | **85** | **96** | **82** | 1.1 s | 1.1 s | 0 ms | 0.024 | 1.1 s |

---

## 3. Comprehensive Audit Failure Analysis & Root Cause Identification

### 3.1 Performance Bottlenecks
1. **Oversized Single JavaScript Bundle (`>1.06 MB` / `289 KB` gzipped)**
   - **Root Cause**: `src/App.jsx` statically imports all routes (`SuperAdminDashboard`, `RestaurantAdminDashboard`, `Checkout`, `Cart`, etc.). Users loading the home page download administrative and heavy UI chunks for the entire app.
2. **Initial Auth Loading Spinner State (`isLoadingAuth` = `true` default)**
   - **Root Cause**: `AuthContext.jsx` initializes `isLoadingAuth` to `true` on mount, showing a full-screen spinner before checking `tokenStorage.getToken()`. On unauthenticated visits, this causes a flash of loading spinner and delays FCP/LCP painting.
3. **Unused JavaScript (`~375 KB` unused)**
   - **Root Cause**: Lack of dynamic route component code-splitting (`React.lazy`). Heavy packages (`recharts`, `framer-motion`, `leaflet`, `stripe`) are included in the initial chunk.
4. **Render-Blocking CSS & Large Favicon (`561 KB` `favicon.ico`)**
   - **Root Cause**: Oversized static asset files in `public/` transferred during initial load.

### 3.2 Accessibility (A11y) Failures
1. **Buttons without Accessible Names (`button-name`)**
   - **Root Cause**: Icon-only `<button>` elements (e.g. search icons, cart icons, filter toggle buttons, theme toggles) lack `aria-label` or visually hidden text.
2. **Low Color Contrast (`color-contrast`)**
   - **Root Cause**: Light gray text elements (`text-slate-400`, `text-gray-400`) on white or light backgrounds fail the minimum 4.5:1 contrast ratio.
3. **Non-Sequential Heading Order (`heading-order`)**
   - **Root Cause**: Page skips heading levels (e.g., jumps from `h1` directly to `h3` or `h4` inside component cards).
4. **Links without Discernible Names (`link-name`)**
   - **Root Cause**: Icon-only navigation or footer links lack inner text or `aria-label`.
5. **Form Selects without Associated Labels (`select-name`)**
   - **Root Cause**: Dropdown `<select>` elements in filters or footers missing `<label>` tags or `aria-label` attributes.

### 3.3 Best Practices Failures
1. **Console Errors (`errors-in-console`)**
   - **Root Cause**: Unhandled API error logs or unhandled promise rejections on initial page load when checking auth or background state.
2. **Missing Source Maps for Production Chunks (`valid-source-maps`)**
   - **Root Cause**: Vite configuration does not generate source maps for production output.

### 3.4 SEO Failures
1. **Missing Meta Description (`meta-description`)**
   - **Root Cause**: `index.html` lacks `<meta name="description" ... />`.
2. **Missing Canonical URL (`rel=canonical`)**
   - **Root Cause**: `index.html` lacks `<link rel="canonical" ... />`.
3. **Missing/Invalid `robots.txt` (`robots-txt`)**
   - **Root Cause**: `public/robots.txt` file is missing from the workspace.

---

## 4. Benchmark Bundle Artifact Summary

- `dist/assets/index-DKTPBard.js`: **1,060.77 kB** (289.44 kB gzipped)
- `dist/assets/index-CAwx-5m6.css`: **85.38 kB** (14.53 kB gzipped)
- `dist/favicon.ico`: **561.66 kB**

*Baseline established on September 7, 2026. This file will be preserved as the baseline benchmark.*
