/**
 * Standalone script to refresh tide predictions (120 days)
 * Used by GitHub Actions for monthly scheduled refresh (1st of each month)
 */

import { refreshAllTides } from '../src/services/tides.js';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting monthly tide refresh...`);

  try {
    console.log('Refreshing tide data (120 days)...');
    const tidesResult = await refreshAllTides(120);
    console.log(`Tide data refreshed: ${tidesResult.stations} stations updated`);
  } catch (error) {
    console.error('Failed to refresh tide data:', error.message);
    process.exitCode = 1;
  }

  console.log(`[${new Date().toISOString()}] Monthly tide refresh complete!`);
}

main();
