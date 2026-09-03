# 00 — Codebase Inventory

## 1. Repository Overview

* **Project Name**: `base44-app` (configured as `LankaEats Finland` marketplace)
* **Local Path**: `d:\talnova\lanka-foods`
* **Repository Type**: Independent local workspace copied from a Base44 prototype project.
* **Current Tech Stack**:
  * **Frontend Framework**: React `^18.2.0`
  * **Build Tool / Bundler**: Vite `^6.1.0` (with `@base44/vite-plugin` `^1.0.34` and `@vitejs/plugin-react` `^4.3.4`)
  * **Language**: JavaScript (ES modules) + JSX, with TypeScript `^5.8.2` typechecking configuration (`jsconfig.json`)
  * **Styling**: Tailwind CSS `^3.4.17` + PostCSS `^8.5.3` + Autoprefixer `^10.4.20` + Radix UI primitives
  * **State & Data Fetching**: TanStack React Query `^5.84.1` + React Context API (`AuthContext`, `MarketplaceContext`)
  * **Routing**: React Router DOM `^6.26.0`
  * **Backend SDK / Platform Dependency**: Base44 Client SDK (`@base44/sdk` `^0.8.46`)
  * **Backend Source Code**: Base44 entities (`base44/entities/*.jsonc`), backend Deno TypeScript functions (`base44/functions/**/*.ts`), and shared auth helpers (`base44/shared/auth.ts`).

---

## 2. Directory Tree Structure

```
d:\talnova\lanka-foods
├── .env                              [0 bytes - EMPTY file]
├── .gitattributes                    [66 bytes]
├── .gitignore                        [334 bytes]
├── AGENTS.md                         [1,626 bytes - Base44 agent guidelines]
├── BACKEND-MIGRATION-DISCOVERY.md    [58,727 bytes - Historical migration doc]
├── CLAUDE.md                         [60 bytes]
├── PHASE-1-BACKEND-IMPLEMENTATION.md [25,717 bytes - Historical migration doc]
├── PHASE-3-CUSTOMER-FLOW-REPORT.md   [13,124 bytes - Historical report]
├── README.md                         [3,300 bytes]
├── components.json                   [522 bytes - shadcn UI configuration]
├── eslint.config.js                  [1,956 bytes - ESLint flat config]
├── index.html                        [440 bytes - HTML entry point]
├── jsconfig.json                     [836 bytes - Path aliases @/* -> src/*]
├── package-lock.json                 [431,089 bytes]
├── package.json                      [3,709 bytes]
├── postcss.config.js                 [98 bytes]
├── tailwind.config.js                [4,040 bytes]
├── vite.config.js                    [694 bytes - Vite + Base44 plugin config]
├── base44/                           [Base44 project definitions]
│   ├── config.jsonc                  [212 bytes]
│   ├── entities/                     [11 Base44 entity definitions (.jsonc)]
│   │   ├── CommissionConfig.jsonc
│   │   ├── Favorite.jsonc
│   │   ├── GlobalCategory.jsonc
│   │   ├── MenuCategory.jsonc
│   │   ├── MenuItem.jsonc
│   │   ├── Order.jsonc
│   │   ├── OrderItem.jsonc
│   │   ├── Restaurant.jsonc
│   │   ├── RestaurantApplication.jsonc
│   │   ├── Review.jsonc
│   │   └── User.jsonc
│   ├── functions/                    [12 Base44 Deno backend functions]
│   │   ├── approveRestaurantApplication/entry.ts
│   │   ├── createReview/entry.ts
│   │   ├── getDashboardMetrics/entry.ts
│   │   ├── manageMenuCategory/entry.ts
│   │   ├── manageMenuItem/entry.ts
│   │   ├── placeOrder/entry.ts
│   │   ├── rejectRestaurantApplication/entry.ts
│   │   ├── requestRestaurantChanges/entry.ts
│   │   ├── setCommissionRate/entry.ts
│   │   ├── setRestaurantStatus/entry.ts
│   │   ├── submitRestaurantApplication/entry.ts
│   │   └── updateOrderStatus/entry.ts
│   └── shared/
│       └── auth.ts                   [1,965 bytes - Backend auth & validation helpers]
└── src/                              [Frontend source code]
    ├── App.jsx                       [4,235 bytes - Main router & app root]
    ├── main.jsx                      [199 bytes - React DOM mount entry]
    ├── index.css                     [2,709 bytes - Tailwind & CSS variables]
    ├── api/
    │   └── base44Client.js           [363 bytes - Base44 SDK client initialization]
    ├── components/                   [14 high-level components]
    │   ├── AuthLayout.jsx            [1,122 bytes]
    │   ├── DashboardLayout.jsx       [4,902 bytes]
    │   ├── FoodItemModal.jsx         [5,501 bytes]
    │   ├── Footer.jsx                [3,590 bytes]
    │   ├── GoogleIcon.jsx            [881 bytes]
    │   ├── Layout.jsx                [425 bytes]
    │   ├── Navbar.jsx                [8,365 bytes]
    │   ├── ProtectedRoute.jsx        [1,174 bytes]
    │   ├── RestaurantCard.jsx        [4,632 bytes]
    │   ├── RoleGuard.jsx             [1,012 bytes]
    │   ├── ScrollToTop.jsx           [912 bytes]
    │   ├── StarRating.jsx            [1,056 bytes]
    │   ├── StatusBadge.jsx           [1,446 bytes]
    │   ├── UserNotRegisteredError.jsx [1,861 bytes]
    │   └── ui/                       [51 UI primitive components]
    ├── context/
    │   └── MarketplaceContext.jsx    [2,259 bytes - Client-side cart state]
    ├── hooks/
    │   ├── use-mobile.jsx            [602 bytes]
    │   ├── use-size.jsx              [990 bytes]
    │   └── useMarketplaceData.js     [18,696 bytes - Data fetching & mutations]
    ├── lib/
    │   ├── app-params.js             [2,013 bytes - Base44 URL/storage param reader]
    │   ├── authReturnTo.js           [1,852 bytes - Post-auth redirect helper]
    │   ├── AuthContext.jsx           [5,907 bytes - Auth provider & user state]
    │   ├── constants.js              [1,235 bytes - Static image URLs & lists]
    │   ├── marketplaceAuth.js        [1,935 bytes - Role derivation helpers]
    │   ├── PageNotFound.jsx          [3,939 bytes]
    │   ├── query-client.js           [243 bytes - TanStack Query instance]
    │   └── utils.js                  [200 bytes - Tailwind merge helper]
    ├── pages/                        [17 application pages]
    │   ├── BecomePartner.jsx         [7,985 bytes]
    │   ├── Cart.jsx                  [6,682 bytes]
    │   ├── Checkout.jsx              [15,337 bytes]
    │   ├── CustomerAccount.jsx       [10,722 bytes]
    │   ├── ForgotPassword.jsx        [4,093 bytes]
    │   ├── Home.jsx                  [9,341 bytes]
    │   ├── Login.jsx                 [5,435 bytes]
    │   ├── OAuthConsent.jsx          [11,673 bytes]
    │   ├── OrderConfirmation.jsx     [5,000 bytes]
    │   ├── OrderTracking.jsx         [10,268 bytes]
    │   ├── Register.jsx              [14,322 bytes]
    │   ├── ResetPassword.jsx         [4,655 bytes]
    │   ├── RestaurantAdminDashboard.jsx [30,155 bytes]
    │   ├── RestaurantStorefront.jsx  [16,118 bytes]
    │   ├── Restaurants.jsx           [8,867 bytes]
    │   ├── SignIn.jsx                [5,180 bytes]
    │   └── SuperAdminDashboard.jsx   [35,916 bytes]
    └── utils/
        └── index.ts                  [99 bytes]
```

