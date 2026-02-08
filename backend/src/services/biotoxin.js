import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllBeaches, updateBeachStatus } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load WDFW status data
let wdfwStatusData = null;
function loadWdfwStatus() {
  if (!wdfwStatusData) {
    try {
      const dataPath = join(__dirname, '../data/wdfw-status.json');
      const data = readFileSync(dataPath, 'utf8');
      wdfwStatusData = JSON.parse(data);
      console.log(`Loaded WDFW status data (last updated: ${wdfwStatusData.lastUpdated})`);
    } catch (error) {
      console.error('Error loading WDFW status data:', error.message);
      wdfwStatusData = { beaches: {} };
    }
  }
  return wdfwStatusData;
}

const DOH_BASE_URL = 'https://fortress.wa.gov/doh/arcgis/arcgis/rest/services/Biotoxin/Biotoxin_v2/MapServer';

// Cache DOH beach status for 24 hours
const DOH_STATUS_CACHE_FILE = join(__dirname, '../data/doh-status-cache.json');
const DOH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Layer IDs from DOH ArcGIS service
const LAYERS = {
  CLOSURE_ZONES: 12
};

// Mapping of DOH closure zone patterns to our beach IDs
const ZONE_TO_BEACH_MAPPING = {
  'potlatch': [1],
  'dosewallips': [2],
  'twanoh': [3],
  'belfair': [4],
  'lilliwaup': [5],
  'scenic beach': [7],
  'triton cove': [32],
  'pleasant harbor': [33],
  'point whitney': [34],
  'quilcene': [35],
  'duckabush': [60],
  'shine': [30, 31],
  'rolling bay': [40],
  'eagle harbor': [40],
  'blakely harbor': [40],
  'west bainbridge': [40],
  'agate passage': [40],
  'port madison': [40],
  'fay bainbridge': [40],
  'blake island': [22],
  'quartermaster harbor': [77, 79],
  'point robinson': [75],
  'dockton': [77],
  'burton acres': [79],
  'tramp harbor': [80],
  'budd inlet': [53],
  'oakland bay': [51],
  'case inlet': [49, 50],
  'penrose point': [11],
  'kopachuck': [12],
  'tolmie': [24],
  'joemma': [25],
  'hope island': [48],
  'jarrell cove': [49],
  'mcmicken': [50],
  'cutts island': [52],
  'burfoot': [53],
  'frye cove': [54],
  'lincoln park': [37],
  'seahurst': [38],
  'richmond beach': [39],
  'manchester': [21],
  'illahee': [41],
  'saltwater': [23],
  'meadowdale': [27],
  'mukilteo': [28],
  'picnic point': [58],
  'howarth': [59],
  'birch bay': [15],
  'larrabee': [29],
  'camano island': [14, 44],
  'kayak point': [26],
  'port gamble': [8],
  'point no point': [9, 10],
  'mystery bay': [18],
  'fort flagler': [19],
  'fort worden': [20],
  'foulweather bluff': [43],
  'kilisut harbor': [19],
  'kitsap memorial': [42],
  'sequim bay': [16],
  'middle ground': [16],
  'dungeness bay': [17],
  'dungeness spit': [17],
  'spencer spit': [55],
  'odlin': [56],
  'penn cove': [57, 69],
  'coupeville': [69],
  'oak harbor': [70],
  'deception pass': [71],
  'fort casey': [45],
  'south whidbey': [46],
  'double bluff': [47],
  'useless bay': [64],
  'possession point': [61],
  'freeland': [62],
  'holmes harbor': [62],
  'mutiny bay': [66],
  'lagoon point': [67],
  'bush point': [68],
  'fort ebey': [74],
  'libbey beach': [73],
  'joseph whidbey': [72],
  'lisabeula': [76],
  'kvi beach': [78],
  'fern cove': [87],
};

/**
 * Extract BIDN (beach ID number) from a WDFW URL
 * e.g. "https://wdfw.wa.gov/places-to-go/shellfish-beaches/220354" -> "220354"
 */
