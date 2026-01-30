import { Router } from 'express';
import { getAllBeaches } from '../db.js';
import { getLowTides, getLowTidesWithNextGood } from '../services/tides.js';

const router = Router();

/**
 * Calculate harvest opportunity score for a beach
 * Higher score = better opportunity
 */
function calculateOpportunityScore(beach, lowTides) {
  let score = 0;

  // Status scoring
  if (beach.biotoxin_status === 'open') {
    score += 50;
  } else if (beach.biotoxin_status === 'conditional') {
    score += 25;
  }

  // Season scoring
  if (beach.wdfw_season_open) {
    score += 20;
  }

  // Tide scoring - based on next low tide quality
  if (lowTides.length > 0) {
    const nextLow = lowTides[0];
    if (nextLow.quality === 'excellent') {
      score += 30;
    } else if (nextLow.quality === 'good') {
      score += 20;
    } else if (nextLow.quality === 'fair') {
      score += 10;
    }

    // Bonus for soon-upcoming low tide
    const hoursUntil = (new Date(nextLow.datetime) - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 6) {
      score += 15;
    } else if (hoursUntil < 12) {
      score += 10;
    } else if (hoursUntil < 24) {
      score += 5;
    }
  }

  return score;
}

/**
 * Determine the status color for UI
 */
function getStatusColor(beach, lowTides) {
  if (beach.biotoxin_status === 'closed') {
    return 'red';
  }

  if (beach.biotoxin_status === 'open' && lowTides.length > 0) {
    const nextLow = lowTides[0];
    if (nextLow.quality === 'excellent' || nextLow.quality === 'good') {
      return 'green';
    }
  }

  if (beach.biotoxin_status === 'open' || beach.biotoxin_status === 'conditional') {
    return 'yellow';
  }

  return 'gray';
}

/**
 * GET /api/harvest-windows
 * Returns beaches sorted by best upcoming harvest opportunity
 */
router.get('/', async (req, res) => {
  try {
    const beaches = getAllBeaches();
    const days = parseInt(req.query.days) || 7;

    // Enrich each beach with tide data and calculate scores
    const opportunities = await Promise.all(
      beaches.map(async (beach) => {
        const tideResult = await getLowTidesWithNextGood(beach.tide_station_id, days, 30);
        const lowTides = tideResult.tides;
        const score = calculateOpportunityScore(beach, lowTides);
        const statusColor = getStatusColor(beach, lowTides);

        return {
          id: beach.id,
          name: beach.name,
          county: beach.county,
          region: beach.region,
          lat: beach.lat,
          lon: beach.lon,
          biotoxinStatus: beach.biotoxin_status,
          closureReason: beach.closure_reason,
          speciesAffected: beach.species_affected,
          seasonOpen: beach.wdfw_season_open,
          lastUpdated: beach.last_updated,
          nextLowTides: lowTides.slice(0, 5),
          nextGoodTide: tideResult.nextGoodTide,
          opportunityScore: score,
          statusColor,
          harvestable: beach.biotoxin_status === 'open' && beach.wdfw_season_open,
          species: beach.species || [],
          notes: beach.notes || null,
          tide_station_id: beach.tide_station_id,
          accessType: beach.access_type || 'public'
        };
      })
    );

    // Sort by opportunity score (highest first)
    opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Error calculating harvest windows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate harvest windows'
    });
  }
});

/**
 * GET /api/harvest-windows/calendar
 * Returns calendar view of harvest opportunities
 * Query params:
 *   - days (default 7, max 90)
 *   - startDate (optional, YYYY-MM-DD format, for fetching past data)
 */
router.get('/calendar', async (req, res) => {
  try {
    const beaches = getAllBeaches();
    const days = Math.min(parseInt(req.query.days) || 7, 90);

    // Support custom start date for month view (to include past days)
    let startDate;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate + 'T00:00:00');
    } else {
      startDate = new Date();
    }

    // Build calendar data structure
    const calendar = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      calendar.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        beaches: []
      });
    }

    // Populate calendar with beach opportunities (include all beaches, even closed)
    const includeAll = req.query.includeAll === 'true';

    for (const beach of beaches) {
      // Skip closed beaches unless includeAll is true
      const isClosed = beach.biotoxin_status === 'closed';
      if (isClosed && !includeAll) continue;

      const lowTides = await getLowTides(beach.tide_station_id, days, req.query.startDate || null);

      for (const tide of lowTides) {
        const tideDate = tide.datetime.split(' ')[0];
        const calendarDay = calendar.find(d => d.date === tideDate);

        if (calendarDay && (tide.quality === 'excellent' || tide.quality === 'good')) {
          calendarDay.beaches.push({
            id: beach.id,
            name: beach.name,
            region: beach.region,
            county: beach.county,
            tide_station_id: beach.tide_station_id,
            tideTime: tide.datetime,
            tideHeight: tide.height,
            tideQuality: tide.quality,
            biotoxinStatus: beach.biotoxin_status,
            isClosed
          });
        }
      }
    }

    // Sort beaches by lowest tide height, keep only top 2
    for (const day of calendar) {
      day.beaches.sort((a, b) => a.tideHeight - b.tideHeight);
      day.beaches = day.beaches.slice(0, 2);
    }

    res.json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error building calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build harvest calendar'
    });
  }
});

export default router;
