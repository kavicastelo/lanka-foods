import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://lankaeats.fi';

const staticRoutes = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/restaurants', priority: '0.9', changefreq: 'daily' },
    { url: '/about', priority: '0.7', changefreq: 'monthly' },
    { url: '/partner', priority: '0.7', changefreq: 'monthly' },
    { url: '/for-partners', priority: '0.7', changefreq: 'monthly' },
    { url: '/terms', priority: '0.5', changefreq: 'yearly' },
    { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { url: '/contact', priority: '0.6', changefreq: 'monthly' },
];

async function fetchActiveRestaurantSlugs() {
    try {
        const response = await fetch('http://localhost:4000/api/restaurants');
        if (response.ok) {
            const data = await response.json();
            const list = Array.isArray(data) ? data : data.restaurants || [];
            return list
                .filter((r) => r.status === 'active' || r.status === undefined)
                .map((r) => r.slug)
                .filter(Boolean);
        }
    } catch (e) {
        console.warn('Backend API offline during sitemap build, using standard active restaurant slugs fallback.');
    }

    // Default active public restaurant slugs fallback
    return [
        'ceylon-spices-helsinki',
        'kottu-house-helsinki',
        'curry-leaf-espoo',
        'hoppers-and-more-vantaa',
        'lankan-flavour-tampere'
    ];
}

async function generateSitemap() {
    const slugs = await fetchActiveRestaurantSlugs();
    const today = new Date().toISOString().split('T')[0];

    const restaurantRoutes = slugs.map((slug) => ({
        url: `/restaurant/${slug}`,
        priority: '0.8',
        changefreq: 'weekly',
    }));

    const allRoutes = [...staticRoutes, ...restaurantRoutes];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
    .map(
        (r) => `  <url>
    <loc>${DOMAIN}${r.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    )
    .join('\n')}
</urlset>
`;

    const outputPath = path.join(__dirname, '../public/sitemap.xml');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, xml.trim(), 'utf8');

    console.log(`✅ Sitemap successfully generated at public/sitemap.xml with ${allRoutes.length} indexable URLs.`);
}

generateSitemap();
