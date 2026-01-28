import fetch from 'node-fetch';
import { getAllBeaches, updateBeachStatus } from '../db.js';

const DOH_BASE_URL = 'https://fortress.wa.gov/doh/arcgis/arcgis/rest/services/Biotoxin/Biotoxin_v2/MapServer';

// Layer IDs from DOH ArcGIS service
const LAYERS = {
  BEACHES: 4,
  CLOSURE_ZONES: 12
};

/**
 * Fetch beach closure data from DOH ArcGIS API
 */
async function fetchClosureZones() {
  const url = new URL(`${DOH_BASE_URL}/${LAYERS.CLOSURE_ZONES}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('f', 'json');
  url.searchParams.set('returnGeometry', 'false');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`DOH API error: ${response.status}`);
    }
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching closure zones:', error);
    return [];
  }
}

/**
 * Fetch beach information from DOH ArcGIS API
 */
async function fetchBeachInfo() {
  const url = new URL(`${DOH_BASE_URL}/${LAYERS.BEACHES}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('f', 'json');
  url.searchParams.set('returnGeometry', 'false');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`DOH API error: ${response.status}`);
    }
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching beach info:', error);
    return [];
  }
}

/**
 * Match DOH closure data to our beaches
 * Uses name matching since DOH object IDs may differ
 */
function matchClosuresToBeaches(closures, beachInfoList, ourBeaches) {
  const closureMap = new Map();

  // Build a map of closed areas by name patterns
  for (const closure of closures) {
    const attrs = closure.attributes;
    if (attrs) {
      const name = (attrs.Name || attrs.ZONE_NAME || '').toLowerCase();
      const reason = attrs.Reason || attrs.CLOSURE_REASON || 'Biotoxin';
      const species = attrs.Species || attrs.SPECIES_AFFECTED || 'All shellfish';

      closureMap.set(name, {
        biotoxin_status: 'closed',
        closure_reason: reason,
        species_affected: species
      });
    }
  }

  // Build beach info map
  const beachInfoMap = new Map();
  for (const beach of beachInfoList) {
    const attrs = beach.attributes;
    if (attrs) {
      const name = (attrs.BeachName || attrs.Name || '').toLowerCase();
      beachInfoMap.set(name, attrs);
    }
  }

  // Match our beaches to closure status
  const results = [];
  for (const beach of ourBeaches) {
    const beachNameLower = beach.name.toLowerCase();
    let status = {
      biotoxin_status: 'open',
      closure_reason: null,
      species_affected: null,
      wdfw_season_open: true
    };

    // Check for direct name match in closures
    for (const [closureName, closureStatus] of closureMap) {
      if (beachNameLower.includes(closureName) || closureName.includes(beachNameLower)) {
        status = { ...status, ...closureStatus };
        break;
      }
    }

    // Check regional closures (Hood Canal, South Sound, etc.)
    const regionLower = beach.region.toLowerCase();
    for (const [closureName, closureStatus] of closureMap) {
      if (closureName.includes(regionLower) || closureName.includes(beach.county.toLowerCase())) {
        status = { ...status, ...closureStatus };
        break;
      }
    }

    results.push({
      beachId: beach.id,
      ...status
    });
  }

  return results;
}

/**
 * Refresh biotoxin status for all beaches
 */
export async function refreshBiotoxinData() {
  console.log('Refreshing biotoxin data from DOH...');

  const [closures, beachInfo] = await Promise.all([
    fetchClosureZones(),
    fetchBeachInfo()
  ]);

  const ourBeaches = getAllBeaches();
  const statusUpdates = matchClosuresToBeaches(closures, beachInfo, ourBeaches);

  let updated = 0;
  for (const status of statusUpdates) {
    updateBeachStatus(status.beachId, status);
    updated++;
  }

  console.log(`Updated status for ${updated} beaches`);
  return {
    updated,
    closuresFound: closures.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get current biotoxin status summary
 */
export async function getBiotoxinSummary() {
  const beaches = getAllBeaches();

  const summary = {
    total: beaches.length,
    open: beaches.filter(b => b.biotoxin_status === 'open').length,
    closed: beaches.filter(b => b.biotoxin_status === 'closed').length,
    conditional: beaches.filter(b => b.biotoxin_status === 'conditional').length,
    unknown: beaches.filter(b => b.biotoxin_status === 'unknown').length,
    lastUpdated: beaches[0]?.last_updated || null
  };

  return summary;
}

export default {
  refreshBiotoxinData,
  getBiotoxinSummary
};
