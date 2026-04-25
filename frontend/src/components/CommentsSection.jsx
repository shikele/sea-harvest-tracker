import React, { useState, useEffect, useRef } from 'react';
import { getAllComments, postComment, deleteComment } from '../services/api';
import Fab from '@mui/material/Fab';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

export default function CommentsSection({ beaches }) {
  const [allComments, setAllComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBeachId, setFilterBeachId] = useState('');
  const [beachSearch, setBeachSearch] = useState('');
  const [beachDropdownOpen, setBeachDropdownOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');

  // Post form
  const [formOpen, setFormOpen] = useState(false);
  const [postBeachId, setPostBeachId] = useState('');
  const [postBeachSearch, setPostBeachSearch] = useState('');
  const [postBeachDropdownOpen, setPostBeachDropdownOpen] = useState(false);
  const [author, setAuthor] = useState(() => localStorage.getItem('commentAuthor') || '');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [text, setText] = useState('');
  const [species, setSpecies] = useState('');
  const [customSpecies, setCustomSpecies] = useState('');
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAllComments();
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  async function loadAllComments() {
    setLoading(true);
    try {
      const data = await getAllComments();
      setAllComments(data);
    } catch {
      setAllComments([]);
    } finally {
      setLoading(false);
    }
  }

  // Apply filters
  const filteredComments = allComments.filter(c => {
    if (filterBeachId && c.beachId !== parseInt(filterBeachId, 10)) return false;
    if (filterSpecies && c.species !== filterSpecies) return false;
    if (filterDateFrom || filterDateTo) {
      const commentDate = c.createdAt.slice(0, 10);
      if (filterDateFrom && commentDate < filterDateFrom) return false;
      if (filterDateTo && commentDate > filterDateTo) return false;
    }
    return true;
  });

  const hasActiveFilters = filterBeachId || filterDateFrom || filterDateTo || filterSpecies;

  function clearAllFilters() {
    setFilterBeachId('');
    setBeachSearch('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterSpecies('');
  }

  // Name management
  function saveName() {
    const trimmed = nameInput.trim().substring(0, 30);
    if (!trimmed || !/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      setError('Name must be alphanumeric (spaces, hyphens, underscores allowed)');
      return;
    }
    localStorage.setItem('commentAuthor', trimmed);
    setAuthor(trimmed);
    setEditingName(false);
    setError(null);
  }

  // File handling
  function handleFileChange(e) {
    const selected = Array.from(e.target.files || []);
    const total = files.length + selected.length;
    if (total > 3) { setError('Maximum 3 photos per comment'); return; }
    for (const file of selected) {
      if (file.size > 5 * 1024 * 1024) { setError('Each file must be under 5MB'); return; }
    }
    setError(null);
    const newFiles = [...files, ...selected].slice(0, 3);
    setFiles(newFiles);
    setPreviews(newFiles.map(f => URL.createObjectURL(f)));
  }

  function removeFile(index) {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    URL.revokeObjectURL(previews[index]);
    setPreviews(newFiles.map(f => URL.createObjectURL(f)));
  }

  // Submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (!author || !text.trim() || !postBeachId) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('author', author);
    formData.append('text', text.trim());
    formData.append('species', effectiveSpecies);
    formData.append('harvestDate', postDate);
    formData.append('website', '');
    files.forEach(f => formData.append('photos', f));

    try {
      await postComment(parseInt(postBeachId, 10), formData);
      setText('');
      setSpecies('');
      setCustomSpecies('');
      setPostDate(new Date().toISOString().slice(0, 10));
      setFiles([]);
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormOpen(false);
      await loadAllComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Delete
  async function handleDelete(comment) {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(comment.beachId, comment.id, author);
      await loadAllComments();
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const hasName = author && !editingName;
  const sortedBeaches = [...beaches].sort((a, b) => a.name.localeCompare(b.name));

  // The actual species value to submit
  const effectiveSpecies = species === '__other__' ? customSpecies.trim() : species;

  return (
    <Box sx={{ maxWidth: '700px', margin: '0 auto' }}>
      {/* Filter bar */}
      <Box sx={{ backgroundColor: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', minWidth: '50px' }}>Beach</Typography>
          {filterBeachId ? (
            <Chip
              label={beaches.find(b => b.id === parseInt(filterBeachId, 10))?.name || 'Beach'}
              onDelete={() => { setFilterBeachId(''); setBeachSearch(''); }}
              color="primary"
              variant="outlined"
              size="small"
            />
          ) : (
            <Autocomplete
              options={sortedBeaches}
              getOptionLabel={(b) => b.name}
              size="small"
              onChange={(e, val) => { setFilterBeachId(val ? String(val.id) : ''); setBeachSearch(''); }}
              renderInput={(params) => <TextField {...params} placeholder="Search beaches..." />}
              sx={{ flex: 1, maxWidth: 250 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', minWidth: '50px' }}>Caught</Typography>
          <FormControl size="small" sx={{ flex: 1, maxWidth: 200 }}>
            <Select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">All species</MenuItem>
              <MenuItem value="Butter Clams">Butter Clams</MenuItem>
              <MenuItem value="Cockles">Cockles</MenuItem>
              <MenuItem value="Eastern Softshell Clams">Eastern Softshell Clams</MenuItem>
              <MenuItem value="Geoduck">Geoduck</MenuItem>
              <MenuItem value="Horse Clams">Horse Clams</MenuItem>
              <MenuItem value="Manila Clams">Manila Clams</MenuItem>
              <MenuItem value="Mussels">Mussels</MenuItem>
              <MenuItem value="Native Littleneck Clams">Native Littleneck Clams</MenuItem>
              <MenuItem value="Oysters">Oysters</MenuItem>
              <MenuItem value="Razor Clams">Razor Clams</MenuItem>
              <MenuItem value="Varnish Clams">Varnish Clams</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', minWidth: '50px' }}>Date</Typography>
          <TextField
            type="date"
            size="small"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Typography component="span" sx={{ fontSize: '12px', color: '#a0aec0' }}>to</Typography>
          <TextField
            type="date"
            size="small"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {hasActiveFilters && (
            <Button variant="outlined" size="small" color="error" onClick={clearAllFilters} sx={{ ml: 'auto', fontSize: 11 }}>
              Clear all
            </Button>
          )}
          <Typography sx={{ fontSize: '11px', color: '#a0aec0' }}>
            {filteredComments.length} of {allComments.length} comments
          </Typography>
        </Box>
      </Box>

      {/* Floating "Leave a Comment" button */}
      <Fab
        color="secondary"
        variant="extended"
        onClick={() => setFormOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900 }}
      >
        <AddIcon sx={{ mr: 1 }} />
        Leave a Comment
      </Fab>

      {/* Post comment modal */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Leave a Comment
          <IconButton size="small" onClick={() => setFormOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
              {!hasName ? (
                <Box sx={{ padding: '14px', backgroundColor: '#f7fafc', borderRadius: '8px', marginBottom: '12px' }}>
                  <Typography component="label" sx={{ fontSize: '13px', fontWeight: 500, color: '#4a5568', marginBottom: '6px', display: 'block' }}>Set your display name to leave comments:</Typography>
                  <Box sx={{ display: 'flex', gap: '8px' }}>
                    <TextField
                      size="small"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      inputProps={{ maxLength: 30 }}
                      onKeyDown={(e) => e.key === 'Enter' && saveName()}
                      sx={{ flex: 1 }}
                    />
                    <Button variant="contained" size="small" onClick={saveName}>Save</Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ fontSize: '13px', color: '#718096', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Posting as <strong>{author}</strong>
                  <Button variant="text" size="small" onClick={() => { setEditingName(true); setNameInput(author); }} sx={{ fontSize: 12, p: 0, minWidth: 0 }}>
                    change
                  </Button>
                </Box>
              )}

              {hasName && (
                <form onSubmit={handleSubmit}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Typography component="label" sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block', marginTop: '4px' }}>Beach</Typography>
                    {postBeachId ? (
                      <Box sx={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#4a5568', backgroundColor: 'white', boxSizing: 'border-box', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '13px', color: '#4a5568' }}>{beaches.find(b => b.id === parseInt(postBeachId, 10))?.name}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => { setPostBeachId(''); setPostBeachSearch(''); setSpecies(''); setCustomSpecies(''); }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Autocomplete
                        options={sortedBeaches}
                        getOptionLabel={(b) => b.name}
                        size="small"
                        onChange={(e, val) => {
                          if (val) { setPostBeachId(String(val.id)); setSpecies(''); setCustomSpecies(''); }
                        }}
                        renderInput={(params) => <TextField {...params} placeholder="Search beaches..." />}
                      />
                    )}

                    <Box sx={{ display: 'flex', gap: '12px' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography component="label" sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block', marginTop: '4px' }}>What did you catch?</Typography>
                        <FormControl fullWidth size="small">
                          <Select
                            value={species}
                            onChange={(e) => { setSpecies(e.target.value); if (e.target.value !== '__other__') setCustomSpecies(''); }}
                            displayEmpty
                          >
                            <MenuItem value="">-- Select --</MenuItem>
                            <MenuItem value="Butter Clams">Butter Clams</MenuItem>
                            <MenuItem value="Cockles">Cockles</MenuItem>
                            <MenuItem value="Eastern Softshell Clams">Eastern Softshell Clams</MenuItem>
                            <MenuItem value="Geoduck">Geoduck</MenuItem>
                            <MenuItem value="Horse Clams">Horse Clams</MenuItem>
                            <MenuItem value="Manila Clams">Manila Clams</MenuItem>
                            <MenuItem value="Mussels">Mussels</MenuItem>
                            <MenuItem value="Native Littleneck Clams">Native Littleneck Clams</MenuItem>
                            <MenuItem value="Oysters">Oysters</MenuItem>
                            <MenuItem value="Razor Clams">Razor Clams</MenuItem>
                            <MenuItem value="Varnish Clams">Varnish Clams</MenuItem>
                            <MenuItem value="__other__">Other...</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <Box sx={{ flex: '0 0 auto', minWidth: 0 }}>
                        <Typography component="label" sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block', marginTop: '4px' }}>Date</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={postDate}
                          onChange={(e) => setPostDate(e.target.value)}
                          inputProps={{ max: new Date().toISOString().slice(0, 10) }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    </Box>

                    {species === '__other__' && (
                      <TextField
                        fullWidth
                        size="small"
                        value={customSpecies}
                        onChange={(e) => setCustomSpecies(e.target.value.substring(0, 100))}
                        placeholder="What did you catch?"
                        inputProps={{ maxLength: 100 }}
                      />
                    )}

                    <Typography component="label" sx={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block', marginTop: '4px' }}>Comment</Typography>
                    <TextField
                      multiline
                      minRows={3}
                      maxRows={8}
                      fullWidth
                      value={text}
                      onChange={(e) => setText(e.target.value.substring(0, 500))}
                      placeholder="Share your experience..."
                      inputProps={{ maxLength: 500 }}
                      helperText={`${text.length}/500`}
                    />

                    <Box sx={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, overflow: 'hidden' }}>
                      <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button component="label" variant="outlined" size="small" startIcon={<PhotoCameraIcon />}>
                        Add Photos
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          hidden
                          onChange={handleFileChange}
                        />
                      </Button>
                      <Typography sx={{ fontSize: '11px', color: '#a0aec0' }}>
                        {files.length}/3 photos (max 5MB each)
                      </Typography>
                    </Box>

                    {previews.length > 0 && (
                      <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {previews.map((src, i) => (
                          <Box key={i} sx={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' }}>
                            <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <IconButton
                              size="small"
                              onClick={() => removeFile(i)}
                              sx={{
                                position: 'absolute', top: 2, right: 2,
                                bgcolor: 'rgba(0,0,0,0.6)', color: 'white',
                                width: 18, height: 18, '& .MuiSvgIcon-root': { fontSize: 10 }
                              }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      color="secondary"
                      fullWidth
                      disabled={!text.trim() || !postBeachId || submitting}
                      sx={{ mt: '4px', py: 1.5, fontSize: 14 }}
                    >
                      {submitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </Box>
                </form>
              )}

              {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </DialogContent>
      </Dialog>

      {/* Comments feed */}
      <Box sx={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Typography variant="h6" sx={{ fontSize: '15px', fontWeight: 600, color: '#1a202c', marginBottom: '14px' }}>
          {hasActiveFilters ? 'Filtered Comments' : 'Recent Comments'}
        </Typography>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress size={32} />
          </Box>
        ) : allComments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 13 }}>No comments yet. Be the first to share!</Box>
        ) : filteredComments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary', fontSize: 13 }}>No comments match your filters.</Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredComments.map((c) => (
              <Box key={c.id} sx={{ padding: '14px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <Box>
                    <Typography component="span" sx={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{c.author}</Typography>
                    <Typography component="span" sx={{ fontSize: '11px', color: '#a0aec0', marginLeft: '8px' }}>{formatDate(c.createdAt)}</Typography>
                  </Box>
                  {c.author === author && (
                    <IconButton size="small" color="error" onClick={() => handleDelete(c)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Box>
                  <Chip label={c.beachName || `Beach #${c.beachId}`} size="small" color="primary" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                  {c.harvestDate && <Typography component="span" sx={{ fontSize: '11px', color: '#a0aec0', marginLeft: '8px' }}>{new Date(c.harvestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography>}
                  {c.species && <Chip label={`Caught: ${c.species}`} size="small" color="success" variant="outlined" sx={{ ml: 0.5, mb: 0.5 }} />}
                </Box>
                <Box sx={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.text}</Box>
                {c.photos && c.photos.length > 0 && (
                  <Box sx={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {c.photos.map((photo, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={`/${photo}`}
                        alt=""
                        onClick={() => setLightboxSrc(`/${photo}`)}
                        sx={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          border: '1px solid #e2e8f0'
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Lightbox */}
      <Dialog
        open={!!lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.85)', boxShadow: 'none' } }}
      >
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 0 }}>
          {lightboxSrc && <img src={lightboxSrc} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
