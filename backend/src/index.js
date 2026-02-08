import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import beachesRouter from './routes/beaches.js';
import tidesRouter from './routes/tides.js';
import harvestRouter from './routes/harvest.js';
import { refreshBiotoxinData } from './services/biotoxin.js';
import { refreshAllTides } from './services/tides.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
}

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

// Serve frontend for all non-API routes (client-side routing)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const frontendPath = join(__dirname, '../../frontend/dist/index.html');
    res.sendFile(frontendPath);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
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
  console.log('Server ready! Starting background data refresh...');

  // Initial data refresh in background (don't block server startup)
  (async () => {
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

    console.log('Data refresh complete!');
  })();

  // Schedule DAILY biotoxin/health status refresh at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled daily biotoxin refresh...`);

    try {
      const biotoxinResult = await refreshBiotoxinData();
      console.log(`[Scheduled] Biotoxin data refreshed: ${biotoxinResult.updated} beaches updated`);
    } catch (error) {
      console.error('[Scheduled] Failed to refresh biotoxin data:', error.message);
    }

    console.log(`[${new Date().toISOString()}] Scheduled daily biotoxin refresh complete!`);
  }, {
    timezone: 'America/Los_Angeles' // Pacific Time
  });

  // Schedule MONTHLY tide data refresh at 6:00 AM on the 1st of each month
  cron.schedule('0 6 1 * *', async () => {
    console.log(`[${new Date().toISOString()}] Running scheduled monthly tide refresh...`);

    try {
      const tidesResult = await refreshAllTides(120);
      console.log(`[Scheduled] Tide data refreshed (120 days): ${tidesResult.stations} stations`);
    } catch (error) {
      console.error('[Scheduled] Failed to refresh tide data:', error.message);
    }

    console.log(`[${new Date().toISOString()}] Scheduled monthly tide refresh complete!`);
  }, {
    timezone: 'America/Los_Angeles' // Pacific Time
  });

  console.log('Scheduled: Daily biotoxin refresh at 6:00 AM PT, Monthly tide refresh on 1st of month');
});
