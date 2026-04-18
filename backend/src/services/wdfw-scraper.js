import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATUS_FILE = join(__dirname, '../data/wdfw-status.json');
const BEACHES_FILE = join(__dirname, '../../data/beaches.json');

const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

/**
 * Strip HTML tags from a string
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Extract the WDFW Beach Season Information section from page HTML
 * Returns either:
 *   - A string of joined bold texts (single beach)
 *   - A Map of subBeachName -> joined bold texts (multi-beach page)
 */
function extractSeasonSection(html) {
  const sectionMatch = html.match(
    /WDFW Beach Season Information<\/h\d>\s*([\s\S]*?)(?=<h\d[^>]*>|WDFW shellfish seasons indicate|_WDFW shellfish|$)/i
  );
  if (!sectionMatch) return null;
  const section = sectionMatch[1];
  const boldTexts = [];
  const strongRegex = /<strong>([\s\S]*?)<\/strong>/gi;
  let m;
  while ((m = strongRegex.exec(section)) !== null) {
    const text = stripHtml(m[1]).trim();
    // Filter out non-season bold text (noise like "ONLY", "PROHIBITED", "Disclaimer")
    if (text && text.length > 10 &&
        /\b(season|open|closed|harvest|clam|mussel|oyster|year-round)/i.test(text)) {
      boldTexts.push(text);
    }
  }
  if (boldTexts.length === 0) return null;

  // Check if any bold text contains sub-beach patterns like "BeachName: season rule"
  // Pattern: text starts with a beach/place name followed by colon, then season info
  const subBeachPattern = /^(.+?):\s*(.+)$/;

  // Collect all lines that match sub-beach pattern (must have season keywords after colon)
  const subBeachLines = boldTexts.filter(t => {
    const match = t.match(subBeachPattern);
    if (!match) return false;
    const afterColon = match[2];
    return /\b(season|open|closed|harvest|clam|mussel|oyster|year-round)/i.test(afterColon);
  });

  // If we found sub-beach patterns, return a Map
  if (subBeachLines.length >= 2) {
    const subBeachMap = new Map();
    for (const text of subBeachLines) {
      const match = text.match(subBeachPattern);
      const subName = match[1].trim();
      const seasonText = match[2].trim();
      // Collect any continuation lines (bold texts without colon prefix that follow this sub-beach)
      if (!subBeachMap.has(subName)) {
        subBeachMap.set(subName, []);
      }
      subBeachMap.get(subName).push(seasonText);
    }

    // Also add non-sub-beach lines as "general" if any exist
    const generalLines = boldTexts.filter(t => !subBeachLines.includes(t));
    if (generalLines.length > 0) {
      subBeachMap.set('_general', generalLines);
    }

    return subBeachMap;
  }

  return boldTexts.join('\n');
}

/**
 * Parse a date string like "April 1" or "May 31, 2025" into a Date
 */
