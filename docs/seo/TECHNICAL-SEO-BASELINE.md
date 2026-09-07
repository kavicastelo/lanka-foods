# TECHNICAL SEO BASELINE REPORT

**Application**: LankaEats Finland — Sri Lankan Food Marketplace  
**Date**: September 7, 2026  
**Auditor**: Senior Technical SEO Architect  
**Status**: Baseline Established (Pre-Implementation)

---

## 1. ARCHITECTURE & DISCOVERY SUMMARY

* **Frontend Framework**: React 18, Vite 5, React Router v6.
* **Rendering Model**: Client-Side Rendering (CSR) SPA.
* **Backend API**: Fastify API on `http://localhost:4000/api` (PostgreSQL / Knex / Base44 client).
* **Production Host Domain**: `https://lankaeats.fi`
* **Current Meta Management**: Static HTML tags in `index.html`. No dynamic `document.title`, `<meta name="description">`, `<link rel="canonical">`, Open Graph, or JSON-LD dynamic management on route transitions.

---

## 2. COMPLETE URL INVENTORY & INDEXABILITY MATRIX

| URL Pattern | Classification | Public | Indexable | Canonical Target | Sitemap Included | Reason / Strategy |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| `/` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/` | Yes | Homepage marketplace hub |
| `/restaurants` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/restaurants` | Yes | Restaurant directory & category browser |
| `/restaurant/:slug` | DYNAMIC_PUBLIC | Yes | Yes | `https://lankaeats.fi/restaurant/:slug` | Yes | Individual restaurant storefront & menu |
| `/about` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/about` | Yes | About LankaEats platform |
| `/partner` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/partner` | Yes | Partner landing page |
| `/for-partners` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/for-partners` | Yes | Restaurant partner features |
| `/terms` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/terms` | Yes | Legal terms and conditions |
| `/privacy` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/privacy` | Yes | Legal privacy policy |
| `/contact` | PUBLIC_INDEXABLE | Yes | Yes | `https://lankaeats.fi/contact` | Yes | Support & contact page |
| `/cart` | PUBLIC_NON_INDEXABLE | Yes | No | `https://lankaeats.fi/` | No | Shopping cart transient state |
| `/login` | PUBLIC_NON_INDEXABLE | Yes | No | `https://lankaeats.fi/` | No | Auth sign-in page |
| `/register` | PUBLIC_NON_INDEXABLE | Yes | No | `https://lankaeats.fi/` | No | Auth registration page |
| `/forgot-password` | PUBLIC_NON_INDEXABLE | Yes | No | `https://lankaeats.fi/` | No | Auth password recovery |
| `/reset-password` | PUBLIC_NON_INDEXABLE | Yes | No | `https://lankaeats.fi/` | No | Auth password reset |
| `/checkout` | AUTHENTICATED | No | No | N/A | No | Private order checkout |
| `/order/:id/confirmation` | AUTHENTICATED | No | No | N/A | No | Private order confirmation |
| `/order/:id` | AUTHENTICATED | No | No | N/A | No | Private order tracking |
| `/account` | AUTHENTICATED | No | No | N/A | No | Private customer account dashboard |
| `/restaurant/dashboard` | ADMIN | No | No | N/A | No | Private restaurant owner portal |
| `/admin/dashboard` | ADMIN | No | No | N/A | No | Private super admin portal |
| `/*` (Nonexistent) | ERROR | Yes | No | N/A | No | 404 Page Not Found fallback |

---

## 3. AUDIT FINDINGS BY CATEGORY

### 3.1 Document Head & Metadata System
* **Title Tags**: **FAIL**. Single static `<title>LankaEats Finland — Sri Lankan Food Marketplace</title>` rendered for all pages. Navigating to `/restaurants`, `/restaurant/kottu-king`, or `/privacy` keeps the exact same title.
* **Meta Descriptions**: **FAIL**. Single static meta description in `index.html`. Dynamic routes like `/restaurant/:slug` lack custom descriptions generated from restaurant data.
* **Canonical URLs**: **FAIL**. All subpages default to static `<link rel="canonical" href="https://lankaeats.fi/">`, creating duplicate content canonical signals pointing everything to the homepage!
* **Open Graph / Twitter Cards**: **FAIL**. Missing `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card`.

### 3.2 Crawlability & Sitemap System
* **`robots.txt`**: **PASS (with updates needed)**. File exists disallowing `/admin/`, `/account`, `/checkout`, etc. However, sitemap reference points to missing `sitemap.xml`.
* **`sitemap.xml`**: **FAIL**. Missing completely (`public/sitemap.xml` returns 404).

### 3.3 Structured Data (JSON-LD)
* **Structured Data Foundation**: **FAIL**. Zero JSON-LD schemas (`<script type="application/ld+json">`) in index.html or dynamic components.
* **Restaurant / LocalBusiness Schema**: **FAIL**. No schema representation on `/restaurant/:slug` storefront pages.
* **Organization & WebSite Schema**: **FAIL**. No site-wide Organization / WebSite search schema.
* **BreadcrumbList Schema**: **FAIL**. Missing breadcrumb structured data.

### 3.4 HTTP Status Codes & Soft 404 Handling
* **SPA 404 Routing**: **FAIL**. Client router displays `<PageNotFound />` component for invalid paths like `/nonexistent` or invalid restaurant slugs like `/restaurant/fake-slug-123`, but the server HTTP response returns status 200 (inherent CSR behavior). Meta tag `<meta name="robots" content="noindex, follow">` must be injected on 404 state to signal non-indexability to search engine crawlers.

### 3.5 Semantic HTML & Heading Hierarchy
* **Heading Structure**: **PASS / MODERATE**. Pages use `<h1>` and `<h2>` elements, but heading hierarchy on dynamic restaurant pages and footer links can be enhanced with semantic `<header>`, `<main>`, `<nav>`, `<article>`, `<footer>`, and `Breadcrumbs`.

### 3.6 Image SEO
* **Alt Attributes**: **MODERATE**. Functional icons have accessible labels, but restaurant banner photos and dish thumbnails require explicit descriptive `alt` attributes.

---

## 4. BASELINE TECHNICAL SEO SCORECARD

| Category | Baseline Result | Action Required |
| :--- | :---: | :--- |
| Crawlability | **PASS** | Keep robots.txt disallow rules updated |
| Indexability Control | **FAIL** | Add dynamic `noindex` for auth/utility/404 routes |
| Title Tag System | **FAIL** | Implement dynamic `<SeoHead>` component per route |
| Meta Description System | **FAIL** | Implement dynamic meta descriptions per route/restaurant |
| Canonicalization | **FAIL** | Implement dynamic self-referencing absolute canonical URLs |
| Open Graph / Social Sharing | **FAIL** | Add dynamic OG & Twitter meta tags |
| Robots.txt | **PASS** | Validate against indexability matrix |
| Sitemap.xml | **FAIL** | Generate dynamic `sitemap.xml` script & file |
| Structured Data (JSON-LD) | **FAIL** | Inject `Organization`, `WebSite`, `Restaurant`, `BreadcrumbList` |
| HTTP / Soft 404 Signals | **FAIL** | Inject `noindex` head tags on 404 / nonexistent entities |
| Semantic Structure | **MODERATE** | Wrap key sections in HTML5 semantic tags |
| Mobile Responsiveness | **PASS** | Viewport meta already valid |

---

## 5. REPOSITORY AUDIT BASELINE LOG

```text
Baseline audit completed on commit hash / local workspace state.
All findings documented in docs/seo/TECHNICAL-SEO-BASELINE.md.
Code changes halted until implementation plan approval.
```