---

## 3. Dependency Inventory & Classification

### 3.1 Dependencies in `package.json`

| Dependency Package | Installed Version | Primary Usage in Codebase | Classification |
|---|---|---|---|
| `@base44/sdk` | `^0.8.46` | Client initialization in `src/api/base44Client.js:1`, Auth in `src/lib/AuthContext.jsx:4` | **Base44-Specific** (Must be replaced in Node.js migration) |
| `@base44/vite-plugin` | `^1.0.34` | Vite plugin in `vite.config.js:1` | **Base44-Specific** (Must be replaced with standard Vite build) |
| `react` | `^18.2.0` | Frontend UI framework | **Keep** |
| `react-dom` | `^18.2.0` | React DOM renderer | **Keep** |
| `react-router-dom` | `^6.26.0` | Client-side routing in `src/App.jsx` | **Keep** |
| `@tanstack/react-query` | `^5.84.1` | Asynchronous state management in `src/hooks/useMarketplaceData.js` | **Keep** |
| `lucide-react` | `^0.475.0` | Icon set used across all components | **Keep** |
| `clsx` | `^2.1.1` | Class name utility in `src/lib/utils.js` | **Keep** |
| `tailwind-merge` | `^3.0.2` | Class name merger in `src/lib/utils.js` | **Keep** |
| `class-variance-authority` | `^0.7.1` | Component variant styling (`src/components/ui/button.jsx`) | **Keep** |
| `recharts` | `^2.15.4` | Analytics charts in `RestaurantAdminDashboard.jsx`, `SuperAdminDashboard.jsx` | **Keep** |
| `@radix-ui/*` (27 packages) | Various `^1.1.x` - `^2.2.x` | Headless UI primitives in `src/components/ui/*` | **Keep** |
| `framer-motion` | `^11.16.4` | Micro-animations | **Keep** |
| `canvas-confetti` | `^1.9.4` | Celebration effect in `OrderConfirmation.jsx` | **Keep** (Optional UI enhancement) |
| `date-fns` | `^3.6.0` | Date manipulation | **Keep** |
| `moment` | `^2.30.1` | Alternative date library | **Unused / Redundant** |
| `lodash` | `^4.17.21` | Utility library | **Unused / Redundant** |
| `html2canvas` | `^1.4.1` | DOM-to-canvas rendering | **Unused / Bloat** |
| `jspdf` | `^4.2.1` | PDF generation | **Unused / Bloat** |
| `three` | `^0.171.0` | 3D Graphics library | **Unused / Massive Bloat** |
| `react-quill-new` | `^3.8.3` | Rich text editor | **Unused / Bloat** |
| `react-leaflet` | `^4.2.1` | Interactive map component | **Unused / Bloat** |
| `vaul` | `^1.1.2` | Drawer component | **Unused** |
| `@stripe/react-stripe-js` | `^3.0.0` | Stripe integration wrapper | **Unused** (No live payment processing wired) |
| `@stripe/stripe-js` | `^5.2.0` | Stripe JS SDK | **Unused** (No live payment processing wired) |
| `@hello-pangea/dnd` | `^17.0.0` | Drag and drop library | **Unused** |

