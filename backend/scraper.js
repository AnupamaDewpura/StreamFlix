const axios = require('axios');
const cheerio = require('cheerio');
const { getDb } = require('./database');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

async function fetchPage(url, referer) {
  const { data } = await axios.get(url, {
    headers: { ...BROWSER_HEADERS, Referer: referer || url },
    timeout: 30000
  });
  return data;
}

// Extract the stream URL from a DaddyLive watch page
// DaddyLive loads streams through a chain: watch page → iframe → stream info API
async function resolveStreamUrl(channelPageUrl, baseUrl) {
  try {
    console.log(`    Fetching watch page...`);
    const html = await fetchPage(channelPageUrl, baseUrl);
    const $ = cheerio.load(html);

    // Step 1: Find the iframe src on the watch page
    let iframeSrc = null;
    $('iframe').each((i, el) => {
      const src = $(el).attr('src');
      if (src) { iframeSrc = src; return false; }
    });

    // Also try finding it in the page source directly
    if (!iframeSrc) {
      const iframeMatch = html.match(/iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch) iframeSrc = iframeMatch[1];
    }

    // Step 2: If iframe found, fetch it and look for stream info
    if (iframeSrc) {
      const fullIframeUrl = iframeSrc.startsWith('http')
        ? iframeSrc
        : `${baseUrl}/${iframeSrc.replace(/^\//, '')}`;

      console.log(`    Found iframe: ${fullIframeUrl}`);

      try {
        const iframeHtml = await fetchPage(fullIframeUrl, channelPageUrl);

        // Look for .m3u8 directly in iframe HTML
        const m3u8Direct = iframeHtml.match(/https?:\/\/[^\s"'\\,]+\.m3u8[^\s"'\\,]*/);
        if (m3u8Direct) {
          console.log(`    Found .m3u8 in iframe: ${m3u8Direct[0]}`);
          return m3u8Direct[0];
        }

        // Look for stream ID or channel ID in the iframe source
        // DaddyLive often has a pattern like: getStream('channelKey') or streamid = 'xxx'
        const streamIdMatch = iframeHtml.match(/(?:streamid|stream_id|channelid|channel_id|id)\s*[=:]\s*["']([^"']+)["']/i)
          || iframeHtml.match(/getStream\s*\(\s*["']([^"']+)["']\s*\)/i)
          || iframeHtml.match(/(?:channel|stream)\s*:\s*["']([^"']+)["']/i);

        if (streamIdMatch) {
          const streamId = streamIdMatch[1];
          console.log(`    Found stream ID: ${streamId}`);

          // Try the DaddyLive stream info API
          const apiUrls = [
            `${baseUrl}/api/stream/${streamId}`,
            `${baseUrl}/stream/${streamId}`,
            `${baseUrl}/api/channel/${streamId}`,
            `${baseUrl}/api/get_stream?id=${streamId}`,
          ];

          for (const apiUrl of apiUrls) {
            try {
              const apiRes = await axios.get(apiUrl, {
                headers: { ...BROWSER_HEADERS, Referer: fullIframeUrl },
                timeout: 10000
              });
              const apiData = typeof apiRes.data === 'string' ? apiRes.data : JSON.stringify(apiRes.data);
              const apiM3u8 = apiData.match(/https?:\/\/[^\s"'\\,]+\.m3u8[^\s"'\\,]*/);
              if (apiM3u8) {
                console.log(`    Found .m3u8 via API: ${apiM3u8[0]}`);
                return apiM3u8[0];
              }
            } catch { continue; }
          }
        }

        // Look for any JS variable containing a URL
        const jsUrlMatch = iframeHtml.match(/(?:file|source|src|url|stream)\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i);
        if (jsUrlMatch) {
          console.log(`    Found URL in JS: ${jsUrlMatch[1]}`);
          return jsUrlMatch[1];
        }

      } catch (err) {
        console.log(`    Could not fetch iframe: ${err.message}`);
      }
    }

    // Step 3: Try to find .m3u8 directly in the watch page source
    const m3u8InPage = html.match(/https?:\/\/[^\s"'\\,]+\.m3u8[^\s"'\\,]*/);
    if (m3u8InPage) {
      console.log(`    Found .m3u8 in page source: ${m3u8InPage[0]}`);
      return m3u8InPage[0];
    }

    // Step 4: Try DaddyLive's known stream endpoint pattern
    // Extract channel ID from the URL e.g. watch.php?id=60 → id=60
    const channelId = channelPageUrl.match(/[?&]id=(\d+)/)?.[1];
    if (channelId) {
      const knownEndpoints = [
        `${baseUrl}/api/stream_url.php?id=${channelId}`,
        `${baseUrl}/api/channel.php?id=${channelId}`,
        `${baseUrl}/stream_data.php?id=${channelId}`,
        `${baseUrl}/player/index.php?id=${channelId}`,
      ];

      for (const endpoint of knownEndpoints) {
        try {
          const res = await axios.get(endpoint, {
            headers: { ...BROWSER_HEADERS, Referer: channelPageUrl },
            timeout: 10000
          });
          const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          const found = body.match(/https?:\/\/[^\s"'\\,]+\.m3u8[^\s"'\\,]*/);
          if (found) {
            console.log(`    Found .m3u8 via endpoint ${endpoint}: ${found[0]}`);
            return found[0];
          }
        } catch { continue; }
      }
    }

    console.log(`    Could not find stream URL for: ${channelPageUrl}`);
    return null;

  } catch (err) {
    console.error(`    Error resolving ${channelPageUrl}: ${err.message}`);
    return null;
  }
}

async function fetchChannelsFromSite(site) {
  const channelsUrl = `${site.base_url}${site.channels_path}`;
  console.log(`  Fetching channel list from: ${channelsUrl}`);

  try {
    const html = await fetchPage(channelsUrl, site.base_url);
    const $ = cheerio.load(html);
    const channels = [];

    $(site.channel_selector).each((i, el) => {
      const href = $(el).attr('href');
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

function findBestMatch(streamTitle, channels) {
  const title = streamTitle.toLowerCase();
  const exact = channels.find(ch => ch.name.toLowerCase() === title);
  if (exact) return exact;
  const partial = channels.find(ch => {
    const chName = ch.name.toLowerCase();
    const firstWord = title.split(' ')[0];
    return chName.includes(firstWord) || title.includes(chName.split(' ')[0]);
  });
  return partial || null;
}

async function syncSite(site) {
  console.log(`\nSyncing: ${site.name} (${site.base_url})`);
  const db = getDb();
  const channels = await fetchChannelsFromSite(site);
  console.log(`  Found ${channels.length} channels`);

  if (!channels.length) {
    console.log(`  No channels found — check channels_path and channel_selector`);
    return { updated: 0, failed: 0 };
  }

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
        db.prepare('UPDATE streams SET stream_url = ? WHERE id = ?').run(newUrl, stream.id);
        console.log(`  ✓ Updated: ${stream.title} → ${newUrl}`);
        updated++;
      } else {
        console.log(`  — Unchanged: ${stream.title}`);
      }
    } else {
      console.log(`  ✗ Could not resolve: ${stream.title}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  db.prepare('UPDATE source_sites SET last_synced = CURRENT_TIMESTAMP WHERE id = ?').run(site.id);
  return { updated, failed };
}

async function syncAllSites() {
  console.log('\n=============================');
  console.log('Stream sync started');
  console.log('=============================');

  const db = getDb();
  const sites = db.prepare('SELECT * FROM source_sites WHERE is_active = 1').all();

  if (!sites.length) {
    console.log('No active source sites found.');
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

async function syncSiteById(siteId) {
  const db = getDb();
  const site = db.prepare('SELECT * FROM source_sites WHERE id = ?').get(siteId);
  if (!site) { console.log('Site not found'); return; }
  await syncSite(site);
}

module.exports = { syncAllSites, syncSiteById };