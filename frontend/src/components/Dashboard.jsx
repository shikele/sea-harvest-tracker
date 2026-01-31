import React, { useEffect, useState, useCallback } from 'react';
import { getHarvestWindows } from '../services/api';
import BeachCard from './BeachCard';
import TideChart from './TideChart';
import HarvestCalendar from './HarvestCalendar';
import MapView from './MapView';
import SpeciesGuide from './SpeciesGuide';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  desktopGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  beachList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1a202c'
  },
  filterSection: {
    backgroundColor: '#f7fafc',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '16px'
  },
  searchSortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px'
  },
  searchWrapper: {
    position: 'relative',
    flex: '0 0 180px'
  },
  searchIcon: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    opacity: 0.5
  },
  searchInputSmall: {
    width: '100%',
    padding: '6px 10px 6px 28px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: 'white'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none'
  },
  iconButtonActive: {
    backgroundColor: '#805ad5',
    color: 'white',
    borderColor: '#805ad5'
  },
  buttonIcon: {
    fontSize: '12px'
  },
  filterIcon: {
    fontSize: '14px',
    opacity: 0.6,
    marginRight: '4px'
  },
  searchInputCompact: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '10px',
    outline: 'none',
    backgroundColor: 'white'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterGroupRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4a5568',
    marginRight: '4px'
  },
  filterButtonSmall: {
    padding: '4px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    backgroundColor: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none'
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  filterButton: {
    padding: '6px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    backgroundColor: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#4299e1',
    color: 'white',
    borderColor: '#4299e1'
  },
  filterButtonActiveAlt: {
    backgroundColor: '#805ad5',
    color: 'white',
    borderColor: '#805ad5'
  },
  speciesFilterRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px'
  },
  speciesChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    flex: 1
  },
  speciesChip: {
    padding: '3px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: 'white',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#4a5568',
    outline: 'none',
    boxShadow: 'none',
    WebkitTapHighlightColor: 'transparent'
  },
  speciesChipActive: {
    backgroundColor: '#9f7aea',
    color: 'white',
    borderColor: '#9f7aea'
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0'
  },
  sortButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },
  sortButtonActive: {
    backgroundColor: '#805ad5',
    color: 'white',
    borderColor: '#805ad5'
  },
  locationStatus: {
    fontSize: '12px',
    color: '#718096'
  },
  locationError: {
    fontSize: '12px',
    color: '#c53030'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#718096'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#c53030',
    backgroundColor: '#fff5f5',
    borderRadius: '12px'
  },
  selectedBeachPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  closeButton: {
    float: 'right',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#718096'
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  speciesFilterSection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px'
  },
  speciesFilterTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '10px'
  },
  speciesCheckboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  speciesCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#4a5568',
    cursor: 'pointer'
  },
  speciesCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#805ad5'
  },
  clearFiltersButton: {
    padding: '6px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '12px',
    color: '#718096',
    cursor: 'pointer',
    marginLeft: 'auto'
  },
  filterCount: {
    fontSize: '12px',
    color: '#718096',
    marginLeft: '8px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0'
  },
  pageButton: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  pageButtonActive: {
    backgroundColor: '#4299e1',
    color: 'white',
    borderColor: '#4299e1'
  },
  pageButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  pageInfo: {
    fontSize: '13px',
    color: '#718096',
    padding: '0 12px'
  },
  tabContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '0'
  },
  tab: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#718096',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    marginBottom: '-2px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: '#4299e1',
    borderBottomColor: '#4299e1'
  }
};

