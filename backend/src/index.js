import express from 'express';
import cors from 'cors';
import beachesRouter from './routes/beaches.js';
import tidesRouter from './routes/tides.js';
import harvestRouter from './routes/harvest.js';
import { refreshBiotoxinData } from './services/biotoxin.js';
import { refreshAllTides } from './services/tides.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/beaches', beachesRouter);
app.use('/api/tides', tidesRouter);
app.use('/api/harvest-windows', harvestRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Refresh all data endpoint
app.post('/api/refresh', async (req, res) => {
  try {
    const [biotoxinResult, tidesResult] = await Promise.all([
      refreshBiotoxinData(),
      refreshAllTides(7)
    ]);

    res.json({
      success: true,
      data: {
        biotoxin: biotoxinResult,
        tides: tidesResult
      }
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Sea Harvest Tracker API running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /api/health             - Health check');
  console.log('  GET  /api/beaches            - List all beaches with status');
  console.log('  GET  /api/beaches/summary    - Get status summary');
  console.log('  GET  /api/beaches/:id        - Get single beach details');
  console.log('  POST /api/beaches/refresh    - Refresh biotoxin data');
  console.log('  GET  /api/tides/stations     - List tide stations');
  console.log('  GET  /api/tides/:stationId   - Get tide predictions');
  console.log('  POST /api/tides/refresh      - Refresh tide data');
  console.log('  GET  /api/harvest-windows    - Get beaches by opportunity');
  console.log('  GET  /api/harvest-windows/calendar - 7-day calendar');
  console.log('  POST /api/refresh            - Refresh all data');
  console.log('');

  // Initial data refresh on startup
  console.log('Performing initial data refresh...');
  try {
    await refreshAllTides(7);
    console.log('Tide data refreshed');
  } catch (error) {
    console.error('Failed to refresh tide data:', error.message);
  }

  try {
    await refreshBiotoxinData();
    console.log('Biotoxin data refreshed');
  } catch (error) {
    console.error('Failed to refresh biotoxin data:', error.message);
  }

  console.log('');
  console.log('Server ready!');
});
