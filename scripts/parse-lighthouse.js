import fs from 'fs';
import path from 'path';

function parseLighthouseReport(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);

  const categories = json.categories || {};
  const audits = json.audits || {};

  const scores = {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
  };

  const metrics = {
    fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
    lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
    tbt: audits['total-blocking-time']?.displayValue || 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
    speedIndex: audits['speed-index']?.displayValue || 'N/A',
  };

  const lcpElement = audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet || 'N/A';

  const failedAudits = [];
  Object.keys(audits).forEach(key => {
    const audit = audits[key];
    if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'notApplicable' && audit.scoreDisplayMode !== 'informative') {
      failedAudits.push({
        id: audit.id,
        title: audit.title,
        score: audit.score,
        displayValue: audit.displayValue,
        description: audit.description,
      });
    }
  });

  return {
    url: json.requestedUrl,
    fetchTime: json.fetchTime,
    scores,
    metrics,
    lcpElement,
    failedAuditsCount: failedAudits.length,
    failedAudits,
  };
}

const fileArg = process.argv[2];
if (fileArg) {
  const parsed = parseLighthouseReport(fileArg);
  console.log(JSON.stringify(parsed, null, 2));
}

export { parseLighthouseReport };
