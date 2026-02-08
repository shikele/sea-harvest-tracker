/**
 * Standalone script to refresh beach and tide data
 * Used by GitHub Actions for daily scheduled refresh
 */

import { refreshBiotoxinData } from '../src/services/biotoxin.js';
import { refreshAllTides } from '../src/services/tides.js';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting scheduled data refresh...`);

  try {
    console.log('Refreshing tide data...');
    const tidesResult = await refreshAllTides(7);
    console.log(`Tide data refreshed: ${tidesResult.stations} stations updated`);
  } catch (error) {
    console.error('Failed to refresh tide data:', error.message);
    process.exitCode = 1;
  }

  try {
    console.log('Refreshing biotoxin data...');
    const biotoxinResult = await refreshBiotoxinData();
    console.log(`Biotoxin data refreshed: ${biotoxinResult.updated} beaches updated`);
    console.log(`  - Open: ${biotoxinResult.open}`);
    console.log(`  - Closed: ${biotoxinResult.closed}`);
    console.log(`  - Conditional: ${biotoxinResult.conditional}`);
    console.log(`  - Unclassified: ${biotoxinResult.unclassified}`);
  } catch (error) {
    console.error('Failed to refresh biotoxin data:', error.message);
    process.exitCode = 1;
  }

  console.log(`[${new Date().toISOString()}] Data refresh complete!`);
}

main();
