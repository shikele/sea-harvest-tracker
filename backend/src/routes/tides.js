import { Router } from 'express';
import { getTides, refreshAllTides, getLowTides, TIDE_STATIONS } from '../services/tides.js';

const router = Router();

/**
 * GET /api/tides/stations
 * Returns list of available tide stations
 */
router.get('/stations', (req, res) => {
  const stations = Object.entries(TIDE_STATIONS).map(([id, info]) => ({
    id,
    ...info
  }));

  res.json({
    success: true,
    data: stations
  });
});

/**
 * GET /api/tides/:stationId
 * Returns tide predictions for a station
 */
router.get('/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const days = parseInt(req.query.days) || 7;

    // Handle undefined or invalid stationId gracefully
    if (!stationId || stationId === 'undefined' || stationId === 'null' || !TIDE_STATIONS[stationId]) {
      return res.json({
        success: true,
        data: {
          stationId: null,
          stationName: 'Unknown',
          predictions: []
        }
      });
    }

    const tideData = await getTides(stationId, days);

    res.json({
      success: true,
      data: tideData
    });
  } catch (error) {
    console.error('Error fetching tides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tide data'
    });
  }
});

/**
 * GET /api/tides/:stationId/low-tides
 * Returns only low tide predictions
 */
router.get('/:stationId/low-tides', async (req, res) => {
  try {
    const { stationId } = req.params;
    const days = parseInt(req.query.days) || 7;

    if (!TIDE_STATIONS[stationId]) {
      return res.status(404).json({
        success: false,
        error: 'Station not found'
      });
    }

    const lowTides = await getLowTides(stationId, days);

    res.json({
      success: true,
      data: {
        stationId,
        stationName: TIDE_STATIONS[stationId].name,
        lowTides
      }
    });
  } catch (error) {
    console.error('Error fetching low tides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low tide data'
    });
  }
});

/**
 * POST /api/tides/refresh
 * Refreshes tide predictions for all stations
 */
router.post('/refresh', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await refreshAllTides(days);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error refreshing tides:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh tide data'
    });
  }
});

export default router;
