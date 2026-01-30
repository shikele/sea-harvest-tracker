import fetch from 'node-fetch';
import { getTidePredictions, saveTidePredictions, getUniqueStationIds } from '../db.js';

const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

// Tide station information
export const TIDE_STATIONS = {
  '9447130': { name: 'Seattle', location: 'Central Sound' },
  '9446484': { name: 'Tacoma', location: 'South Sound' },
  '9446807': { name: 'Union, Hood Canal', location: 'Hood Canal' },
  '9444900': { name: 'Port Townsend', location: 'Admiralty Inlet' },
  '9447427': { name: 'Stanwood', location: 'North Sound' },
  '9449211': { name: 'Blaine', location: 'North Sound' },
  '9444090': { name: 'Port Angeles', location: 'Strait of Juan de Fuca' },
  '9446969': { name: 'Olympia', location: 'South Sound' },
  '9449880': { name: 'Friday Harbor', location: 'San Juan Islands' }
};

/**
 * Format date as YYYYMMDD for NOAA API
 */
function formatDate(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Fetch tide predictions from NOAA API
 */
async function fetchTidePredictionsFromNOAA(stationId, beginDate, endDate) {
  const url = new URL(NOAA_BASE_URL);
  url.searchParams.set('station', stationId);
  url.searchParams.set('begin_date', formatDate(beginDate));
  url.searchParams.set('end_date', formatDate(endDate));
  url.searchParams.set('product', 'predictions');
  url.searchParams.set('datum', 'MLLW');
  url.searchParams.set('units', 'english');
  url.searchParams.set('time_zone', 'lst_ldt');
  url.searchParams.set('interval', 'hilo');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status}`);
    }
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.predictions || [];
  } catch (error) {
    console.error(`Error fetching tides for station ${stationId}:`, error);
    return [];
  }
}

/**
 * Get tide predictions for a station, fetching from NOAA if not cached
 * @param stationId - NOAA station ID
 * @param days - Number of days to fetch
 * @param customStartDate - Optional custom start date (for historical data)
 */
export async function getTides(stationId, days = 7, customStartDate = null) {
  const startDate = customStartDate ? new Date(customStartDate) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Check cache first
  let predictions = getTidePredictions(stationId, startStr, endStr + ' 23:59:59');

  // Check if we need to fetch more data
  // Fetch if no data OR if cached data doesn't cover the requested end date
  let needsFetch = predictions.length === 0;
  if (!needsFetch && predictions.length > 0) {
    const lastCachedDate = predictions[predictions.length - 1].datetime.split(' ')[0];
    needsFetch = lastCachedDate < endStr;
  }

  if (needsFetch) {
    console.log(`Fetching tide predictions for station ${stationId} (${days} days)...`);
    const noaaData = await fetchTidePredictionsFromNOAA(stationId, startDate, endDate);

    if (noaaData.length > 0) {
      // Transform and save to cache
      const transformed = noaaData.map(p => ({
        station_id: stationId,
        datetime: p.t,
        height: parseFloat(p.v),
        type: p.type
      }));

      saveTidePredictions(transformed);
      // Re-fetch from cache to get merged data
      predictions = getTidePredictions(stationId, startStr, endStr + ' 23:59:59');
    }
  }

  return {
    stationId,
    stationName: TIDE_STATIONS[stationId]?.name || 'Unknown',
    location: TIDE_STATIONS[stationId]?.location || 'Unknown',
    predictions: predictions.map(p => ({
      datetime: p.datetime,
      height: p.height,
      type: p.type,
      isLowTide: p.type === 'L'
    }))
  };
}

/**
 * Refresh tide predictions for all stations
 */
export async function refreshAllTides(days = 7) {
  const stationIds = getUniqueStationIds();
  console.log(`Refreshing tides for ${stationIds.length} stations...`);

  const results = await Promise.all(
    stationIds.map(id => getTides(id, days))
  );

  return {
    stations: stationIds.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Find the next low tide for a station
 */
export async function getNextLowTide(stationId) {
  const tideData = await getTides(stationId, 3);
  const now = new Date();

  for (const pred of tideData.predictions) {
    const predTime = new Date(pred.datetime);
    if (pred.isLowTide && predTime > now) {
      return {
        datetime: pred.datetime,
        height: pred.height,
        stationId,
        stationName: tideData.stationName
      };
    }
  }

  return null;
}

/**
 * Classify tide quality based on height
 */
function classifyTideQuality(height) {
  if (height < 0) return 'excellent';
  if (height < 1) return 'good';
  if (height < 2) return 'fair';
  return 'poor';
}

/**
 * Get all low tides for a station in the next N days
 * @param stationId - NOAA station ID
 * @param days - Number of days to fetch
 * @param customStartDate - Optional custom start date (for historical data)
 */
export async function getLowTides(stationId, days = 7, customStartDate = null) {
  const tideData = await getTides(stationId, days, customStartDate);

  return tideData.predictions
    .filter(p => p.isLowTide)
    .map(p => ({
      datetime: p.datetime,
      height: p.height,
      quality: classifyTideQuality(p.height)
    }));
}

/**
 * Get low tides with next good tide guarantee
 * If no good/excellent tides in initial period, extends search up to maxDays
 */
export async function getLowTidesWithNextGood(stationId, initialDays = 7, maxDays = 90) {
  // First get tides for initial period
  let tideData = await getTides(stationId, initialDays);
  let lowTides = tideData.predictions
    .filter(p => p.isLowTide)
    .map(p => ({
      datetime: p.datetime,
      height: p.height,
      quality: classifyTideQuality(p.height)
    }));

  // Check if we have any good or excellent tides
  const hasGoodTide = lowTides.some(t => t.quality === 'good' || t.quality === 'excellent');

  // If no good tides found, extend search
  if (!hasGoodTide && initialDays < maxDays) {
    console.log(`No good tides in ${initialDays} days for station ${stationId}, extending search...`);
    tideData = await getTides(stationId, maxDays);
    const allLowTides = tideData.predictions
      .filter(p => p.isLowTide)
      .map(p => ({
        datetime: p.datetime,
        height: p.height,
        quality: classifyTideQuality(p.height)
      }));

    // Find the first good/excellent tide
    const nextGoodTide = allLowTides.find(t => t.quality === 'good' || t.quality === 'excellent');

    if (nextGoodTide) {
      // Return initial period tides plus the next good one (marked as extended)
      const initialPeriodEnd = new Date();
      initialPeriodEnd.setDate(initialPeriodEnd.getDate() + initialDays);

      return {
        tides: lowTides,
        nextGoodTide: {
          ...nextGoodTide,
          isExtended: true
        }
      };
    }
  }

  return {
    tides: lowTides,
    nextGoodTide: lowTides.find(t => t.quality === 'good' || t.quality === 'excellent') || null
  };
}

export default {
  getTides,
  refreshAllTides,
  getNextLowTide,
  getLowTides,
  getLowTidesWithNextGood,
  TIDE_STATIONS
};
