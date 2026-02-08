import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use persistent disk in production (Render), local data dir in development
const LOCAL_DATA_DIR = join(__dirname, '..', 'data');
const PROD_DATA_DIR = '/var/data';
const DATA_DIR = process.env.NODE_ENV === 'production' && existsSync(PROD_DATA_DIR)
  ? PROD_DATA_DIR
  : LOCAL_DATA_DIR;

const DB_FILE = join(DATA_DIR, 'db.json');
const BEACHES_FILE = join(LOCAL_DATA_DIR, 'beaches.json'); // Always read from local (static data)

// Ensure data directory exists in production
if (process.env.NODE_ENV === 'production' && existsSync(PROD_DATA_DIR)) {
  // Copy beaches.json to persistent disk if not present
  const prodBeachesFile = join(PROD_DATA_DIR, 'beaches.json');
  if (!existsSync(prodBeachesFile) && existsSync(join(LOCAL_DATA_DIR, 'beaches.json'))) {
    copyFileSync(join(LOCAL_DATA_DIR, 'beaches.json'), prodBeachesFile);
  }
}

// Initialize or load database
function loadDb() {
  if (existsSync(DB_FILE)) {
    try {
      return JSON.parse(readFileSync(DB_FILE, 'utf8'));
    } catch {
      return createEmptyDb();
    }
  }
  return createEmptyDb();
}

function createEmptyDb() {
  return {
    beachStatus: {},
    tidePredictions: {}
  };
}

function saveDb(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Load static beach data
function loadBeaches() {
  const data = JSON.parse(readFileSync(BEACHES_FILE, 'utf8'));
  return data.beaches;
}

let db = loadDb();
const beaches = loadBeaches();

// Initialize beach status if not present
for (const beach of beaches) {
  if (!db.beachStatus[beach.id]) {
    db.beachStatus[beach.id] = {
      beach_id: beach.id,
      biotoxin_status: 'unclassified',
      closure_reason: null,
      species_affected: null,
      wdfw_season_open: true,
      last_updated: new Date().toISOString()
    };
  }
}
saveDb(db);

console.log(`Loaded ${beaches.length} beaches`);

// Database query functions
function mergeStatus(beach, status) {
  if (!status) return beach;
  return {
    ...beach,
    biotoxin_status: status.biotoxin_status,
    closure_reason: status.closure_reason,
    species_affected: status.species_affected,
    season_info: status.season_info,
    wdfw_season_open: status.wdfw_season_open,
    last_updated: status.last_updated
  };
}

export function getAllBeaches() {
  return beaches.map(beach => mergeStatus(beach, db.beachStatus[beach.id]))
    .sort((a, b) => {
      if (a.region !== b.region) return a.region.localeCompare(b.region);
      return a.name.localeCompare(b.name);
    });
}

export function getBeachById(id) {
  const beach = beaches.find(b => b.id === id);
  if (!beach) return null;
  return mergeStatus(beach, db.beachStatus[id]);
}

export function updateBeachStatus(beachId, status) {
  db.beachStatus[beachId] = {
    beach_id: beachId,
    biotoxin_status: status.biotoxin_status || 'unclassified',
    closure_reason: status.closure_reason || null,
    species_affected: status.species_affected || null,
    season_info: status.season_info || null,
    wdfw_season_open: status.wdfw_season_open !== false,
    last_updated: new Date().toISOString()
  };
  saveDb(db);
}

export function getTidePredictions(stationId, startDate, endDate) {
  const stationData = db.tidePredictions[stationId] || [];
  return stationData.filter(p => {
    const dt = p.datetime;
    return dt >= startDate && dt <= endDate;
  });
}

export function saveTidePredictions(predictions) {
  for (const pred of predictions) {
    if (!db.tidePredictions[pred.station_id]) {
      db.tidePredictions[pred.station_id] = [];
    }

    // Remove existing prediction for same datetime
    db.tidePredictions[pred.station_id] = db.tidePredictions[pred.station_id]
      .filter(p => p.datetime !== pred.datetime);

    db.tidePredictions[pred.station_id].push(pred);
  }

  // Sort predictions by datetime
  for (const stationId of Object.keys(db.tidePredictions)) {
    db.tidePredictions[stationId].sort((a, b) => a.datetime.localeCompare(b.datetime));
  }

  saveDb(db);
}

export function getUniqueStationIds() {
  return [...new Set(beaches.map(b => b.tide_station_id))];
}

export default {
  getAllBeaches,
  getBeachById,
  updateBeachStatus,
  getTidePredictions,
  saveTidePredictions,
  getUniqueStationIds
};
