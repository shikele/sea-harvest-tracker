import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getDrivingDistances } from '../services/driving.js';

const router = Router();

// Rate limit: 10 requests per minute per IP
const drivingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many distance requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false
});

// GET /api/driving?lat=47.606&lon=-122.332
router.get('/', drivingLimiter, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({
      success: false,
      error: 'lat and lon query parameters are required'
    });
  }

  if (lat < 45 || lat > 49 || lon < -125 || lon > -122) {
    return res.status(400).json({
      success: false,
      error: 'Coordinates must be within Washington State'
    });
  }

  try {
    const distances = await getDrivingDistances(lat, lon);
    res.json({ success: true, data: distances });
  } catch (error) {
    console.error('Driving distance error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate driving distances'
    });
  }
});

export default router;
