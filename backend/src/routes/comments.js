import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { getAllComments, getComments, addComment, deleteComment, getBeachById } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Uploads directory (persistent disk in production)
const uploadsDir = process.env.NODE_ENV === 'production' && existsSync('/var/data')
  ? '/var/data/uploads'
  : join(__dirname, '..', '..', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types and their extensions
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
};

// Multer config with file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ALLOWED_TYPES[file.mimetype];
  if (!allowedExtensions) {
    return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
  const ext = extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('File extension does not match MIME type'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3
  }
});

// Rate limiter for POST
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, error: 'Too many comments. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Sanitize: strip HTML tags
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

// Validate author name: alphanumeric, spaces, hyphens, underscores
function isValidAuthor(name) {
  return /^[a-zA-Z0-9 _-]+$/.test(name);
}

// GET /api/comments — all comments across all beaches
router.get('/', (req, res) => {
  const comments = getAllComments();
  res.json({ success: true, data: comments });
});

// GET /api/comments/:beachId
router.get('/:beachId', (req, res) => {
  const beachId = parseInt(req.params.beachId, 10);
  if (isNaN(beachId)) {
    return res.status(400).json({ success: false, error: 'Invalid beach ID' });
  }

  const comments = getComments(beachId);
  res.json({ success: true, data: comments });
});

// POST /api/comments/:beachId
router.post('/:beachId', commentLimiter, (req, res) => {
  upload.array('photos', 3)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'Each file must be under 5MB' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, error: 'Maximum 3 photos per comment' });
      }
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    // Honeypot check
    if (req.body.website && req.body.website.trim() !== '') {
      // Silently reject (bot detected)
      return res.status(200).json({ success: true, data: { id: 'ok' } });
    }

    const beachId = parseInt(req.params.beachId, 10);
    if (isNaN(beachId)) {
      return res.status(400).json({ success: false, error: 'Invalid beach ID' });
    }

    // Validate beach exists
    const beach = getBeachById(beachId);
    if (!beach) {
      return res.status(404).json({ success: false, error: 'Beach not found' });
    }

    // Validate and sanitize author
    let author = (req.body.author || '').toString();
    author = stripHtml(author).substring(0, 30);
    if (!author || !isValidAuthor(author)) {
      return res.status(400).json({ success: false, error: 'Author name must be alphanumeric (spaces, hyphens, underscores allowed), max 30 characters' });
    }

    // Validate and sanitize text
    let text = (req.body.text || '').toString();
    text = stripHtml(text).substring(0, 500);
    if (!text) {
      return res.status(400).json({ success: false, error: 'Comment text is required' });
    }

    // Validate and sanitize species caught (optional)
    let species = (req.body.species || '').toString();
    species = stripHtml(species).substring(0, 100);

    // Validate harvest date (optional, defaults to today)
    let harvestDate = (req.body.harvestDate || '').toString().substring(0, 10);
    if (harvestDate && !/^\d{4}-\d{2}-\d{2}$/.test(harvestDate)) {
      harvestDate = '';
    }

    // Build photo paths
    const photos = (req.files || []).map(f => `uploads/${f.filename}`);

    const comment = {
      id: uuidv4(),
      beachId,
      author,
      text,
      species: species || '',
      harvestDate: harvestDate || new Date().toISOString().slice(0, 10),
      photos,
      createdAt: new Date().toISOString()
    };

    addComment(beachId, comment);
    res.status(201).json({ success: true, data: comment });
  });
});

// DELETE /api/comments/:beachId/:commentId
router.delete('/:beachId/:commentId', express.json(), (req, res) => {
  const beachId = parseInt(req.params.beachId, 10);
  if (isNaN(beachId)) {
    return res.status(400).json({ success: false, error: 'Invalid beach ID' });
  }

  const { author } = req.body || {};
  if (!author) {
    return res.status(400).json({ success: false, error: 'Author is required for deletion' });
  }

  // Find the comment first to verify author
  const comments = getComments(beachId);
  const comment = comments.find(c => c.id === req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, error: 'Comment not found' });
  }

  if (comment.author !== author) {
    return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
  }

  // Delete uploaded photos from disk
  for (const photoPath of comment.photos || []) {
    // photoPath is like "uploads/abc.jpg" — resolve relative to uploadsDir parent
    const filename = photoPath.replace('uploads/', '');
    const fullPath = join(uploadsDir, filename);
    try {
      if (existsSync(fullPath)) unlinkSync(fullPath);
    } catch {
      // Ignore file deletion errors
    }
  }

  deleteComment(beachId, req.params.commentId);
  res.json({ success: true, data: { deleted: true } });
});

export default router;
