#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const APPS = [
  {
    id: '1169136078',
    slug: 'huckleberry-baby-child',
    outDir: 'Huckleberry',
  },
  {
    id: '441977097',
    slug: 'sprout-pregnancy-3d',
    outDir: 'Sprout-Pregnancy-3D',
  },
  {
    id: '551448817',
    slug: 'sprout-baby-tracker',
    outDir: 'Sprout-Baby-Tracker',
  },
  {
    id: '1444639029',
    slug: 'nara-baby-pregnancy-tracker',
    outDir: 'Nara',
  },
];

const ROOT = path.resolve(process.cwd(), 'Design Samples', 'Competitor Captures');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed download (${response.status}) for ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

function getFileExt(url) {
  const withoutQuery = url.split('?')[0] || '';
  const ext = path.extname(withoutQuery).toLowerCase();
  return ext || '.jpg';
}

async function fetchAppMetadata(appId) {
  const url = `https://itunes.apple.com/lookup?id=${appId}&country=us`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lookup failed for app ${appId}: ${response.status}`);
  }

  const data = await response.json();
  if (!data?.resultCount || !Array.isArray(data.results) || !data.results[0]) {
    throw new Error(`No lookup result for app ${appId}`);
  }

  return data.results[0];
}

async function fetchHtmlScreenshotUrls(trackViewUrl) {
  if (!trackViewUrl) {
    return [];
  }

  const response = await fetch(trackViewUrl);
  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const matches = html.match(/https:\/\/is\d-ssl\.mzstatic\.com[^"'\s]*600x1300bb\.webp/g) || [];
  return Array.from(new Set(matches));
}

async function processApp(app) {
  const appDir = path.join(ROOT, app.outDir);
  await ensureDir(appDir);

  const meta = await fetchAppMetadata(app.id);
  const phoneShots = Array.isArray(meta.screenshotUrls) ? meta.screenshotUrls : [];
  const ipadShots = Array.isArray(meta.ipadScreenshotUrls) ? meta.ipadScreenshotUrls : [];
  const tvShots = Array.isArray(meta.appletvScreenshotUrls) ? meta.appletvScreenshotUrls : [];

  let shots = [
    ...phoneShots.map((url) => ({ url, source: 'iphone' })),
    ...ipadShots.map((url) => ({ url, source: 'ipad' })),
    ...tvShots.map((url) => ({ url, source: 'appletv' })),
  ];

  if (shots.length === 0) {
    const htmlShots = await fetchHtmlScreenshotUrls(meta.trackViewUrl);
    shots = htmlShots.map((url) => ({ url, source: 'html-fallback-iphone' }));
  }

  const metadata = {
    capturedAt: new Date().toISOString(),
    appId: app.id,
    appSlug: app.slug,
    appName: meta.trackName,
    seller: meta.sellerName,
    version: meta.version,
    averageUserRating: meta.averageUserRating,
    userRatingCount: meta.userRatingCount,
    formattedPrice: meta.formattedPrice,
    trackViewUrl: meta.trackViewUrl,
    phoneScreenshotCount: phoneShots.length,
    ipadScreenshotCount: ipadShots.length,
    appletvScreenshotCount: tvShots.length,
    screenshotCount: shots.length,
    screenshotUrls: shots.map((shot) => shot.url),
    note: 'Screenshots pulled via iTunes Lookup API fields with App Store HTML fallback when API arrays are empty.',
  };

  await writeJson(path.join(appDir, 'metadata.json'), metadata);

  for (let i = 0; i < shots.length; i += 1) {
    const shot = shots[i];
    const shotUrl = shot.url;
    const ext = getFileExt(shotUrl);
    const fileName = `${new Date().toISOString().slice(0, 10)}_${app.slug}_${shot.source}-screen-${String(i + 1).padStart(2, '0')}_appstore${ext}`;
    const outPath = path.join(appDir, fileName);
    await downloadFile(shotUrl, outPath);
  }

  return {
    appId: app.id,
    appName: meta.trackName,
    savedTo: appDir,
    screenshotCount: shots.length,
  };
}

async function main() {
  await ensureDir(ROOT);
  const summary = [];

  for (const app of APPS) {
    try {
      const result = await processApp(app);
      summary.push({ ...result, status: 'ok' });
      console.log(`Saved ${result.screenshotCount} screenshots for ${result.appName}`);
    } catch (error) {
      summary.push({ appId: app.id, appSlug: app.slug, status: 'error', error: String(error) });
      console.error(`Failed app ${app.id}: ${String(error)}`);
    }
  }

  const summaryPath = path.join(ROOT, 'appstore-capture-summary.json');
  await writeJson(summaryPath, {
    generatedAt: new Date().toISOString(),
    summary,
  });

  console.log(`Wrote summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
