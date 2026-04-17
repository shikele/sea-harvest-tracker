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
const CACHE_GRID_SIZE = 0.1; // ~7 mile grid cells — same metro area reuses cache
const BATCH_SIZE = 25; // Google Maps Distance Matrix max destinations per request

function makeCacheKey(lat, lon) {
  return `${Math.round(lat / CACHE_GRID_SIZE)},${Math.round(lon / CACHE_GRID_SIZE)}`;
}

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
  const key = makeCacheKey(userLat, userLon);

  // Check cache
  if (cache[key] && (Date.now() - cache[key].timestamp < CACHE_TTL_MS)) {
    console.log(`Driving cache hit for ${key}`);
    return cache[key].results;
  }

  const beaches = getAllBeaches().filter(b => b.lat && b.lon);
  const origin = `${userLat},${userLon}`;
  const results = {};

  // Batch beaches (Google max 25 destinations per request)
  for (let i = 0; i < beaches.length; i += BATCH_SIZE) {
    const batch = beaches.slice(i, i + BATCH_SIZE);
    const destinations = batch.map(b => `${b.lat},${b.lon}`).join('|');

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
        const beach = batch[j];
        const element = elements[j];

        if (element?.status === 'OK' && element.distance && element.duration) {
          const distMi = element.distance.value / 1609.34; // meters to miles
          const durSec = element.duration.value;

          results[beach.id] = {
            distance_mi: Math.round(distMi * 10) / 10,
            duration_min: Math.round(durSec / 60),
            has_ferry: needsFerry(userLon, beach)
          };
        }
      }
    } catch (err) {
      console.error(`Google Maps batch error: ${err.message}`);
    }
  }

  // Save to cache
  if (Object.keys(results).length > 0) {
    cache[key] = { results, timestamp: Date.now() };
    saveCache(cache);
    console.log(`Cached driving distances for ${key} (${Object.keys(results).length} beaches)`);
  }

  return Object.keys(results).length > 0 ? results : null;
}
