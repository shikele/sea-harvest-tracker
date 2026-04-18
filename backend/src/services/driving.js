import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getAllBeaches } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

const CACHE_FILE = join(__dirname, '../data/driving-cache.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEST_GRID_SIZE = 0.02; // ~1.4 mile grid — beaches in same area share one lookup
const BATCH_SIZE = 25; // Google Maps Distance Matrix max destinations per request

function loadCache() {
  try {
    if (!existsSync(CACHE_FILE)) return {};
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error('Failed to save driving cache:', err.message);
  }
}

function evictExpired(cache) {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of Object.entries(cache)) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      delete cache[key];
      evicted++;
    }
  }
  if (evicted > 0) {
    console.log(`Evicted ${evicted} expired driving cache entries`);
    saveCache(cache);
  }
  return cache;
}

// Beach regions on the west side of Puget Sound — need ferry from east side
const WEST_SIDE_REGIONS = [
  'Hood Canal',
  'Admiralty',
  'San Juan Islands',
  'Whidbey Island',
  'Vashon Island',
  'Strait'  // Olympic Peninsula
];

function needsFerry(userLon, beach) {
  // Only flag if user is on the east side of Puget Sound
  if (userLon > -122.55) {
    if (WEST_SIDE_REGIONS.includes(beach.region)) return true;
    // Kitsap county is on the west side even within "Central Sound"
    if (beach.county === 'Kitsap') return true;
  }
  return false;
}

export async function getDrivingDistances(userLat, userLon) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const cache = evictExpired(loadCache());

  const beaches = getAllBeaches().filter(b => b.lat && b.lon);

  // Group beaches by destination grid cell
  const cellToBeaches = new Map();
  for (const beach of beaches) {
    const cellKey = `${Math.round(beach.lat / DEST_GRID_SIZE)},${Math.round(beach.lon / DEST_GRID_SIZE)}`;
    if (!cellToBeaches.has(cellKey)) {
      cellToBeaches.set(cellKey, []);
    }
    cellToBeaches.get(cellKey).push(beach);
  }

  // Check which cells need fresh lookups
  const cellsToFetch = [];
  const cellResults = new Map(); // cellKey -> { distance_mi, duration_min }

  for (const [cellKey, cellBeaches] of cellToBeaches) {
    const cacheKey = `${userLat.toFixed(3)},${userLon.toFixed(3)}->${cellKey}`;
    const cached = cache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      cellResults.set(cellKey, cached.result);
    } else {
      cellsToFetch.push({ cellKey, representative: cellBeaches[0] });
    }
  }

  if (cellsToFetch.length > 0) {
    console.log(`Driving lookup: ${cellsToFetch.length} areas (${cellToBeaches.size} total, ${cellResults.size} cached)`);

    // Batch destination cells (Google max 25 per request)
    for (let i = 0; i < cellsToFetch.length; i += BATCH_SIZE) {
      const batch = cellsToFetch.slice(i, i + BATCH_SIZE);
      const origin = `${userLat},${userLon}`;
      const destinations = batch.map(c => `${c.representative.lat},${c.representative.lon}`).join('|');

      try {
        const url = `${DISTANCE_MATRIX_URL}?origins=${origin}&destinations=${destinations}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Google Maps API error ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.status !== 'OK') {
          console.error(`Google Maps API error: ${data.status} - ${data.error_message || ''}`);
          continue;
        }

        const elements = data.rows?.[0]?.elements || [];

        for (let j = 0; j < elements.length; j++) {
          const { cellKey } = batch[j];
          const element = elements[j];

          if (element?.status === 'OK' && element.distance && element.duration) {
            const distMi = element.distance.value / 1609.34;
            const durSec = element.duration.value;
            const result = {
              distance_mi: Math.round(distMi * 10) / 10,
              duration_min: Math.round(durSec / 60)
            };
            cellResults.set(cellKey, result);

            // Cache per cell
            const cacheKey = `${userLat.toFixed(3)},${userLon.toFixed(3)}->${cellKey}`;
            cache[cacheKey] = { result, timestamp: Date.now() };
          }
        }
      } catch (err) {
        console.error(`Google Maps batch error: ${err.message}`);
      }
    }

    saveCache(cache);
  } else {
    console.log(`Driving cache full hit (${cellToBeaches.size} areas)`);
  }

  // Map cell results back to individual beaches
  const results = {};
  for (const beach of beaches) {
    const cellKey = `${Math.round(beach.lat / DEST_GRID_SIZE)},${Math.round(beach.lon / DEST_GRID_SIZE)}`;
    const cellResult = cellResults.get(cellKey);
    if (cellResult) {
      results[beach.id] = {
        distance_mi: cellResult.distance_mi,
        duration_min: cellResult.duration_min,
        has_ferry: needsFerry(userLon, beach)
      };
    }
  }

  return Object.keys(results).length > 0 ? results : null;
}
