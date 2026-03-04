import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FALLBACK_PATH = path.resolve(__dirname, '../data/schedule-fallback.json');
const CACHE_TTL = 5 * 60 * 1000;

let cache = null;
let lastFetch = 0;

function loadFallback() {
  const raw = fs.readFileSync(FALLBACK_PATH, 'utf-8');
  return JSON.parse(raw);
}

function parseScheduleTables(html, sourceUrl) {
  const $ = cheerio.load(html);
  const tables = [];

  $('table').each((tableIndex, table) => {
    const rows = [];
    $(table)
      .find('tr')
      .each((_, tr) => {
        const cells = $(tr)
          .find('th,td')
          .map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
          .get()
          .filter(Boolean);

        if (cells.length > 0) {
          rows.push(cells);
        }
      });

    if (rows.length > 0) {
      tables.push({
        index: tableIndex,
        source: sourceUrl,
        rows,
      });
    }
  });

  const pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

  return {
    tables,
    pageText,
  };
}

async function discoverScheduleLinks(homeHtml, origin) {
  const $ = cheerio.load(homeHtml);
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().toLowerCase();
    const key = `${href} ${text}`;
    if (/schedule|calendar|roster|shift|month/i.test(key)) {
      try {
        links.push(new URL(href, origin).toString());
      } catch {
        // ignore malformed urls
      }
    }
  });

  return [...new Set(links)].slice(0, 8);
}

export async function getScheduleData() {
  if (cache && Date.now() - lastFetch < CACHE_TTL) {
    return cache;
  }

  try {
    const homeResponse = await fetch('https://www.effectiveai.net/');
    if (!homeResponse.ok) {
      throw new Error(`Homepage fetch failed: ${homeResponse.status}`);
    }
    const homeHtml = await homeResponse.text();

    const links = await discoverScheduleLinks(homeHtml, 'https://www.effectiveai.net/');
    const pages = [];

    const candidateLinks = links.length > 0 ? links : ['https://www.effectiveai.net/'];

    for (const link of candidateLinks) {
      try {
        const res = await fetch(link);
        if (!res.ok) continue;
        const html = await res.text();
        const parsed = parseScheduleTables(html, link);
        pages.push(parsed);
      } catch {
        // skip individual page errors and keep going
      }
    }

    const mergedTables = pages.flatMap((page) => page.tables);
    const mergedText = pages.map((page) => page.pageText).join(' ').slice(0, 8000);

    const result = {
      source: 'live',
      fetchedAt: new Date().toISOString(),
      links: candidateLinks,
      tables: mergedTables,
      text: mergedText,
    };

    cache = result;
    lastFetch = Date.now();
    return result;
  } catch (err) {
    console.warn('[scraper] Live scrape failed, using fallback:', err.message);
    const fallback = loadFallback();
    cache = {
      ...fallback,
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    };
    lastFetch = Date.now();
    return cache;
  }
}
