const axios = require('axios');
const cheerio = require('cheerio');
const { getDb } = require('./database');

// Standard browser headers to avoid being blocked
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

// Fetch a page and return its HTML
async function fetchPage(url, referer) {
  const { data } = await axios.get(url, {
    headers: { ...BROWSER_HEADERS, Referer: referer || url },
    timeout: 30000
  });
  return data;
}

const puppeteer = require('puppeteer-core');

// Find Chrome in all the places Railway/Linux might put it
function getChromePath() {
  const fs = require('fs');

  // Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH && 
      fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // Scan puppeteer cache for any installed version
  const cacheBase = '/root/.cache/puppeteer/chrome';
  if (fs.existsSync(cacheBase)) {
    const versions = fs.readdirSync(cacheBase);
    for (const v of versions) {
      const bin = `${cacheBase}/${v}/chrome-linux64/chrome`;
      if (fs.existsSync(bin)) {
        console.log(`  Using Chrome at: ${bin}`);
        return bin;
      }
    }
  }

  // System Chrome fallbacks
  const systemPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      console.log(`  Using system Chrome at: ${p}`);
      return p;
    }
  }

  return null;
}

function diagnoseChrome() {
  const fs = require('fs');
  const checkPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable', 
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/root/.cache/puppeteer',
    '/root/.cache/puppeteer/chrome',
  ];
  console.log('  Chrome diagnosis:');
  console.log('  PUPPETEER_EXECUTABLE_PATH =', process.env.PUPPETEER_EXECUTABLE_PATH || 'NOT SET');
  checkPaths.forEach(p => {
    console.log(`  ${p}: ${fs.existsSync(p) ? 'EXISTS' : 'not found'}`);
  });

  // List what's in the puppeteer cache if it exists
  try {
    const cacheDir = '/root/.cache/puppeteer/chrome';
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir);
      versions.forEach(v => {
        const chromeBin = `/root/.cache/puppeteer/chrome/${v}/chrome-linux64/chrome`;
        console.log(`  Cache version ${v}: ${fs.existsSync(chromeBin) ? 'chrome EXISTS' : 'chrome NOT FOUND'}`);
      });
    }
  } catch(e) {}
}


async function resolveStreamUrl(channelPageUrl, baseUrl) {
  let browser;
  diagnoseChrome
  try {
    const chromePath = getChromePath();
    if (!chromePath) {
      console.error('  Chrome not found. Run: npx puppeteer browsers install chrome');
      return null;
    }

    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ]
    });

    const page = await browser.newPage();
    let foundUrl = null;

    // Set browser headers to look like a real visitor
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ Referer: baseUrl });

    // Intercept all network requests and watch for .m3u8
    page.on('request', request => {
      const url = request.url();
      if (url.includes('.m3u8') && !foundUrl) {
        foundUrl = url;
        console.log(`    Found stream URL: ${url}`);
      }
    });

    // Also watch responses in case the URL is in a redirect
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('.m3u8') && !foundUrl) {
        foundUrl = url;
        console.log(`    Found stream URL (response): ${url}`);
      }
    });

    // Visit the page
    await page.goto(channelPageUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait up to 10 seconds for a .m3u8 request to appear
    if (!foundUrl) {
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (foundUrl) { clearInterval(interval); resolve(); }
        }, 500);
        setTimeout(() => { clearInterval(interval); resolve(); }, 10000);
      });
    }

    // If still not found, try looking in the page source as fallback
    if (!foundUrl) {
      const content = await page.content();
      const m3u8Match = content.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
      if (m3u8Match) foundUrl = m3u8Match[0];
    }

    // Also check for iframe src as last resort
    if (!foundUrl) {
      const iframeSrc = await page.$eval('iframe', el => el.src).catch(() => null);
      if (iframeSrc) foundUrl = iframeSrc;
    }

    return foundUrl;

  } catch (err) {
    console.error(`    Error resolving ${channelPageUrl}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// Scrape the channel list from one source site
async function fetchChannelsFromSite(site) {
  const channelsUrl = `${site.base_url}${site.channels_path}`;
  console.log(`  Fetching channel list from: ${channelsUrl}`);

  try {
    const html = await fetchPage(channelsUrl, site.base_url);
    const $ = cheerio.load(html);
    const channels = [];

    $(site.channel_selector).each((i, el) => {
      const href = $(el).attr('href');

      // Try the link text first, then common child elements, then data attributes
      const name = (
        $(el).find('.card__title').text().trim() ||
        $(el).find('.channel-name, .title, h3, h4').text().trim() ||
        $(el).attr('data-title') ||
        $(el).attr('title') ||
        $(el).text().trim()
      );

      if (href && name && name.length > 1) {
        channels.push({
          name,
          pageUrl: href.startsWith('http')
            ? href
            : `${site.base_url}/${href.replace(/^\//, '')}`
        });
      }
    });

    // Deduplicate by URL
    const seen = new Set();
    return channels.filter(ch => {
      if (seen.has(ch.pageUrl)) return false;
      seen.add(ch.pageUrl);
      return true;
    });

  } catch (err) {
    console.error(`  Failed to fetch from ${site.name}: ${err.message}`);
    return [];
  }
}

