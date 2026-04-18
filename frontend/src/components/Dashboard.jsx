import React, { useEffect, useState, useCallback } from 'react';
import { getHarvestWindows, getDrivingDistances } from '../services/api';
import BeachCard from './BeachCard';
import TideChart from './TideChart';
import HarvestCalendar from './HarvestCalendar';
import MapView from './MapView';
import SpeciesGuide from './SpeciesGuide';
import CommentsSection from './CommentsSection';

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
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '400'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: '2px solid transparent'
  },
  statCardSelected: {
    border: '2px solid #3182ce',
    boxShadow: '0 2px 8px rgba(49, 130, 206, 0.3)'
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
    flex: 1
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
    padding: '8px 10px 8px 36px',
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
    borderColor: '#e2e8f0',
    borderRadius: '14px',
    backgroundColor: 'white',
    color: '#4a5568',
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
    borderColor: '#e2e8f0',
    borderRadius: '14px',
    backgroundColor: 'white',
    color: '#4a5568',
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
    borderColor: '#e2e8f0',
    borderRadius: '20px',
    backgroundColor: 'white',
    color: '#4a5568',
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
  },
  beachDetailOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  beachDetailPopout: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    position: 'relative'
  },
  closeButtonPopout: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: '#f7fafc',
    borderRadius: '50%',
    fontSize: '18px',
    color: '#718096',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  beachDetailHeader: {
    marginBottom: '20px',
    paddingRight: '40px'
  },
  beachDetailTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '6px'
  },
  beachDetailSubtitle: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '12px'
  }
};