export default function Dashboard() {
  const [beaches, setBeaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedBeach, setSelectedBeach] = useState(null);
  const [sortMode, setSortMode] = useState('opportunity'); // 'opportunity' or 'distance'
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [accessFilter, setAccessFilter] = useState('all'); // 'all', 'public', 'boat'
  const [activeTab, setActiveTab] = useState('beaches'); // 'beaches' or 'species'
  const [showFullTides, setShowFullTides] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null); // Track date clicked from calendar
  const [calendarDayBeaches, setCalendarDayBeaches] = useState([]); // All suitable beaches for selected day
  const beachesPerPage = 10;

  async function loadData() {
    try {
      const data = await getHarvestWindows();
      setBeaches(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);


  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setLocationLoading(false);
        setSortMode('distance');
      },
      (err) => {
        setLocationLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError('Location permission denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable');
            break;
          case err.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('Unable to get location');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const handleSortByDistance = () => {
    if (sortMode === 'distance') {
      setSortMode('opportunity');
    } else if (userLocation) {
      setSortMode('distance');
    } else {
      requestLocation();
    }
  };

  // Extract unique species from all beaches
  const allSpecies = [...new Set(
    beaches.flatMap(beach =>
      (beach.species || []).map(s => s.name)
    )
  )].sort();

  const handleSpeciesToggle = (speciesName) => {
    setSelectedSpecies(prev =>
      prev.includes(speciesName)
        ? []  // Deselect if clicking the same species
        : [speciesName]  // Single selection - only this species
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSpecies([]);
    setFilter('all');
    setAccessFilter('all');
    setSelectedCalendarDate(null);
    setCalendarDayBeaches([]);
    setCurrentPage(1);
  };

  const handleAccessFilterChange = (value) => {
    setAccessFilter(value);
    setCurrentPage(1);
  };

  const handleBeachSelect = (beach, date = null, allBeachesForDay = null) => {
    // If beach comes from calendar view, it may not have full species data
    // Look up the full beach data from our beaches array
    if (beach && (!beach.species || beach.species.length === 0)) {
      const fullBeach = beaches.find(b => b.id === beach.id);
      if (fullBeach) {
        // Merge calendar-specific data (like tideTime, tideHeight) with full beach data
        setSelectedBeach({ ...fullBeach, ...beach, species: fullBeach.species, notes: fullBeach.notes });
      } else {
        setSelectedBeach(beach);
      }
    } else {
      setSelectedBeach(beach);
    }
    // Track date and all beaches for that day if provided (from calendar click)
    if (date) {
      setSelectedCalendarDate(date);
      setCalendarDayBeaches(allBeachesForDay || []);
    }
    setShowFullTides(false);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (f) => {
    setFilter(f);
    setCurrentPage(1);
  };

  // Calculate distances if user location is available
  const beachesWithDistance = beaches.map((beach) => {
    if (userLocation && beach.lat && beach.lon) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lon,
        beach.lat, beach.lon
      );
      return { ...beach, distance };
    }
    return { ...beach, distance: null };
  });

  const filteredBeaches = beachesWithDistance
    .filter((beach) => {
      // Name search filter
      if (searchQuery && !beach.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Species filter
      if (selectedSpecies.length > 0) {
        const beachSpeciesNames = (beach.species || []).map(s => s.name);
        const hasSelectedSpecies = selectedSpecies.some(s => beachSpeciesNames.includes(s));
        if (!hasSelectedSpecies) return false;
      }
      // Access type filter
      if (accessFilter !== 'all') {
        if (accessFilter === 'public' && beach.accessType === 'boat') return false;
        if (accessFilter === 'boat' && beach.accessType !== 'boat') return false;
      }
      // Status filter
      if (filter === 'all') return true;
      if (filter === 'open') return beach.biotoxinStatus === 'open';
      if (filter === 'conditional') return beach.biotoxinStatus === 'conditional';
      if (filter === 'unclassified') return beach.biotoxinStatus === 'unclassified';
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'distance' && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      // If species selected, sort by tide height (lower is better)
      if (selectedSpecies.length > 0) {
        const getTideHeight = (beach) => {
          // Use direct tide data from calendar if available
          if (beach.tideHeight !== undefined) {
            return beach.tideHeight;
          }
          if (selectedCalendarDate && beach.nextLowTides) {
            // Find tide for the selected date
            const tide = beach.nextLowTides.find(t => {
              const tideDate = new Date(t.datetime);
              const selectedDate = new Date(selectedCalendarDate);
              return tideDate.getFullYear() === selectedDate.getFullYear() &&
                     tideDate.getMonth() === selectedDate.getMonth() &&
                     tideDate.getDate() === selectedDate.getDate();
            });
            return tide ? tide.height : 999;
          }
          // Use next low tide if no date selected
          return beach.nextLowTides?.[0]?.height ?? 999;
        };
        return getTideHeight(a) - getTideHeight(b);
      }
      // Default: sort by opportunity score (already sorted from API)
      return 0;
    });

  const hasActiveFilters = searchQuery || selectedSpecies.length > 0 || filter !== 'all' || accessFilter !== 'all';

  // When a date is selected from calendar, show all suitable beaches for that day
  // Apply status and access filters to calendar beaches as well
  const filteredCalendarBeaches = calendarDayBeaches.filter((beach) => {
    // Search filter
    if (searchQuery && !beach.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Access type filter
    if (accessFilter !== 'all') {
      if (accessFilter === 'public' && beach.accessType === 'boat') return false;
      if (accessFilter === 'boat' && beach.accessType !== 'boat') return false;
    }
    // Status filter
    if (filter === 'all') return true;
    if (filter === 'open') return beach.biotoxinStatus === 'open';
    if (filter === 'conditional') return beach.biotoxinStatus === 'conditional';
    if (filter === 'unclassified') return beach.biotoxinStatus === 'unclassified';
    return true;
  });

  // Use filtered calendar beaches when date is selected, otherwise regular filtered beaches
  const displayBeaches = (selectedCalendarDate && calendarDayBeaches.length > 0)
    ? filteredCalendarBeaches
    : filteredBeaches;

  // Pagination calculations
  const totalPages = Math.ceil(displayBeaches.length / beachesPerPage);
  const startIndex = (currentPage - 1) * beachesPerPage;
  const endIndex = startIndex + beachesPerPage;
  const paginatedBeaches = displayBeaches.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const stats = {
    total: beaches.length,
    open: beaches.filter(b => b.biotoxinStatus === 'open').length,
    conditional: beaches.filter(b => b.biotoxinStatus === 'conditional').length,
    closed: beaches.filter(b => b.biotoxinStatus === 'closed').length,
    unclassified: beaches.filter(b => b.biotoxinStatus === 'unclassified').length
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading beach data...</div>
      </div>
    );
  }

  if (error && beaches.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error loading data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="dashboard-container">
      <div style={styles.header} className="dashboard-header">
        <div>
          <h1 style={styles.title}>Sea Harvest All in One</h1>
        </div>
      </div>

      <div style={styles.tabContainer} className="tab-container">
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'beaches' ? styles.tabActive : {})
          }}
          className="tab-button"
          onClick={() => setActiveTab('beaches')}
        >
          Beaches
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'species' ? styles.tabActive : {})
          }}
          className="tab-button"
          onClick={() => setActiveTab('species')}
        >
          Species Guide
        </button>
      </div>

      {activeTab === 'species' ? (
        <SpeciesGuide />
      ) : (
        <>
      <div style={styles.statsRow} className="stats-row">
        <div style={styles.statCard} className="stat-card">
          <div style={styles.statLabel} className="stat-label">Open</div>
          <div style={{ ...styles.statValue, color: '#48bb78' }} className="stat-value">{stats.open}</div>
        </div>
        <div style={styles.statCard} className="stat-card">
          <div style={styles.statLabel} className="stat-label">Conditional</div>
          <div style={{ ...styles.statValue, color: '#ecc94b' }} className="stat-value">{stats.conditional}</div>
        </div>
        <div style={styles.statCard} className="stat-card">
          <div style={styles.statLabel} className="stat-label">Closed</div>
          <div style={{ ...styles.statValue, color: '#f56565' }} className="stat-value">{stats.closed}</div>
        </div>
        <div style={styles.statCard} className="stat-card">
          <div style={styles.statLabel} className="stat-label">Unclassified</div>
          <div style={{ ...styles.statValue, color: '#a0aec0' }} className="stat-value">{stats.unclassified}</div>
        </div>
      </div>

      <div className="map-container">
        <MapView beaches={filteredBeaches} onBeachClick={handleBeachSelect} userLocation={userLocation} selectedBeach={selectedBeach} />
      </div>

      <div style={styles.mainContent} className="main-content">
        {/* Calendar Section - Order 1 on mobile */}
        <div className="calendar-section" style={{ order: 1 }}>
          <HarvestCalendar
            onBeachClick={handleBeachSelect}
            statusFilter={filter}
            accessFilter={accessFilter}
            selectedSpecies={selectedSpecies}
            allBeaches={beaches}
            allSpecies={allSpecies}
            onSpeciesToggle={handleSpeciesToggle}
          />
        </div>

        {/* Beach Detail Section - Order 2 on mobile */}
        <div className="beach-detail-section" style={{ order: 2 }}>
          {selectedBeach && (
            <div style={styles.selectedBeachPanel} className="selected-beach-panel">
              <button
                style={styles.closeButton}
                onClick={() => setSelectedBeach(null)}
              >
                x
              </button>
              <h3 style={styles.sectionTitle}>{selectedBeach.name}</h3>
              <p style={{ color: '#718096', marginBottom: '16px' }}>
                {selectedBeach.region} - {selectedBeach.county} County
              </p>

              <div style={{ marginBottom: '16px' }}>
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    color:
                      selectedBeach.biotoxinStatus === 'open'
                        ? '#48bb78'
                        : selectedBeach.biotoxinStatus === 'closed'
                        ? '#f56565'
                        : '#ecc94b'
                  }}
                >
                  {selectedBeach.biotoxinStatus.toUpperCase()}
                </span>
              </div>

              {selectedBeach.closureReason && selectedBeach.biotoxinStatus === 'closed' && (
                <div style={{ marginBottom: '16px', color: '#c53030' }}>
                  <strong>Closure Reason:</strong> {selectedBeach.closureReason}
                </div>
              )}

              {selectedBeach.biotoxinStatus === 'conditional' && selectedBeach.speciesAffected && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#fefcbf',
                  borderRadius: '8px',
                  borderLeft: '4px solid #ecc94b'
                }}>
                  <strong style={{ color: '#744210', display: 'block', marginBottom: '4px' }}>
                    Species Restriction:
                  </strong>
                  <span style={{ color: '#744210', fontSize: '14px' }}>
                    {selectedBeach.speciesAffected}
                  </span>
                  <p style={{ color: '#975a16', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>
                    Other species may be harvested. Check current regulations.
                  </p>
                </div>
              )}

              {selectedBeach.species && selectedBeach.species.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>What You Can Catch:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedBeach.species.map((s, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: '#f7fafc',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        <span style={{ fontWeight: '500' }}>{s.name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            backgroundColor: s.abundance === 'excellent' ? '#c6f6d5' :
                                           s.abundance === 'good' ? '#bee3f8' :
                                           s.abundance === 'moderate' ? '#fefcbf' : '#e2e8f0',
                            color: s.abundance === 'excellent' ? '#22543d' :
                                  s.abundance === 'good' ? '#2c5282' :
                                  s.abundance === 'moderate' ? '#744210' : '#4a5568'
                          }}>
                            {s.abundance}
                          </span>
                          <span style={{ color: '#718096', fontSize: '11px' }}>
                            &lt;{s.min_tide_ft}ft
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedBeach.notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
                      {selectedBeach.notes}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowFullTides(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  backgroundColor: '#ebf8ff',
                  border: '1px solid #90cdf4',
                  borderRadius: '8px',
                  color: '#2b6cb0',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '16px' }}>🌊</span>
                View Full Tide Data (14 days)
              </button>

              <TideChart
                stationId={selectedBeach.tide_station_id || beaches.find(b => b.id === selectedBeach.id)?.tide_station_id}
                stationName={selectedBeach.region}
              />
            </div>
          )}

          {!selectedBeach && beaches[0]?.tide_station_id && (
            <TideChart
              stationId={beaches[0].tide_station_id}
              stationName="Hood Canal (Default)"
            />
          )}
        </div>

        {/* Beach List Section - Order 3 on mobile */}
        <div className="beach-list-wrapper" style={{ order: 3 }}>

          <div style={styles.beachList} className="beach-list-section">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: '4px' }} className="section-title">
                {selectedSpecies.length > 0 && selectedCalendarDate ? (
                  `Best beaches to catch ${selectedSpecies.join(', ')} on ${new Date(selectedCalendarDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                ) : sortMode === 'distance' ? 'Closest to me' : 'Beaches by Opportunity'}
              </h2>
              <span style={styles.filterCount}>
                {displayBeaches.length} of {beaches.length}
              </span>
              {hasActiveFilters && (
                <button style={{ ...styles.clearFiltersButton, display: 'block', margin: '8px auto 0' }} className="filter-button" onClick={clearAllFilters}>
                  Clear Filters
                </button>
              )}
            </div>

            <div style={styles.filterSection} className="filter-section">
              <div style={styles.searchSortRow} className="search-sort-row">
                <div style={styles.searchWrapper}>
                  <span style={styles.searchIcon}>&#128269;</span>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={styles.searchInputSmall}
                    className="search-input"
                  />
                </div>
                <button
                  style={{
                    ...styles.iconButton,
                    ...(sortMode === 'distance' ? styles.iconButtonActive : {})
                  }}
                  className="filter-button sort-button"
                  onClick={handleSortByDistance}
                  disabled={locationLoading}
                  title="Sort by distance from your location"
                >
                  <span style={styles.buttonIcon}>&#128205;</span>
                  {locationLoading ? '...' : 'Closest to me'}
                </button>
                {locationError && (
                  <span style={styles.locationError}>{locationError}</span>
                )}
              </div>

              <div style={styles.filterGroup} className="filter-group">
                <div style={styles.filterGroupRow} className="filter-group-row">
                  <span style={styles.filterIcon} title="Filter by status">&#127958;</span>
                  {[
                    { value: 'all', label: 'All', icon: '' },
                    { value: 'open', label: 'Open', icon: '&#128994;' },
                    { value: 'conditional', label: 'Conditional', icon: '&#128993;' },
                    { value: 'unclassified', label: 'Unclassified', icon: '&#9898;' }
                  ].map((f) => (
                    <button
                      key={f.value}
                      style={{
                        ...styles.filterButtonSmall,
                        ...(filter === f.value ? styles.filterButtonActive : {})
                      }}
                      className="filter-button"
                      onClick={() => handleFilterChange(f.value)}
                      dangerouslySetInnerHTML={{ __html: f.icon ? `${f.icon} ${f.label}` : f.label }}
                    />
                  ))}
                </div>
                <div style={styles.filterGroupRow} className="filter-group-row">
                  <span style={styles.filterIcon} title="Filter by access type">&#128739;</span>
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'public', label: 'Road accessible', icon: '&#128663;' },
                    { value: 'boat', label: 'Only by Boat', icon: '&#9973;' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      style={{
                        ...styles.filterButtonSmall,
                        ...(accessFilter === option.value ? styles.filterButtonActiveAlt : {})
                      }}
                      className="filter-button"
                      onClick={() => handleAccessFilterChange(option.value)}
                      dangerouslySetInnerHTML={{ __html: option.icon ? `${option.icon} ${option.label}` : option.label }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {paginatedBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                onClick={handleBeachSelect}
                selectedDate={selectedCalendarDate}
              />
            ))}

            {totalPages > 1 && (
              <div style={styles.pagination} className="pagination">
                <button
                  style={{
                    ...styles.pageButton,
                    ...(currentPage === 1 ? styles.pageButtonDisabled : {})
                  }}
                  className="page-button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        style={{
                          ...styles.pageButton,
                          ...(currentPage === page ? styles.pageButtonActive : {})
                        }}
                        className="page-button"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} style={styles.pageInfo}>...</span>;
                  }
                  return null;
                })}

                <button
                  style={{
                    ...styles.pageButton,
                    ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
                  }}
                  className="page-button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>

                <span style={styles.pageInfo} className="page-info">
                  {startIndex + 1}-{Math.min(endIndex, displayBeaches.length)} of {displayBeaches.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Full Tide Data Modal */}
      {showFullTides && selectedBeach && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowFullTides(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a202c', marginBottom: '4px' }}>
                {selectedBeach.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#718096' }}>
                {selectedBeach.region} - {selectedBeach.county} County
              </p>
            </div>
            <TideChart
              stationId={selectedBeach.tide_station_id || beaches.find(b => b.id === selectedBeach.id)?.tide_station_id}
              stationName={selectedBeach.region}
              days={14}
              expanded={true}
              onClose={() => setShowFullTides(false)}
            />
          </div>
        </div>
      )}

      {/* Footer with resources */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        borderTop: '1px solid #e2e8f0',
        textAlign: 'center',
        color: '#718096',
        fontSize: '13px'
      }}>
        <p style={{ marginBottom: '8px' }}>
          <strong>Resources:</strong>
        </p>
        <p>
          <a
            href="https://wdfw.wa.gov/sites/default/files/fishing/shellfishing/WDFWAnnualBeachSeasonsBarChart.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4299e1', textDecoration: 'none', marginRight: '16px' }}
          >
            WDFW 2026 Beach Seasons (PDF)
          </a>
          <a
            href="https://fortress.wa.gov/doh/eh/portal/odw/si/Shellfish.aspx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4299e1', textDecoration: 'none', marginRight: '16px' }}
          >
            DOH Shellfish Safety Map
          </a>
          <a
            href="https://wdfw.wa.gov/places-to-go/shellfish-beaches"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4299e1', textDecoration: 'none' }}
          >
            WDFW Shellfish Beaches
          </a>
        </p>
        <p style={{ marginTop: '12px', fontSize: '11px', color: '#a0aec0' }}>
          Always check DOH biotoxin status on the day of harvest. Both WDFW season AND DOH approval required.
        </p>
      </div>
    </div>
  );
}
