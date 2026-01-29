import React, { useEffect, useState, useCallback } from 'react';
import { getHarvestWindows, refreshData } from '../services/api';
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
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '4px'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
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
  const [refreshing, setRefreshing] = useState(false);
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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshData();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

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
        ? prev.filter(s => s !== speciesName)
        : [...prev, speciesName]
    );
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSpecies([]);
    setFilter('all');
    setAccessFilter('all');
    setCurrentPage(1);
  };

  const handleAccessFilterChange = (value) => {
    setAccessFilter(value);
    setCurrentPage(1);
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
      if (filter === 'closed') return beach.biotoxinStatus === 'closed';
      if (filter === 'harvestable') return beach.harvestable;
      return true;
    })
    .sort((a, b) => {
      if (sortMode === 'distance' && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      // Default: sort by opportunity score (already sorted from API)
      return 0;
    });

  const hasActiveFilters = searchQuery || selectedSpecies.length > 0 || filter !== 'all' || accessFilter !== 'all';

  // Pagination calculations
  const totalPages = Math.ceil(filteredBeaches.length / beachesPerPage);
  const startIndex = (currentPage - 1) * beachesPerPage;
  const endIndex = startIndex + beachesPerPage;
  const paginatedBeaches = filteredBeaches.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const stats = {
    total: beaches.length,
    open: beaches.filter(b => b.biotoxinStatus === 'open').length,
    closed: beaches.filter(b => b.biotoxinStatus === 'closed').length,
    harvestable: beaches.filter(b => b.harvestable).length
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
          <button
            style={{ ...styles.refreshButton, marginTop: '16px' }}
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sea Harvest Tracker</h1>
          <p style={styles.subtitle}>
            Shellfish harvesting conditions near Redmond, WA
          </p>
        </div>
        <button
          style={{
            ...styles.refreshButton,
            opacity: refreshing ? 0.7 : 1
          }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'beaches' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('beaches')}
        >
          Beaches
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'species' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('species')}
        >
          Species Guide
        </button>
      </div>

      {activeTab === 'species' ? (
        <SpeciesGuide />
      ) : (
        <>
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Beaches</div>
          <div style={{ ...styles.statValue, color: '#4299e1' }}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Open</div>
          <div style={{ ...styles.statValue, color: '#48bb78' }}>{stats.open}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Closed</div>
          <div style={{ ...styles.statValue, color: '#f56565' }}>{stats.closed}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ready to Harvest</div>
          <div style={{ ...styles.statValue, color: '#805ad5' }}>{stats.harvestable}</div>
        </div>
      </div>

      <MapView beaches={filteredBeaches} onBeachClick={setSelectedBeach} userLocation={userLocation} />

      <div style={styles.mainContent}>
        <div style={styles.leftColumn}>
          <HarvestCalendar onBeachClick={(beach) => setSelectedBeach(beach)} />

          <div style={styles.beachList}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                Beaches by {sortMode === 'distance' ? 'Distance' : 'Opportunity'}
              </h2>
              <span style={styles.filterCount}>
                {filteredBeaches.length} of {beaches.length}
              </span>
              {hasActiveFilters && (
                <button style={styles.clearFiltersButton} onClick={clearAllFilters}>
                  Clear Filters
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder="Search beaches by name..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />

            <div style={styles.sortRow}>
              <button
                style={{
                  ...styles.sortButton,
                  ...(sortMode === 'distance' ? styles.sortButtonActive : {})
                }}
                onClick={handleSortByDistance}
                disabled={locationLoading}
              >
                {locationLoading ? 'Getting location...' : sortMode === 'distance' ? 'Sorted by Distance' : 'Sort by Distance'}
              </button>
              {userLocation && (
                <span style={styles.locationStatus}>
                  Location: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                </span>
              )}
              {locationError && (
                <span style={styles.locationError}>{locationError}</span>
              )}
            </div>

            <div style={styles.filterRow}>
              {['all', 'harvestable', 'open', 'closed'].map((f) => (
                <button
                  key={f}
                  style={{
                    ...styles.filterButton,
                    ...(filter === f ? styles.filterButtonActive : {})
                  }}
                  onClick={() => handleFilterChange(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ ...styles.filterRow, marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#4a5568', marginRight: '8px' }}>Access:</span>
              {[
                { value: 'all', label: 'All' },
                { value: 'public', label: 'Public' },
                { value: 'boat', label: 'Boat Only' }
              ].map((option) => (
                <button
                  key={option.value}
                  style={{
                    ...styles.filterButton,
                    ...(accessFilter === option.value ? { backgroundColor: '#805ad5', color: 'white', borderColor: '#805ad5' } : {})
                  }}
                  onClick={() => handleAccessFilterChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={styles.speciesFilterSection}>
              <div style={styles.speciesFilterTitle}>
                Filter by Species {selectedSpecies.length > 0 && `(${selectedSpecies.length} selected)`}
              </div>
              <div style={styles.speciesCheckboxGrid}>
                {allSpecies.map((species) => (
                  <label key={species} style={styles.speciesCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedSpecies.includes(species)}
                      onChange={() => handleSpeciesToggle(species)}
                      style={styles.speciesCheckbox}
                    />
                    {species}
                  </label>
                ))}
              </div>
            </div>

            {paginatedBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                onClick={setSelectedBeach}
              />
            ))}

            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  style={{
                    ...styles.pageButton,
                    ...(currentPage === 1 ? styles.pageButtonDisabled : {})
                  }}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
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
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>

                <span style={styles.pageInfo}>
                  {startIndex + 1}-{Math.min(endIndex, filteredBeaches.length)} of {filteredBeaches.length}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightColumn}>
          {selectedBeach && (
            <div style={styles.selectedBeachPanel}>
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

              {selectedBeach.closureReason && (
                <div style={{ marginBottom: '16px', color: '#c53030' }}>
                  <strong>Closure Reason:</strong> {selectedBeach.closureReason}
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

              <TideChart
                stationId={selectedBeach.tide_station_id || beaches.find(b => b.id === selectedBeach.id)?.tide_station_id}
                stationName={selectedBeach.region}
              />
            </div>
          )}

          {!selectedBeach && beaches[0] && (
            <TideChart
              stationId={beaches[0].tide_station_id}
              stationName="Hood Canal (Default)"
            />
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
