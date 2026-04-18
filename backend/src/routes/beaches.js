import { Router } from 'express';
import { getAllBeaches, getBeachById } from '../db.js';
import { refreshBiotoxinData, getBiotoxinSummary } from '../services/biotoxin.js';
import { scrapeAllBeaches } from '../services/wdfw-scraper.js';
import { getNextLowTide, getLowTides } from '../services/tides.js';

const router = Router();

/**
 * GET /api/beaches
 * Returns all beaches with current status
 */
router.get('/', async (req, res) => {
  try {
    const beaches = getAllBeaches();

    // Enrich with next low tide info
    const enrichedBeaches = await Promise.all(
      beaches.map(async (beach) => {
        const nextLowTide = await getNextLowTide(beach.tide_station_id);
        return {
          ...beach,
          nextLowTide
        };
      })
    );

    res.json({
      success: true,
      data: enrichedBeaches
    });
  } catch (error) {
    console.error('Error fetching beaches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch beaches'
    });
  }
});

/**
 * GET /api/beaches/summary
 * Returns summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await getBiotoxinSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

/**
 * GET /api/beaches/:id
 * Returns single beach with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const beach = getBeachById(parseInt(req.params.id));

    if (!beach) {
      return res.status(404).json({
        success: false,
        error: 'Beach not found'
      });
    }

    // Get tide data for this beach
    const lowTides = await getLowTides(beach.tide_station_id, 7);

    res.json({
      success: true,
      data: {
        ...beach,
        upcomingLowTides: lowTides
      }
    });
  } catch (error) {
    console.error('Error fetching beach:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch beach'
    });
  }
});

/**
 * POST /api/beaches/refresh
 * Triggers refresh of biotoxin data from DOH
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await refreshBiotoxinData();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error refreshing biotoxin data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh biotoxin data'
    });
  }
});

/**
 * POST /api/beaches/refresh-wdfw
 * Triggers re-scrape of WDFW beach pages for season data
 */
router.post('/refresh-wdfw', async (req, res) => {
  try {
    const result = await scrapeAllBeaches((scraped, noData, errors, total) => {
      // Progress logging only — no streaming response
    });
    res.json({
      success: true,
      data: {
        scraped: Object.keys(result.beaches).length,
        lastUpdated: result.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error refreshing WDFW data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh WDFW season data'
    });
  }
});

export default router;
