/**
 * Standalone script to refresh beach biotoxin/health status
 * Used by GitHub Actions for daily scheduled refresh
 */

import { refreshBiotoxinData } from '../src/services/biotoxin.js';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting daily biotoxin refresh...`);

  try {
    console.log('Refreshing biotoxin data from DOH...');
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

  console.log(`[${new Date().toISOString()}] Daily biotoxin refresh complete!`);
}

main();
