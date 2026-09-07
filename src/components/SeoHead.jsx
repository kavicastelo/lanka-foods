import { useEffect } from 'react';

/**
 * SeoHead component for dynamic client-side management of document head metadata,
 * canonical links, Open Graph / Twitter cards, robots directives, and JSON-LD structured data.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {string} [props.canonicalUrl]
 * @param {boolean} [props.noindex]
 * @param {{ title?: string; description?: string; url?: string; image?: string; type?: string }} [props.og]
 * @param {any} [props.jsonLd]
 */
export default function SeoHead({
    title,
    description,
    canonicalUrl = undefined,
    noindex = false,
    og = {},
    jsonLd = null,
}) {
    useEffect(() => {
        // 1. Title
        const defaultTitle = 'LankaEats Finland — Sri Lankan Food Marketplace';
        const fullTitle = title ? `${title} | LankaEats` : defaultTitle;
        document.title = fullTitle;

        // Helper to update or create meta tags
        const setMetaTag = (nameAttr, nameVal, contentVal) => {
            if (!contentVal) return;
            let el = document.querySelector(`meta[${nameAttr}="${nameVal}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(nameAttr, nameVal);
                document.head.appendChild(el);
            }
            el.setAttribute('content', contentVal);
        };

        // 2. Meta Description
        setMetaTag(
            'name',
            'description',
            description ||
            'Discover and order authentic Sri Lankan food, kottu, hoppers, curries, and spices from top Sri Lankan restaurants in Finland. Fast delivery and pickup.'
        );

        // 3. Robots
        setMetaTag(
            'name',
            'robots',
            noindex ? 'noindex, follow' : 'index, follow'
        );

        // 4. Canonical URL
        const domain = 'https://lankaeats.fi';
        const href = canonicalUrl
            ? canonicalUrl.startsWith('http')
                ? canonicalUrl
                : `${domain}${canonicalUrl}`
            : domain + window.location.pathname;

        let canonicalEl = document.querySelector('link[rel="canonical"]');
        if (!canonicalEl) {
            canonicalEl = document.createElement('link');
            canonicalEl.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalEl);
        }
        canonicalEl.setAttribute('href', href);

        // 5. Open Graph
        const ogTitle = og.title || fullTitle;
        const ogDesc = og.description || description;
        const ogUrl = og.url || href;
        const ogImage = og.image || `${domain}/icons/icon-512.png`;
        const ogType = og.type || 'website';

        setMetaTag('property', 'og:title', ogTitle);
        setMetaTag('property', 'og:description', ogDesc);
        setMetaTag('property', 'og:url', ogUrl);
        setMetaTag('property', 'og:image', ogImage);
        setMetaTag('property', 'og:type', ogType);
        setMetaTag('property', 'og:site_name', 'LankaEats');

        // Twitter Cards
        setMetaTag('name', 'twitter:card', 'summary_large_image');
        setMetaTag('name', 'twitter:title', ogTitle);
        setMetaTag('name', 'twitter:description', ogDesc);
        setMetaTag('name', 'twitter:image', ogImage);

        // 6. JSON-LD Structured Data
        let scriptEl = /** @type {HTMLScriptElement | null} */ (document.getElementById('json-ld-structured-data'));
        if (jsonLd) {
            if (!scriptEl) {
                scriptEl = document.createElement('script');
                scriptEl.id = 'json-ld-structured-data';
                scriptEl.type = 'application/ld+json';
                document.head.appendChild(scriptEl);
            }
            scriptEl.textContent = JSON.stringify(jsonLd);
        } else if (scriptEl) {
            scriptEl.remove();
        }

        // Cleanup on unmount / route change
        return () => {
            // Document title resets on next page mount, script cleanup handled
        };
    }, [title, description, canonicalUrl, noindex, og, jsonLd]);

    return null;
}
