import React, { useState, useEffect, useRef } from 'react';
import { getAllComments, postComment, deleteComment } from '../services/api';

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto'
  },
  // Filter bar
  filterBar: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    minWidth: '50px'
  },
  filterSelect: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    color: '#4a5568',
    backgroundColor: 'white',
    flex: 1,
    maxWidth: '250px'
  },
  dateInput: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    color: '#4a5568'
  },
  speciesInput: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    color: '#4a5568',
    flex: 1,
    maxWidth: '200px'
  },
  beachSearchWrap: {
    position: 'relative',
    flex: 1,
    maxWidth: '250px'
  },
  beachSearchInput: {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    color: '#4a5568',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  beachDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0 0 6px 6px',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  beachDropdownItem: {
    padding: '6px 10px',
    fontSize: '13px',
    color: '#4a5568',
    cursor: 'pointer'
  },
  beachSelectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: '#ebf8ff',
    borderRadius: '14px',
    fontSize: '12px',
    color: '#2b6cb0',
    fontWeight: '500'
  },
  badgeClear: {
    background: 'none',
    border: 'none',
    color: '#2b6cb0',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    lineHeight: 1
  },
  clearFiltersBtn: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    backgroundColor: 'white',
    color: '#e53e3e',
    marginLeft: 'auto'
  },
  filterCount: {
    fontSize: '11px',
    color: '#a0aec0'
  },
  // Floating action button
  fab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '14px 24px',
    borderRadius: '28px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(72,187,120,0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 900,
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  // Modal overlay
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    overscrollBehavior: 'contain'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '85vh',
    overflow: 'auto',
    touchAction: 'auto',
    overscrollBehavior: 'contain'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0
  },
  modalClose: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f7fafc',
    color: '#718096',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '20px 24px 24px'
  },
  modalFieldLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '4px',
    display: 'block',
    marginTop: '4px'
  },
  modalInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    color: '#4a5568',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    marginBottom: '4px'
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  formRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
    minWidth: '80px'
  },
  formSelect: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    color: '#4a5568',
    backgroundColor: 'white'
  },
  catchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    resize: 'vertical',
    minHeight: '70px',
    maxHeight: '200px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  charCount: {
    fontSize: '11px',
    color: '#a0aec0',
    textAlign: 'right',
    marginTop: '2px'
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  fileLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#4a5568',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  fileInput: {
    display: 'none'
  },
  submitButton: {
    padding: '8px 20px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    marginLeft: 'auto'
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  previews: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  previewThumb: {
    position: 'relative',
    width: '60px',
    height: '60px',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  previewRemove: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    border: 'none',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1
  },
  honeypot: {
    position: 'absolute',
    left: '-9999px',
    opacity: 0,
    height: 0,
    width: 0,
    overflow: 'hidden'
  },
  namePrompt: {
    padding: '14px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  nameLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '6px',
    display: 'block'
  },
  nameInputRow: {
    display: 'flex',
    gap: '8px'
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none'
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  nameDisplay: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  changeNameBtn: {
    background: 'none',
    border: 'none',
    color: '#4299e1',
    cursor: 'pointer',
    fontSize: '12px',
    padding: 0
  },
  error: {
    fontSize: '12px',
    color: '#e53e3e',
    marginTop: '4px',
    marginBottom: '8px'
  },
  // Comment feed
  feedPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  feedTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: '14px'
  },
  commentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  comment: {
    padding: '14px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px'
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '4px'
  },
  commentAuthor: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#2d3748'
  },
  commentMeta: {
    fontSize: '11px',
    color: '#a0aec0',
    marginLeft: '8px'
  },
  commentBeachName: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#ebf8ff',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#2b6cb0',
    fontWeight: '500',
    marginBottom: '6px'
  },
  commentSpecies: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#f0fff4',
    borderRadius: '10px',
    fontSize: '11px',
    color: '#276749',
    fontWeight: '500',
    marginLeft: '6px',
    marginBottom: '6px'
  },
  commentText: {
    fontSize: '13px',
    color: '#4a5568',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  commentPhotos: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
    flexWrap: 'wrap'
  },
  commentThumb: {
    width: '100px',
    height: '100px',
    borderRadius: '8px',
    objectFit: 'cover',
    cursor: 'pointer',
    border: '1px solid #e2e8f0'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#e53e3e',
    fontSize: '11px',
    cursor: 'pointer',
    padding: '2px 6px',
    whiteSpace: 'nowrap'
  },
  empty: {
    fontSize: '13px',
    color: '#a0aec0',
    textAlign: 'center',
    padding: '24px'
  },
  lightboxOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: '8px',
    objectFit: 'contain'
  }
};

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
    <div style={styles.container}>
      {/* Filter bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>Beach</span>
          {filterBeachId ? (
            <span style={styles.beachSelectedBadge}>
              {beaches.find(b => b.id === parseInt(filterBeachId, 10))?.name || 'Beach'}
              <button style={styles.badgeClear} onClick={() => { setFilterBeachId(''); setBeachSearch(''); }}>&#10005;</button>
            </span>
          ) : (
            <div style={{ ...styles.beachSearchWrap, maxWidth: 'none' }}>
              <input
                type="text"
                value={beachSearch}
                onChange={(e) => { setBeachSearch(e.target.value); setBeachDropdownOpen(true); }}
                onFocus={() => setBeachDropdownOpen(true)}
                onBlur={() => setTimeout(() => setBeachDropdownOpen(false), 150)}
                placeholder="Search beaches..."
                style={styles.beachSearchInput}
              />
              {beachDropdownOpen && (
                <div style={styles.beachDropdown}>
                  {sortedBeaches
                    .filter(b => !beachSearch || b.name.toLowerCase().includes(beachSearch.toLowerCase()))
                    .slice(0, 20)
                    .map(b => (
                      <div
                        key={b.id}
                        style={styles.beachDropdownItem}
                        onMouseDown={() => { setFilterBeachId(String(b.id)); setBeachSearch(''); setBeachDropdownOpen(false); }}
                        onMouseEnter={(e) => { e.target.style.backgroundColor = '#f7fafc'; }}
                        onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}
                      >
                        {b.name}
                      </div>
                    ))
                  }
                  {sortedBeaches.filter(b => !beachSearch || b.name.toLowerCase().includes(beachSearch.toLowerCase())).length === 0 && (
                    <div style={{ ...styles.beachDropdownItem, color: '#a0aec0' }}>No matches</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>Caught</span>
          <select
            style={styles.speciesInput}
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
          >
            <option value="">All species</option>
            <option value="Butter Clams">Butter Clams</option>
            <option value="Cockles">Cockles</option>
            <option value="Eastern Softshell Clams">Eastern Softshell Clams</option>
            <option value="Geoduck">Geoduck</option>
            <option value="Horse Clams">Horse Clams</option>
            <option value="Manila Clams">Manila Clams</option>
            <option value="Mussels">Mussels</option>
            <option value="Native Littleneck Clams">Native Littleneck Clams</option>
            <option value="Oysters">Oysters</option>
            <option value="Razor Clams">Razor Clams</option>
            <option value="Varnish Clams">Varnish Clams</option>
          </select>
        </div>

        <div style={styles.filterRow}>
          <span style={styles.filterLabel}>Date</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={styles.dateInput}
          />
          <span style={{ fontSize: '12px', color: '#a0aec0' }}>to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={styles.dateInput}
          />

          {hasActiveFilters && (
            <button style={styles.clearFiltersBtn} onClick={clearAllFilters}>Clear all</button>
          )}
          <span style={styles.filterCount}>
            {filteredComments.length} of {allComments.length} comments
          </span>
        </div>
      </div>

      {/* Floating "Leave a Comment" button */}
      <button
        style={styles.fab}
        onClick={() => setFormOpen(true)}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>+</span> Leave a Comment
      </button>

      {/* Post comment modal */}
      {formOpen && (
        <div style={styles.modalOverlay} onClick={() => setFormOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Leave a Comment</h3>
              <button style={styles.modalClose} onClick={() => setFormOpen(false)}>&#10005;</button>
            </div>

            <div style={styles.modalBody}>
              {!hasName ? (
                <div style={styles.namePrompt}>
                  <label style={styles.nameLabel}>Set your display name to leave comments:</label>
                  <div style={styles.nameInputRow}>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your name"
                      maxLength={30}
                      style={styles.input}
                      onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    />
                    <button style={styles.saveButton} onClick={saveName}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={styles.nameDisplay}>
                  Posting as <strong>{author}</strong>
                  <button style={styles.changeNameBtn} onClick={() => { setEditingName(true); setNameInput(author); }}>
                    change
                  </button>
                </div>
              )}

              {hasName && (
                <form onSubmit={handleSubmit}>
                  <div style={styles.formGrid}>
                    <label style={styles.modalFieldLabel}>Beach</label>
                    {postBeachId ? (
                      <div style={{ ...styles.modalInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                        <span>{beaches.find(b => b.id === parseInt(postBeachId, 10))?.name}</span>
                        <button
                          type="button"
                          style={styles.badgeClear}
                          onClick={() => { setPostBeachId(''); setPostBeachSearch(''); setSpecies(''); setCustomSpecies(''); }}
                        >&#10005;</button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={postBeachSearch}
                          onChange={(e) => { setPostBeachSearch(e.target.value); setPostBeachDropdownOpen(true); }}
                          onFocus={() => setPostBeachDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setPostBeachDropdownOpen(false), 150)}
                          placeholder="Search beaches..."
                          style={styles.modalInput}
                        />
                        {postBeachDropdownOpen && (
                          <div style={{ ...styles.beachDropdown, borderRadius: '0 0 8px 8px' }}>
                            {sortedBeaches
                              .filter(b => !postBeachSearch || b.name.toLowerCase().includes(postBeachSearch.toLowerCase()))
                              .slice(0, 20)
                              .map(b => (
                                <div
                                  key={b.id}
                                  style={styles.beachDropdownItem}
                                  onMouseDown={() => { setPostBeachId(String(b.id)); setPostBeachSearch(''); setPostBeachDropdownOpen(false); setSpecies(''); setCustomSpecies(''); }}
                                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#f7fafc'; }}
                                  onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}
                                >
                                  {b.name}
                                </div>
                              ))
                            }
                            {sortedBeaches.filter(b => !postBeachSearch || b.name.toLowerCase().includes(postBeachSearch.toLowerCase())).length === 0 && (
                              <div style={{ ...styles.beachDropdownItem, color: '#a0aec0' }}>No matches</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.modalFieldLabel}>What did you catch?</label>
                        <select
                          style={styles.modalInput}
                          value={species}
                          onChange={(e) => { setSpecies(e.target.value); if (e.target.value !== '__other__') setCustomSpecies(''); }}
                        >
                          <option value="">-- Select --</option>
                          <option value="Butter Clams">Butter Clams</option>
                          <option value="Cockles">Cockles</option>
                          <option value="Eastern Softshell Clams">Eastern Softshell Clams</option>
                          <option value="Geoduck">Geoduck</option>
                          <option value="Horse Clams">Horse Clams</option>
                          <option value="Manila Clams">Manila Clams</option>
                          <option value="Mussels">Mussels</option>
                          <option value="Native Littleneck Clams">Native Littleneck Clams</option>
                          <option value="Oysters">Oysters</option>
                          <option value="Razor Clams">Razor Clams</option>
                          <option value="Varnish Clams">Varnish Clams</option>
                          <option value="__other__">Other...</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.modalFieldLabel}>Date</label>
                        <input
                          type="date"
                          value={postDate}
                          onChange={(e) => setPostDate(e.target.value)}
                          max={new Date().toISOString().slice(0, 10)}
                          style={styles.modalInput}
                        />
                      </div>
                    </div>

                    {species === '__other__' && (
                      <input
                        type="text"
                        value={customSpecies}
                        onChange={(e) => setCustomSpecies(e.target.value.substring(0, 100))}
                        placeholder="What did you catch?"
                        style={styles.modalInput}
                        maxLength={100}
                      />
                    )}

                    <label style={styles.modalFieldLabel}>Comment</label>
                    <textarea
                      style={styles.textarea}
                      value={text}
                      onChange={(e) => setText(e.target.value.substring(0, 500))}
                      placeholder="Share your experience..."
                      maxLength={500}
                    />
                    <div style={styles.charCount}>{text.length}/500</div>

                    <div style={styles.honeypot}>
                      <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                    </div>

                    <div style={styles.fileRow}>
                      <label style={styles.fileLabel}>
                        <span>+ Photo</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          style={styles.fileInput}
                          onChange={handleFileChange}
                        />
                      </label>
                      <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                        {files.length}/3 photos (max 5MB each)
                      </span>
                    </div>

                    {previews.length > 0 && (
                      <div style={styles.previews}>
                        {previews.map((src, i) => (
                          <div key={i} style={styles.previewThumb}>
                            <img src={src} alt="" style={styles.previewImg} />
                            <button
                              type="button"
                              style={styles.previewRemove}
                              onClick={() => removeFile(i)}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{
                        ...styles.submitButton,
                        width: '100%',
                        padding: '12px',
                        fontSize: '14px',
                        marginTop: '4px',
                        ...(!text.trim() || !postBeachId || submitting ? styles.submitButtonDisabled : {})
                      }}
                      disabled={!text.trim() || !postBeachId || submitting}
                    >
                      {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              )}

              {error && <div style={styles.error}>{error}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Comments feed */}
      <div style={styles.feedPanel}>
        <h3 style={styles.feedTitle}>
          {hasActiveFilters ? 'Filtered Comments' : 'Recent Comments'}
        </h3>

        {loading ? (
          <div style={styles.empty}>Loading comments...</div>
        ) : allComments.length === 0 ? (
          <div style={styles.empty}>No comments yet. Be the first to share!</div>
        ) : filteredComments.length === 0 ? (
          <div style={styles.empty}>No comments match your filters.</div>
        ) : (
          <div style={styles.commentList}>
            {filteredComments.map((c) => (
              <div key={c.id} style={styles.comment}>
                <div style={styles.commentHeader}>
                  <div>
                    <span style={styles.commentAuthor}>{c.author}</span>
                    <span style={styles.commentMeta}>{formatDate(c.createdAt)}</span>
                  </div>
                  {c.author === author && (
                    <button style={styles.deleteBtn} onClick={() => handleDelete(c)}>
                      delete
                    </button>
                  )}
                </div>
                <div>
                  <span style={styles.commentBeachName}>{c.beachName || `Beach #${c.beachId}`}</span>
                  {c.harvestDate && <span style={styles.commentMeta}>{new Date(c.harvestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {c.species && <span style={styles.commentSpecies}>Caught: {c.species}</span>}
                </div>
                <div style={styles.commentText}>{c.text}</div>
                {c.photos && c.photos.length > 0 && (
                  <div style={styles.commentPhotos}>
                    {c.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={`/${photo}`}
                        alt=""
                        style={styles.commentThumb}
                        onClick={() => setLightboxSrc(`/${photo}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div style={styles.lightboxOverlay} onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" style={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