---

## 4. Build, Typecheck, and Lint Status

### 4.1 Typecheck Execution (`npm run typecheck`)
* **Command**: `tsc -p ./jsconfig.json`
* **Status**: **FAILED** (Exit code: 1)
* **Evidence**: Produced over 40 TypeScript errors across multiple files:
  * `src/pages/Restaurants.jsx(66,39)`: Arithmetic operation type mismatch.
  * `src/pages/RestaurantStorefront.jsx`: 15+ errors for missing props (`src` on custom components, missing `icon`, missing `onChange`).
  * `src/pages/SignIn.jsx(70,26)`: Property `children` not assignable.
  * `src/pages/SuperAdminDashboard.jsx`: 18+ errors for missing required props (`actions`, `className`, `full`) and parameter type mismatches.

### 4.2 Lint Execution (`npm run lint`)
* **Command**: `eslint . --quiet`
* **Status**: **FAILED** (Exit code: 1)
* **Evidence**: 10 lint errors detected for unused imports:
  * `src/components/FoodItemModal.jsx:6:8`: `StarRating` unused.
  * `src/components/RestaurantCard.jsx:5:8`: `StarRating` unused.
  * `src/pages/BecomePartner.jsx:3:10`: `UtensilsCrossed` unused.
  * `src/pages/Checkout.jsx:3:30`: `Calendar` unused.
  * `src/pages/CustomerAccount.jsx:3:38`, `3:46`: `MapPin`, `Repeat` unused.
  * `src/pages/OrderConfirmation.jsx:1:17`, `1:27`: `useState`, `useEffect` unused.
  * `src/pages/RestaurantAdminDashboard.jsx:2:104`: `X` unused.
  * `src/pages/SuperAdminDashboard.jsx:2:10`: `Link` unused.

### 4.3 Build Execution (`npm run build`)
* **Command**: `vite build`
* **Status**: **SUCCESS** (With severe configuration warnings)
* **Build Warning Evidence**:
  ```
  [base44] Warning: VITE_BASE44_APP_ID is not set — this build
  [base44] will not know its app id and its API calls will fail.
  [base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)
  ```
* **Output**: `dist/index.html` (1.51 kB), `dist/assets/index-C9pgjnb6.css` (78.22 kB), `dist/assets/index-ToOkjUyO.js` (1,020.90 kB). Bundle exceeds recommended 500 kB limit due to heavy un-split dependencies.

---

## 5. Runtime Server Status

* **Command**: `npm run dev`
* **Status**: **RUNNING** (`http://localhost:5173/`)
* **Server Log Warning**:
  ```
  [base44] No Base44 backend configured — VITE_BASE44_APP_BASE_URL is not set, so /api requests have nowhere to go.
  [base44] Run the app through the Base44 CLI instead:
  [base44]   base44 dev           app + local backend (throwaway local data)
  [base44]   base44 dev --remote  app + your app's real backend (production data)
  ```
* **Runtime Result**: The Vite development server serves static HTML/JS correctly. UI renders pages, but all network requests to Base44 entity CRUD or backend functions fail unless pointed to a valid Base44 backend instance.