export default function Dashboard() {
  const [beaches, setBeaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilters, setStatusFilters] = useState([]); // empty = all, or array of selected statuses
  const [selectedBeach, setSelectedBeach] = useState(null);
  const [sortMode, setSortMode] = useState('opportunity'); // 'opportunity' or 'distance'
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [drivingDistances, setDrivingDistances] = useState(null);
  const [drivingLoading, setDrivingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [accessFilter, setAccessFilter] = useState('all'); // 'all', 'public', 'boat'
  const [activeTab, setActiveTab] = useState('beaches'); // 'beaches' or 'species'
  const [showMap, setShowMap] = useState(false);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today); // Track date clicked from calendar
  const [calendarDayBeaches, setCalendarDayBeaches] = useState([]); // All suitable beaches for selected day
  const beachesPerPage = 5;

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

  // Fetch driving distances when user location changes
  useEffect(() => {
    if (!userLocation) {
      setDrivingDistances(null);
      return;
    }

    let cancelled = false;
    setDrivingLoading(true);

    getDrivingDistances(userLocation.lat, userLocation.lon)
      .then(data => {
        if (!cancelled && data) {
          setDrivingDistances(data);
        }
      })
      .catch(err => {
        console.error('Failed to load driving distances:', err.message);
      })
      .finally(() => {
        if (!cancelled) setDrivingLoading(false);
      });

    return () => { cancelled = true; };
  }, [userLocation]);

  // Extract unique species from all beaches
  const allSpecies = [...new Set(
    beaches.flatMap(beach =>
      (beach.species || []).map(s => s.name)
    )
  )].sort();

  const handleSpeciesToggle = (speciesName) => {
    if (!speciesName) {
      setSelectedSpecies([]);  // Clear selection when empty option selected
    } else {
      setSelectedSpecies([speciesName]);  // Single selection
    }
    setSelectedCalendarDate(today);  // Reset calendar date when species changes
    setCalendarDayBeaches([]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSpecies([]);
    setStatusFilters([]);
    setAccessFilter('all');
    setSelectedCalendarDate(today);
    setCalendarDayBeaches([]);
    setCurrentPage(1);
  };

  const handleAccessFilterChange = (value) => {
    setAccessFilter(value);
    setCurrentPage(1);
  };

  const handleBeachSelect = (beach, date = null, allBeachesForDay = null) => {
    // Toggle: if clicking the same beach, unselect it
    if (beach && selectedBeach?.id === beach.id) {
      setSelectedBeach(null);
      return;
    }

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
  };

  const handleDateSelect = (date, allBeachesForDay = []) => {
    setSelectedCalendarDate(date);
    setCalendarDayBeaches(allBeachesForDay || []);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
    setCurrentPage(1);
  };

  // Calculate distances if user location is available
  const beachesWithDistance = beaches.map((beach) => {
    if (userLocation && beach.lat && beach.lon) {
      // Prefer driving distance if available
      if (drivingDistances && drivingDistances[beach.id]) {
        const dd = drivingDistances[beach.id];
        return {
          ...beach,
          distance: dd.distance_mi,
          durationMin: dd.duration_min,
          hasFerry: dd.has_ferry,
          distanceSource: 'driving'
        };
      }
      // Fallback to Haversine
      const distance = calculateDistance(
        userLocation.lat, userLocation.lon,
        beach.lat, beach.lon
      );
      return { ...beach, distance, distanceSource: 'haversine' };
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
      // Status filter (empty array = all, otherwise check if status is in selected filters)
      if (statusFilters.length === 0) return true;
      // Handle 'seasonClosed' filter separately
      if (statusFilters.includes('seasonClosed') && beach.seasonOpen === false) return true;
      // Standard biotoxin status filters
      return statusFilters.includes(beach.biotoxinStatus) && beach.seasonOpen !== false;
    })
    .sort((a, b) => {
      if (sortMode === 'distance') {
        // Both have distance - sort by drive time if available, else distance
        if (a.distance !== null && b.distance !== null) {
          if (a.durationMin != null && b.durationMin != null) {
            return a.durationMin - b.durationMin;
          }
          return a.distance - b.distance;
        }
        // Only a has distance - a comes first
        if (a.distance !== null && b.distance === null) {
          return -1;
        }
        // Only b has distance - b comes first
        if (a.distance === null && b.distance !== null) {
          return 1;
        }
        // Neither has distance - fall through to other sorting
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

  const hasActiveFilters = searchQuery || selectedSpecies.length > 0 || statusFilters.length > 0 || accessFilter !== 'all';

  // When a date is selected from calendar, show all suitable beaches for that day
  // Apply status and access filters to calendar beaches as well
  const filteredCalendarBeaches = calendarDayBeaches
    .map((beach) => {
      // Calculate distance if user location is available
      if (userLocation && beach.lat && beach.lon) {
        if (drivingDistances && drivingDistances[beach.id]) {
          const dd = drivingDistances[beach.id];
          return {
            ...beach,
            distance: dd.distance_mi,
            durationMin: dd.duration_min,
            hasFerry: dd.has_ferry,
            distanceSource: 'driving'
          };
        }
        const distance = calculateDistance(
          userLocation.lat, userLocation.lon,
          beach.lat, beach.lon
        );
        return { ...beach, distance, distanceSource: 'haversine' };
      }
      return { ...beach, distance: null };
    })
    .filter((beach) => {
      // Search filter
      if (searchQuery && !beach.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Access type filter
      if (accessFilter !== 'all') {
        if (accessFilter === 'public' && beach.accessType === 'boat') return false;
        if (accessFilter === 'boat' && beach.accessType !== 'boat') return false;
      }
      // Status filter (empty array = all)
      if (statusFilters.length === 0) return true;
      if (statusFilters.includes('seasonClosed') && beach.seasonOpen === false) return true;
      return statusFilters.includes(beach.biotoxinStatus) && beach.seasonOpen !== false;
    })
    .sort((a, b) => {
      if (sortMode === 'distance') {
        if (a.distance !== null && b.distance !== null) {
          if (a.durationMin != null && b.durationMin != null) {
            return a.durationMin - b.durationMin;
          }
          return a.distance - b.distance;
        }
        if (a.distance !== null && b.distance === null) return -1;
        if (a.distance === null && b.distance !== null) return 1;
      }
      // Default: sort by tide height (lower is better for harvesting)
      const aHeight = a.tideHeight ?? 999;
      const bHeight = b.tideHeight ?? 999;
      return aHeight - bHeight;
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

  // Base set of beaches filtered by species (before status/search filters)
  const speciesFilteredBeaches = selectedSpecies.length > 0
    ? beachesWithDistance.filter(beach => {
        const beachSpeciesNames = (beach.species || []).map(s => s.name);
        return selectedSpecies.some(s => beachSpeciesNames.includes(s));
      })
    : beachesWithDistance;

  const stats = {
    total: speciesFilteredBeaches.length,
    open: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'open' && b.seasonOpen !== false).length,
    conditional: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'conditional').length,
    closed: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'closed').length,
    seasonClosed: speciesFilteredBeaches.filter(b => b.seasonOpen === false).length,
    unclassified: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'unclassified').length
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
        <h1 style={styles.title}>Sea Harvest All in One</h1>
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
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'comments' ? styles.tabActive : {})
          }}
          className="tab-button"
          onClick={() => setActiveTab('comments')}
        >
          Comments
        </button>
      </div>

      {activeTab === 'comments' ? (
        <CommentsSection beaches={beaches} />
      ) : activeTab === 'species' ? (
        <SpeciesGuide />
      ) : (
        <>
      <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 12px', textAlign: 'center' }}>
        Select a species to find the best beaches and harvest times
      </p>
      {allSpecies.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: selectedSpecies.length === 0 ? '#f0fff4' : '#f7fafc',
          border: selectedSpecies.length === 0 ? '2px solid #48bb78' : '2px solid transparent',
          borderRadius: '8px',
          boxShadow: selectedSpecies.length === 0 ? '0 0 0 1px #48bb78' : 'none',
          transition: 'all 0.2s ease',
          width: '100%',
          maxWidth: '100%',
          marginBottom: '12px'
        }} className="species-filter">
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#4a5568', marginRight: '4px' }}>🦪 Species:</span>
          <select
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#2d3748',
              cursor: 'pointer',
              minWidth: 0
            }}
            className="species-select"
            value={selectedSpecies[0] || ''}
            onChange={(e) => handleSpeciesToggle(e.target.value)}
          >
            <option value="">Select a species...</option>
            {allSpecies.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </div>
      )}
      <button
        onClick={() => setShowMap(!showMap)}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#4a5568',
          backgroundColor: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          cursor: 'pointer',
          marginBottom: showMap ? '0' : '16px',
          transition: 'all 0.2s ease'
        }}
      >
        {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
      </button>

      {showMap && (
        <>
      <div style={styles.statsRow} className="stats-row">
        <div
          style={{
            ...styles.statCard,
            ...(statusFilters.includes('open') ? styles.statCardSelected : {})
          }}
          className="stat-card"
          onClick={() => toggleStatusFilter('open')}
        >
          <div style={styles.statLabel} className="stat-label">Open</div>
          <div style={{ ...styles.statValue, color: '#48bb78' }} className="stat-value">{stats.open}</div>
        </div>
        <div
          style={{
            ...styles.statCard,
            ...(statusFilters.includes('conditional') ? styles.statCardSelected : {})
          }}
          className="stat-card"
          onClick={() => toggleStatusFilter('conditional')}
        >
          <div style={styles.statLabel} className="stat-label">Conditional</div>
          <div style={{ ...styles.statValue, color: '#ecc94b' }} className="stat-value">{stats.conditional}</div>
        </div>
        <div
          style={{
            ...styles.statCard,
            ...(statusFilters.includes('closed') ? styles.statCardSelected : {})
          }}
          className="stat-card"
          onClick={() => toggleStatusFilter('closed')}
        >
          <div style={styles.statLabel} className="stat-label">Biotoxin Unsafe</div>
          <div style={{ ...styles.statValue, color: '#f56565' }} className="stat-value">{stats.closed}</div>
        </div>
        {stats.seasonClosed > 0 && (
        <div
          style={{
            ...styles.statCard,
            ...(statusFilters.includes('seasonClosed') ? styles.statCardSelected : {})
          }}
          className="stat-card"
          onClick={() => toggleStatusFilter('seasonClosed')}
        >
          <div style={styles.statLabel} className="stat-label">Season Closed</div>
          <div style={{ ...styles.statValue, color: '#ed8936' }} className="stat-value">{stats.seasonClosed}</div>
        </div>
        )}
        <div
          style={{
            ...styles.statCard,
            ...(statusFilters.includes('unclassified') ? styles.statCardSelected : {})
          }}
          className="stat-card"
          onClick={() => toggleStatusFilter('unclassified')}
        >
          <div style={styles.statLabel} className="stat-label">Unclassified</div>
          <div style={{ ...styles.statValue, color: '#a0aec0' }} className="stat-value">{stats.unclassified}</div>
        </div>
      </div>

      <div className="map-container">
        <MapView beaches={filteredBeaches} onBeachClick={handleBeachSelect} userLocation={userLocation} selectedBeach={selectedBeach} />
      </div>
      </>
      )}

      <div style={styles.mainContent} className="main-content">
        {/* Calendar Section - Order 1 on mobile */}
        <div className="calendar-section" style={{ order: 1 }}>
          <HarvestCalendar
            onBeachClick={handleBeachSelect}
            onDateSelect={handleDateSelect}
            selectedDate={selectedCalendarDate}
            statusFilters={statusFilters}
            accessFilter={accessFilter}
            selectedSpecies={selectedSpecies}
            allBeaches={beaches}
            allSpecies={allSpecies}
            onSpeciesToggle={handleSpeciesToggle}
          />
        </div>


        {/* Beach List Section - Order 3 on mobile */}
        <div className="beach-list-wrapper" style={{ order: 3 }}>

          <div style={styles.beachList} className="beach-list-section">
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: '4px' }} className="section-title">
                {selectedSpecies.length > 0 && selectedCalendarDate ? (
                  `Best beaches to catch ${selectedSpecies.join(', ')} on ${new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                ) : sortMode === 'distance' ? 'Closest to me' : 'Beaches by Opportunity'}
              </h2>
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
                  {locationLoading ? '...' : drivingLoading ? 'Calculating...' : 'Closest to me'}
                </button>
                {locationError && (
                  <span style={styles.locationError}>{locationError}</span>
                )}
              </div>

              <div style={styles.filterGroup} className="filter-group">
                <div style={styles.filterGroupRow} className="filter-group-row">
                  {[
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
                  <button
                    style={{
                      ...styles.filterButtonSmall,
                      marginLeft: 'auto',
                      color: hasActiveFilters ? '#e53e3e' : '#a0aec0',
                      borderColor: hasActiveFilters ? '#fed7d7' : '#e2e8f0',
                      backgroundColor: hasActiveFilters ? '#fff5f5' : 'white'
                    }}
                    className="filter-button"
                    onClick={clearAllFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {paginatedBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                onClick={handleBeachSelect}
                selectedDate={selectedCalendarDate}
                isSelected={selectedBeach?.id === beach.id}
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

      {/* Beach Detail Popout */}
      {selectedBeach && (
        <div
          style={styles.beachDetailOverlay}
          className="beach-detail-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBeach(null);
          }}
        >
          <div style={styles.beachDetailPopout} className="beach-detail-popout">
            <button
              style={styles.closeButtonPopout}
              onClick={() => setSelectedBeach(null)}
            >
              ×
            </button>

            <div style={styles.beachDetailHeader}>
              <h1 style={styles.beachDetailTitle}>{selectedBeach.name}</h1>
              <div style={styles.beachDetailSubtitle}>
                {selectedBeach.region} - {selectedBeach.county} County
              </div>
              <div style={{ marginBottom: '8px' }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBeach.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px',
                    color: '#3182ce',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  View on Google Maps &#x2197;
                </a>
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  backgroundColor: selectedBeach.statusColor === 'green' ? '#c6f6d5' : '#fed7d7',
                  color: selectedBeach.statusColor === 'green' ? '#22543d' : '#742a2a'
                }}
              >
                {selectedBeach.statusColor === 'green' ? 'OPEN' : 'CLOSED'}
              </span>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '13px' }}>
                <span style={{ color: selectedBeach.biotoxinStatus === 'open' ? '#276749' : selectedBeach.biotoxinStatus === 'closed' ? '#c53030' : '#975a16' }}>
                  Biotoxin: {selectedBeach.biotoxinStatus === 'open' ? 'Safe' : selectedBeach.biotoxinStatus === 'closed' ? 'Unsafe' : selectedBeach.biotoxinStatus === 'conditional' ? 'Caution' : 'Unknown'}
                </span>
                <span style={{ color: '#cbd5e0' }}>|</span>
                <span style={{ color: selectedBeach.seasonOpen ? '#276749' : '#c05621' }}>
                  Season: {selectedBeach.seasonOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              {selectedBeach.wdfwUrl && (
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={selectedBeach.wdfwUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      color: '#3182ce',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    Check status on WDFW &#x2197;
                  </a>
                </div>
              )}
            </div>

            {selectedBeach.biotoxinStatus === 'closed' && (
              <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fff5f5', borderRadius: '8px', borderLeft: '4px solid #fc8181', color: '#c53030' }}>
                <strong style={{ display: 'block', marginBottom: '6px' }}>Biotoxin Closure</strong>
                {selectedBeach.closureReason && (
                  <span>{selectedBeach.closureReason}</span>
                )}
                {selectedBeach.speciesAffected && (
                  <div style={{ marginTop: '6px', fontSize: '14px' }}>
                    Species affected: {selectedBeach.speciesAffected}
                  </div>
                )}
              </div>
            )}

            {selectedBeach.biotoxinStatus === 'conditional' && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#fefcbf',
                borderRadius: '8px',
                borderLeft: '4px solid #ecc94b'
              }}>
                <strong style={{ color: '#744210', display: 'block', marginBottom: '6px' }}>
                  Conditional Biotoxin Status
                </strong>
                {selectedBeach.speciesAffected && (
                  <span style={{ color: '#744210', fontSize: '15px' }}>
                    Species restriction: {selectedBeach.speciesAffected}
                  </span>
                )}
                {selectedBeach.closureReason && (
                  <p style={{ color: '#975a16', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>
                    {selectedBeach.closureReason}
                  </p>
                )}
                {selectedBeach.speciesAffected && (
                  <p style={{ color: '#975a16', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>
                    Other species may be harvested. Check current regulations.
                  </p>
                )}
              </div>
            )}

            {selectedBeach.seasonInfo && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: selectedBeach.seasonOpen ? '#f0fff4' : '#fffaf0',
                borderRadius: '8px',
                borderLeft: `4px solid ${selectedBeach.seasonOpen ? '#48bb78' : '#ed8936'}`
              }}>
                <strong style={{ color: selectedBeach.seasonOpen ? '#276749' : '#c05621', display: 'block', marginBottom: '6px' }}>
                  WDFW Season Info:
                </strong>
                <span style={{ color: selectedBeach.seasonOpen ? '#276749' : '#c05621', fontSize: '14px' }}>
                  {selectedBeach.seasonInfo}
                </span>
                {!selectedBeach.seasonOpen && (
                  <p style={{ color: '#975a16', fontSize: '13px', marginTop: '10px', marginBottom: 0 }}>
                    This beach is currently outside its approved harvest season.
                  </p>
                )}
              </div>
            )}

            {selectedBeach.species && selectedBeach.species.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <strong style={{ display: 'block', marginBottom: '12px', fontSize: '16px' }}>What You Can Catch:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedBeach.species.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      <span style={{ fontWeight: '500' }}>{s.name}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: s.abundance === 'abundant' ? '#bee3f8' :
                                         s.abundance === 'scattered' ? '#fefcbf' : '#e2e8f0',
                          color: s.abundance === 'abundant' ? '#2c5282' :
                                s.abundance === 'scattered' ? '#744210' : '#4a5568'
                        }}>
                          {s.abundance}
                        </span>
                        <span style={{ color: '#718096', fontSize: '12px' }}>
                          &lt;{s.min_tide_ft}ft
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedBeach.notes && (
                  <div style={{ marginTop: '12px', fontSize: '13px', color: '#718096', fontStyle: 'italic' }}>
                    {selectedBeach.notes}
                  </div>
                )}
              </div>
            )}

            <TideChart
              stationId={selectedBeach.tide_station_id || beaches.find(b => b.id === selectedBeach.id)?.tide_station_id}
              stationName={selectedBeach.region}
              selectedDate={selectedCalendarDate}
              onResetToToday={() => {
                setSelectedCalendarDate(today);
                setCalendarDayBeaches([]);
              }}
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
        <p style={{ marginTop: '12px', fontSize: '12px', color: '#4a5568', fontWeight: '500' }}>
          Follow all laws and guidance, and make sure you have a valid license
        </p>
        <p style={{ marginTop: '16px', fontSize: '12px', color: '#718096' }}>
          Like this project? Leave a star on{' '}
          <a
            href="https://github.com/shikele/sea-harvest-tracker"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4299e1', textDecoration: 'none' }}
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