// Match a stream title to the closest channel name from the site
function findBestMatch(streamTitle, channels) {
  const title = streamTitle.toLowerCase();

  // Exact match first
  const exact = channels.find(ch => ch.name.toLowerCase() === title);
  if (exact) return exact;

  // Partial match — stream title contains channel name or vice versa
  const partial = channels.find(ch => {
    const chName = ch.name.toLowerCase();
    const firstWord = title.split(' ')[0];
    return chName.includes(firstWord) || title.includes(chName.split(' ')[0]);
  });

  return partial || null;
}

// Sync streams from a single source site
async function syncSite(site) {
  console.log(`\nSyncing: ${site.name} (${site.base_url})`);
  const db = getDb();

  const channels = await fetchChannelsFromSite(site);
  console.log(`  Found ${channels.length} channels`);

  if (!channels.length) {
    console.log(`  No channels found — check the channels_path and channel_selector for this site`);
    return { updated: 0, failed: 0 };
  }

  // Get all streams assigned to this source site
  const streams = db.prepare(`
    SELECT * FROM streams
    WHERE source_website LIKE ?
       OR source_website LIKE ?
  `).all(`%${site.base_url}%`, `%${new URL(site.base_url).hostname}%`);

  console.log(`  Matching against ${streams.length} streams in your database...`);

  let updated = 0;
  let failed = 0;

  for (const stream of streams) {
    const match = findBestMatch(stream.title, channels);

    if (!match) {
      console.log(`  No match found for: ${stream.title}`);
      failed++;
      continue;
    }

    console.log(`  Resolving: ${stream.title} → ${match.pageUrl}`);
    const newUrl = await resolveStreamUrl(match.pageUrl, site.base_url);

    if (newUrl) {
      if (newUrl !== stream.stream_url) {
        db.prepare('UPDATE streams SET stream_url = ? WHERE id = ?')
          .run(newUrl, stream.id);
        console.log(`  ✓ Updated: ${stream.title} → ${newUrl}`);
        updated++;
      } else {
        console.log(`  — Unchanged: ${stream.title} (${stream.stream_url})`);
      }
    } else {
      console.log(`  ✗ Could not resolve URL for: ${stream.title} (tried: ${match.pageUrl})`);
      failed++;
    }

    // Small delay between requests so we don't hammer the server
    await new Promise(r => setTimeout(r, 1200));
  }

  // Update last_synced timestamp
  db.prepare('UPDATE source_sites SET last_synced = CURRENT_TIMESTAMP WHERE id = ?')
    .run(site.id);

  return { updated, failed };
}

// Main sync function — syncs all active source sites
async function syncAllSites() {
  console.log('\n=============================');
  console.log('Stream sync started');
  console.log('=============================');

  const db = getDb();
  const sites = db.prepare('SELECT * FROM source_sites WHERE is_active = 1').all();

  if (!sites.length) {
    console.log('No active source sites found. Add sites in the admin panel.');
    return;
  }

  console.log(`Found ${sites.length} active source site(s)`);
  let totalUpdated = 0;
  let totalFailed = 0;

  for (const site of sites) {
    const { updated, failed } = await syncSite(site);
    totalUpdated += updated;
    totalFailed += failed;
  }

  console.log('\n=============================');
  console.log(`Sync complete — ${totalUpdated} updated, ${totalFailed} unresolved`);
  console.log('=============================\n');
}

// Sync a single site by its ID (for the per-site sync button)
async function syncSiteById(siteId) {
  const db = getDb();
  const site = db.prepare('SELECT * FROM source_sites WHERE id = ?').get(siteId);
  if (!site) { console.log('Site not found'); return; }
  await syncSite(site);
}

module.exports = { syncAllSites, syncSiteById };