function extractBidn(wdfwUrl) {
  if (!wdfwUrl) return null;
  const match = wdfwUrl.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Load cached DOH beach status if still fresh
 */
function loadDohStatusCache() {
  try {
    if (!existsSync(DOH_STATUS_CACHE_FILE)) return null;
    const cached = JSON.parse(readFileSync(DOH_STATUS_CACHE_FILE, 'utf8'));
    const age = Date.now() - cached.timestamp;
    if (age < DOH_CACHE_TTL_MS) {
      console.log(`Using cached DOH status (${Math.round(age / 60000)} min old)`);
      return new Map(Object.entries(cached.data));
    }
    console.log('DOH status cache expired, will re-fetch');
  } catch {
    // Cache corrupt or unreadable
  }
  return null;
}

/**
 * Save DOH beach status to cache file
 */
function saveDohStatusCache(statusMap) {
  const cacheData = {
    timestamp: Date.now(),
    data: Object.fromEntries(statusMap)
  };
  try {
    writeFileSync(DOH_STATUS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('Failed to save DOH status cache:', error.message);
  }
}

/**
 * Fetch live beach classification status from DOH ArcGIS API (Layer 15: vBeachStatus)
 * Returns a Map of bidn -> { finalstatus, classification, reasondescription, ... }
 * Results are cached for 24 hours to avoid excessive API calls.
 */
async function fetchDohBeachStatus(bidns) {
  if (!bidns || bidns.length === 0) return new Map();

  // Check cache first
  const cached = loadDohStatusCache();
  if (cached) return cached;

  const statusMap = new Map();
  // Query in batches to avoid URL length limits
  const batchSize = 50;
  for (let i = 0; i < bidns.length; i += batchSize) {
    const batch = bidns.slice(i, i + batchSize);
    const whereClause = `bidn IN ('${batch.join("','")}')`;
    const url = new URL(`${DOH_BASE_URL}/15/query`);
    url.searchParams.set('where', whereClause);
    url.searchParams.set('outFields', 'bidn,beachname,finalstatus,classification,reasondescription,growingareastatus,closurezonestatus');
    url.searchParams.set('f', 'json');
    url.searchParams.set('orderByFields', 'bidn');

    try {
      const response = await fetch(url.toString(), { timeout: 15000 });
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.features) continue;

      for (const feature of data.features) {
        const attrs = feature.attributes;
        const bidn = attrs.bidn || attrs.BIDN;
        if (!bidn) continue;
        // If multiple records exist for same bidn, prefer the most restrictive status
        const existing = statusMap.get(bidn);
        const finalStatus = (attrs.finalstatus || attrs.FINALSTATUS || '').toLowerCase().trim();
        if (!existing || statusPriority(finalStatus) > statusPriority(existing.finalstatus)) {
          statusMap.set(bidn, {
            finalstatus: finalStatus,
            classification: (attrs.classification || '').toLowerCase().trim(),
            reason: attrs.reasondescription || null,
            growingareastatus: (attrs.growingareastatus || '').toLowerCase().trim(),
            closurezonestatus: (attrs.closurezonestatus || '').toLowerCase().trim()
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching DOH beach status batch: ${error.message}`);
    }
  }

  // Save to cache
  if (statusMap.size > 0) {
    saveDohStatusCache(statusMap);
  }

  return statusMap;
}

/**
 * Priority ranking for status (higher = more restrictive, takes precedence)
 */
function statusPriority(status) {
  if (!status) return 0;
  if (status.includes('closed')) return 4;
  if (status.includes('unclassified')) return 3;
  if (status.includes('conditional')) return 2;
  if (status.includes('open')) return 1;
  return 0;
}

/**
 * Fetch biotoxin closure zones from DOH ArcGIS API
 */
async function fetchDohBiotoxinClosures() {
  const url = new URL(`${DOH_BASE_URL}/${LAYERS.CLOSURE_ZONES}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('f', 'json');
  url.searchParams.set('returnGeometry', 'false');

  try {
    const response = await fetch(url.toString(), { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`DOH API error: ${response.status}`);
    }
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching DOH biotoxin data:', error.message);
    return null;
  }
}

/**
 * Parse DOH biotoxin closures (species-specific restrictions)
 */
function parseDohBiotoxinClosures(features) {
  const biotoxinClosures = [];

  for (const feature of features) {
    const attrs = feature.attributes;
    if (!attrs) continue;

    const zoneName = (
      attrs['GISDB.SDE.ShellfishClosureZones.C_ZNAME'] ||
      attrs.C_ZNAME || ''
    ).toLowerCase().trim();

    const statusCode = attrs['GISDB.SDE.ShellfishClosureZones.C_STATUS'] ??
                       attrs.C_STATUS ?? null;

    const speciesAffected = (
      attrs['GISDB.sde.vBiotoxinClosures.speciedescription'] ||
      attrs['GISDB.SDE.ShellfishClosureZones.Specie_D'] ||
      attrs.speciedescription ||
      attrs.Specie_D || ''
    );

    // Only process biotoxin closures (C_STATUS 1 or 12)
    // C_STATUS 0 = open, 5 = conditional, 1 = emergency, 12 = biotoxin
    if (statusCode !== 1 && statusCode !== 12) continue;

    const speciesLower = speciesAffected.toLowerCase();
    const isAllSpecies = (speciesLower.includes('all species') || speciesLower === '' || speciesLower === 'none')
      && !speciesLower.includes('excluding') && !speciesLower.includes('except');

    biotoxinClosures.push({
      zoneName,
      speciesAffected: speciesAffected || 'All Species',
      isAllSpecies,
      statusCode
    });
  }

  return biotoxinClosures;
}

/**
 * Match DOH biotoxin closures to beach IDs
 */
function matchBiotoxinToBeaches(biotoxinClosures, ourBeaches) {
  const beachBiotoxinMap = new Map();

  for (const closure of biotoxinClosures) {
    const affectedBeachIds = new Set();

    if (!closure.zoneName || closure.zoneName.length < 3) continue;

    // Match using zone mapping
    for (const [pattern, beachIds] of Object.entries(ZONE_TO_BEACH_MAPPING)) {
      if (closure.zoneName.includes(pattern) || pattern.includes(closure.zoneName)) {
        beachIds.forEach(id => affectedBeachIds.add(id));
      }
    }

    // Match by beach name
    for (const beach of ourBeaches) {
      const beachNameLower = beach.name.toLowerCase();
      if (beachNameLower.includes(closure.zoneName) && closure.zoneName.length >= 5) {
        affectedBeachIds.add(beach.id);
      }
    }

    // Record biotoxin info for affected beaches
    for (const beachId of affectedBeachIds) {
      const existing = beachBiotoxinMap.get(beachId);
      if (!existing) {
        beachBiotoxinMap.set(beachId, {
          speciesAffected: closure.speciesAffected,
          isAllSpecies: closure.isAllSpecies
        });
      } else {
        // Combine species if multiple closures affect same beach
        if (closure.isAllSpecies) {
          existing.isAllSpecies = true;
          existing.speciesAffected = 'All Species';
        } else if (!existing.isAllSpecies && existing.speciesAffected !== closure.speciesAffected) {
          existing.speciesAffected = `${existing.speciesAffected}, ${closure.speciesAffected}`;
        }
      }
    }
  }

  return beachBiotoxinMap;
}

/**
 * Refresh beach status using WDFW data as primary source, with DOH biotoxin overlay
 */
export async function refreshBiotoxinData() {
  console.log('Refreshing beach status from DOH...');

  const ourBeaches = getAllBeaches();

  // Extract BIDNs from beach URLs for DOH status lookup
  const bidnToBeach = new Map();
  for (const beach of ourBeaches) {
    const bidn = extractBidn(beach.wdfw_url);
    if (bidn) bidnToBeach.set(bidn, beach);
  }

  // Fetch live DOH beach classification status
  const dohStatusMap = await fetchDohBeachStatus([...bidnToBeach.keys()]);
  console.log(`Fetched DOH classification for ${dohStatusMap.size} beaches`);

  // Fetch DOH biotoxin closures (species-specific restrictions)
  const dohFeatures = await fetchDohBiotoxinClosures();
  const biotoxinClosures = dohFeatures ? parseDohBiotoxinClosures(dohFeatures) : [];
  console.log(`Found ${biotoxinClosures.length} DOH biotoxin closures`);

  const biotoxinMap = matchBiotoxinToBeaches(biotoxinClosures, ourBeaches);

  // Load WDFW status for supplementary season info only
  const wdfwData = loadWdfwStatus();
  const wdfwByUrl = {};
  for (const entry of Object.values(wdfwData.beaches)) {
    if (entry.wdfwUrl) wdfwByUrl[entry.wdfwUrl] = entry;
  }

  let openCount = 0;
  let closedCount = 0;
  let conditionalCount = 0;
  let unclassifiedCount = 0;

  for (const beach of ourBeaches) {
    const bidn = extractBidn(beach.wdfw_url);
    const dohStatus = bidn ? dohStatusMap.get(bidn) : null;
    const biotoxinInfo = biotoxinMap.get(beach.id);
    const wdfwInfo = beach.wdfw_url ? wdfwByUrl[beach.wdfw_url] : null;

    let finalStatus = 'unclassified';
    let closureReason = null;
    let speciesAffected = null;
    let seasonInfo = wdfwInfo?.season || null;

    if (dohStatus) {
      const dohFinal = dohStatus.finalstatus;

      if (dohFinal.includes('closed')) {
        finalStatus = 'closed';
        closureReason = dohStatus.reason || 'DOH Closure';
      } else if (dohFinal.includes('open') && !dohFinal.includes('conditional')) {
        // DOH says open - check for biotoxin overlay
        if (biotoxinInfo) {
          if (biotoxinInfo.isAllSpecies) {
            finalStatus = 'closed';
            closureReason = 'Biotoxin - All Species';
            speciesAffected = 'All Species';
          } else {
            finalStatus = 'conditional';
            closureReason = 'Biotoxin - Species Restriction';
            speciesAffected = biotoxinInfo.speciesAffected;
          }
        } else {
          finalStatus = 'open';
        }
      } else if (dohFinal.includes('conditional')) {
        finalStatus = 'conditional';
        closureReason = dohStatus.reason || 'Conditionally Open';
        if (biotoxinInfo) {
          speciesAffected = biotoxinInfo.speciesAffected;
        }
      } else if (dohFinal.includes('unclassified')) {
        finalStatus = 'unclassified';
        closureReason = 'Unclassified by DOH';
      } else {
        finalStatus = 'unclassified';
        closureReason = 'Unknown DOH status';
      }
    } else {
      // No DOH data - check biotoxin closures
      if (biotoxinInfo) {
        finalStatus = biotoxinInfo.isAllSpecies ? 'closed' : 'conditional';
        closureReason = 'Biotoxin';
        speciesAffected = biotoxinInfo.speciesAffected;
      }
    }

    // Update beach status
    updateBeachStatus(beach.id, {
      biotoxin_status: finalStatus,
      closure_reason: closureReason,
      species_affected: speciesAffected,
      season_info: seasonInfo,
      wdfw_season_open: dohStatus ? !dohStatus.finalstatus.includes('closed') : true
    });

    // Count by status
    if (finalStatus === 'open') openCount++;
    else if (finalStatus === 'closed') closedCount++;
    else if (finalStatus === 'conditional') conditionalCount++;
    else if (finalStatus === 'unclassified') unclassifiedCount++;
  }

  console.log(`Updated status for ${ourBeaches.length} beaches:`);
  console.log(`  - Open: ${openCount}`);
  console.log(`  - Closed: ${closedCount}`);
  console.log(`  - Conditional: ${conditionalCount}`);
  console.log(`  - Unclassified: ${unclassifiedCount}`);

  return {
    updated: ourBeaches.length,
    open: openCount,
    closed: closedCount,
    conditional: conditionalCount,
    unclassified: unclassifiedCount,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get current status summary
 */
export async function getBiotoxinSummary() {
  const beaches = getAllBeaches();

  return {
    total: beaches.length,
    open: beaches.filter(b => b.biotoxin_status === 'open').length,
    closed: beaches.filter(b => b.biotoxin_status === 'closed').length,
    conditional: beaches.filter(b => b.biotoxin_status === 'conditional').length,
    unclassified: beaches.filter(b => b.biotoxin_status === 'unclassified').length,
    lastUpdated: beaches[0]?.last_updated || null
  };
}

export default {
  refreshBiotoxinData,
  getBiotoxinSummary
};