function parseDate(str, contextYear) {
  const match = str.match(/(\w+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i);
  if (!match) return null;
  const month = MONTH_MAP[match[1].toLowerCase()];
  if (!month) return null;
  const day = parseInt(match[2], 10);
  const year = match[3] ? parseInt(match[3], 10) : contextYear;
  return new Date(year, month - 1, day);
}

/**
 * Parse season text from WDFW page and extract structured data
 *
 * Key patterns:
 * - "Clam, mussel, and oyster seasons OPEN April 1 through May 31, 2025"
 * - "OPEN for harvest year-round"
 * - "CLOSED for harvest year-round"
 * - "Clam and mussel season CLOSED for harvest in 2026 due to decline"
 * - "Oyster season OPEN for harvest year-round" (mixed open/closed)
 */
function parseSeasonText(text) {
  const result = {
    isOpen: true,       // default to open (no restrictions found = open year-round)
    seasonInfo: null,    // human-readable summary
    startDate: null,
    endDate: null,
    rawText: text.trim()
  };

  if (!text) return result;
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Check for complete year-round closure (all species)
  const allClosedYearRound = lines.some(l =>
    /\b(?:clam|mussel|oyster).*seasons?\s+CLOSED\s+(?:for\s+harvest\s+)?year-round/i.test(l)
  );
  if (allClosedYearRound) {
    result.isOpen = false;
    result.seasonInfo = lines[0];
    return result;
  }

  // Check for any "OPEN for harvest year-round"
  const hasYearRoundOpen = lines.some(l =>
    /\bopen\s+(?:for\s+)?harvest\s+year-round/i.test(l)
  );

  // Check for species-specific closures in a specific year
  const closedForYear = lines.filter(l =>
    /closed\s+for\s+harvest\s+in\s+\d{4}/i.test(l)
  );

  // Look for date range patterns: "OPEN [start] through [end]"
  const dateRangePattern = /open\s+(?:(?:for\s+)?harvest\s+)?(?:from\s+)?(.+?)\s+through\s+(.+?)(?:\s+only)?(?:\.|,|$)/i;
  let bestRange = null;

  for (const line of lines) {
    const match = line.match(dateRangePattern);
    if (match) {
      const now = new Date();
      const contextYear = now.getFullYear();
      let endDate = parseDate(match[2], contextYear);
      let startDate = parseDate(match[1], contextYear);

      if (endDate && startDate) {
        // Handle year-wrapping ranges (e.g., Aug 1 through May 15)
        if (startDate > endDate) {
          // Check if we're in the previous cycle (e.g., now is Apr 2026, cycle is Aug 2025 - May 2026)
          const prevStart = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
          if (now >= prevStart && now <= endDate) {
            startDate = prevStart;
          } else {
            // Otherwise use the next cycle (e.g., now is Jun 2026, cycle is Aug 2026 - May 2027)
            endDate = new Date(endDate.getFullYear() + 1, endDate.getMonth(), endDate.getDate());
          }
        }

        if (!bestRange || endDate > bestRange.endDate) {
          bestRange = { startDate, endDate, line };
        }
      }
    }
  }

  // If we found a date range, use it to determine open/closed
  if (bestRange) {
    const now = new Date();
    result.startDate = bestRange.startDate.toISOString().slice(0, 10);
    result.endDate = bestRange.endDate.toISOString().slice(0, 10);
    result.isOpen = now >= bestRange.startDate && now <= bestRange.endDate;
    result.seasonInfo = bestRange.line.replace(/\.\s*$/, '');
  }

  // If there are both open and closed lines (mixed species), beach is partially open
  if (hasYearRoundOpen && closedForYear.length > 0) {
    result.isOpen = true;
    result.seasonInfo = lines.filter(l =>
      /\b(open|closed)\b.*\b(harvest|season|year-round)\b/i.test(l)
    ).join(' | ');
    return result;
  }

  // If only closed lines (no opens) and no date range → fully closed
  if (!bestRange) {
    const openLines = lines.filter(l => /\bopen\b/i.test(l));
    const closedOnlyLines = lines.filter(l => /\bclosed\b/i.test(l) && !/\bopen\b/i.test(l));
    if (closedOnlyLines.length > 0 && openLines.length === 0) {
      result.isOpen = false;
      result.seasonInfo = closedOnlyLines[0];
      return result;
    }
  }

  // Default: include first line as season info if no specific match
  if (!result.seasonInfo && lines.length > 0) {
    result.seasonInfo = lines[0];
  }

  return result;
}

/**
 * Fetch a single WDFW beach page and extract season info
 * If the page has sub-beaches, returns a subBeaches map keyed by sub-beach name
 */
async function scrapeBeach(url) {
  try {
    const response = await fetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'SeaHarvestTracker/1.0 (shellfish season data)',
        'Accept': 'text/html'
      }
    });

    if (response.status === 404) {
      return { status: 'not_found', season: null };
    }

    if (!response.ok) {
      return { status: 'error', error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const seasonSection = extractSeasonSection(html);

    if (!seasonSection) {
      return { status: 'no_season_data', season: null };
    }

    // Check if extractSeasonSection returned a sub-beach Map
    if (seasonSection instanceof Map) {
      const subBeaches = {};
      for (const [subName, lines] of seasonSection) {
        const text = lines.join('\n');
        const parsed = parseSeasonText(text);
        subBeaches[subName] = {
          season: parsed.seasonInfo,
          isOpen: parsed.isOpen,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          rawText: parsed.rawText
        };
      }
      return { status: 'ok', subBeaches, season: null, isOpen: true };
    }

    const parsed = parseSeasonText(seasonSection);
    return {
      status: 'ok',
      season: parsed.seasonInfo,
      isOpen: parsed.isOpen,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      rawText: parsed.rawText
    };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Scrape all WDFW beach pages and save results
 */
export async function scrapeAllBeaches(progressCallback) {
  const beachesData = JSON.parse(readFileSync(BEACHES_FILE, 'utf8'));
  const beaches = beachesData.beaches;

  const results = {
    lastUpdated: new Date().toISOString(),
    beaches: {}
  };

  let scraped = 0;
  let errors = 0;
  let noData = 0;

  // Group beaches by WDFW URL to avoid duplicate scrapes
  const urlToBeaches = new Map();
  for (const beach of beaches) {
    if (!beach.wdfw_url) continue;
    if (!urlToBeaches.has(beach.wdfw_url)) {
      urlToBeaches.set(beach.wdfw_url, []);
    }
    urlToBeaches.get(beach.wdfw_url).push(beach);
  }

  const uniqueUrls = [...urlToBeaches.keys()];

  // Process in small batches to avoid overwhelming the server
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (url) => {
      const result = await scrapeBeach(url);
      const beachesForUrl = urlToBeaches.get(url);
      return { url, beachesForUrl, result };
    });

    const batchResults = await Promise.all(promises);

    for (const { url, beachesForUrl, result } of batchResults) {
      if (result.status === 'ok') {
        if (result.subBeaches) {
          // Page has sub-beaches — match each beach entry to its sub-beach data
          for (const beach of beachesForUrl) {
            const subName = beach.sub_beach || null;
            let matched = null;

            if (subName) {
              // Find best match by checking if sub-beach names contain each other
              for (const [scrapedName, data] of Object.entries(result.subBeaches)) {
                if (scrapedName === '_general') continue;
                const sLower = scrapedName.toLowerCase();
                const bLower = subName.toLowerCase();
                if (sLower.includes(bLower) || bLower.includes(sLower)) {
                  matched = data;
                  break;
                }
              }
            }

            // Use general data if no sub-beach match, or beach has no sub_beach field
            if (!matched && result.subBeaches._general) {
              matched = result.subBeaches._general;
            }

            const cacheKey = subName ? `${url}#${subName}` : url;
            if (matched) {
              results.beaches[cacheKey] = {
                wdfwUrl: url,
                beachName: beach.name,
                beachId: beach.id,
                subBeach: subName,
                season: matched.season,
                isOpen: matched.isOpen,
                startDate: matched.startDate,
                endDate: matched.endDate,
                rawText: matched.rawText
              };
              scraped++;
            } else {
              // No matching sub-beach found — save with general data
              results.beaches[cacheKey] = {
                wdfwUrl: url,
                beachName: beach.name,
                beachId: beach.id,
                subBeach: subName,
                season: null,
                isOpen: true,
                startDate: null,
                endDate: null
              };
              noData++;
            }
          }
        } else {
          // Single beach page — save for all beaches sharing this URL (no sub_beach)
          for (const beach of beachesForUrl) {
            const subName = beach.sub_beach || null;
            const cacheKey = subName ? `${url}#${subName}` : url;
            results.beaches[cacheKey] = {
              wdfwUrl: url,
              beachName: beach.name,
              beachId: beach.id,
              subBeach: subName,
              season: result.season,
              isOpen: result.isOpen,
              startDate: result.startDate,
              endDate: result.endDate,
              rawText: result.rawText
            };
            scraped++;
          }
        }
      } else if (result.status === 'not_found' || result.status === 'no_season_data' || result.status === 'no_url') {
        noData++;
        for (const beach of beachesForUrl) {
          const subName = beach.sub_beach || null;
          const cacheKey = subName ? `${url}#${subName}` : url;
          results.beaches[cacheKey] = {
            wdfwUrl: url,
            beachName: beach.name,
            beachId: beach.id,
            subBeach: subName,
            season: null,
            isOpen: true,
            startDate: null,
            endDate: null
          };
        }
      } else {
        errors++;
        console.error(`Error scraping ${beachesForUrl[0].name}: ${result.error}`);
      }

      if (progressCallback) {
        progressCallback(scraped, noData, errors, beaches.length);
      }
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < uniqueUrls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Save results
  writeFileSync(STATUS_FILE, JSON.stringify(results, null, 2));
  console.log(`WDFW scrape complete: ${scraped} scraped, ${noData} no data, ${errors} errors`);

  return results;
}

/**
 * Load WDFW status data (used by biotoxin.js)
 */
export function loadWdfwStatus() {
  try {
    if (!existsSync(STATUS_FILE)) return { lastUpdated: null, beaches: {} };
    const data = JSON.parse(readFileSync(STATUS_FILE, 'utf8'));
    return data;
  } catch {
    return { lastUpdated: null, beaches: {} };
  }
}

/**
 * Check if a beach is currently in WDFW season based on cached data
 * Supports sub-beaches via optional subBeach parameter
 * Returns { isOpen, seasonInfo }
 */
export function checkWdfwSeason(wdfwUrl, subBeach) {
  const data = loadWdfwStatus();

  // Try sub-beach key first if subBeach is provided
  let entry = null;
  if (subBeach) {
    entry = data.beaches?.[`${wdfwUrl}#${subBeach}`];
  }

  // Fall back to URL-only key
  if (!entry) {
    entry = data.beaches?.[wdfwUrl];
  }

  if (!entry || !entry.season) {
    return { isOpen: true, seasonInfo: null };
  }

  // If we have date ranges, recompute isOpen from current date
  if (entry.startDate && entry.endDate) {
    const now = new Date();
    const start = new Date(entry.startDate + 'T00:00:00');
    const end = new Date(entry.endDate + 'T23:59:59');
    return {
      isOpen: now >= start && now <= end,
      seasonInfo: entry.season
    };
  }

  return {
    isOpen: entry.isOpen !== false,
    seasonInfo: entry.season
  };
}

export default {
  scrapeAllBeaches,
  loadWdfwStatus,
  checkWdfwSeason
};
