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
    tidePredictions: {},
    comments: {},
    commentRateLimit: {}
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

// Comments functions
export function getAllComments() {
  if (!db.comments) db.comments = {};
  const all = [];
  for (const beachId of Object.keys(db.comments)) {
    for (const c of db.comments[beachId]) {
      const beach = beaches.find(b => b.id === parseInt(beachId, 10));
      all.push({ ...c, beachName: beach?.name || `Beach #${beachId}` });
    }
  }
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getComments(beachId) {
  if (!db.comments) db.comments = {};
  const comments = db.comments[beachId] || [];
  return [...comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addComment(beachId, comment) {
  if (!db.comments) db.comments = {};
  if (!db.comments[beachId]) db.comments[beachId] = [];
  db.comments[beachId].push(comment);
  saveDb(db);
}

export function deleteComment(beachId, commentId) {
  if (!db.comments || !db.comments[beachId]) return null;
  const index = db.comments[beachId].findIndex(c => c.id === commentId);
  if (index === -1) return null;
  const removed = db.comments[beachId].splice(index, 1)[0];
  saveDb(db);
  return removed;
}

// Rate limit: 1 comment per IP per day
export function canPostComment(ip) {
  if (!db.commentRateLimit) db.commentRateLimit = {};
  const today = new Date().toISOString().slice(0, 10);
  const entry = db.commentRateLimit[ip];
  if (!entry || entry.date !== today) return true;
  return false;
}

export function recordCommentPost(ip) {
  if (!db.commentRateLimit) db.commentRateLimit = {};
  const today = new Date().toISOString().slice(0, 10);
  db.commentRateLimit[ip] = { date: today };
  // Prune stale entries (older than today)
  for (const key of Object.keys(db.commentRateLimit)) {
    if (db.commentRateLimit[key].date !== today) {
      delete db.commentRateLimit[key];
    }
  }
  saveDb(db);
}

export default {
  getAllBeaches,
  getBeachById,
  updateBeachStatus,
  getTidePredictions,
  saveTidePredictions,
  getUniqueStationIds,
  getAllComments,
  getComments,
  addComment,
  deleteComment,
  canPostComment,
  recordCommentPost
};
