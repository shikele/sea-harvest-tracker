import React, { useEffect, useState, useCallback } from 'react';
import { getHarvestWindows, getDrivingDistances } from '../services/api';
import BeachCard from './BeachCard';
import TideChart from './TideChart';
import HarvestCalendar from './HarvestCalendar';
import MapView from './MapView';
import SpeciesGuide from './SpeciesGuide';
import CommentsSection from './CommentsSection';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CloseIcon from '@mui/icons-material/Close';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

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
  const [accessFilter, setAccessFilter] = useState('public'); // 'all', 'public', 'boat'
  const [activeTab, setActiveTab] = useState('beaches'); // 'beaches' or 'species'
  const [showMap, setShowMap] = useState(false);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(today); // Track date clicked from calendar
  const [calendarDayBeaches, setCalendarDayBeaches] = useState([]); // All suitable beaches for selected day
  const [showAllBeaches, setShowAllBeaches] = useState(false);
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
      // Status filter (empty array = all if showAllBeaches, otherwise open-only)
      if (statusFilters.length === 0) {
        if (!showAllBeaches) {
          return (beach.biotoxinStatus === 'open' || beach.biotoxinStatus === 'wdfw_managed') && beach.seasonOpen !== false;
        }
        return true;
      }
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
      // Status filter (empty array = all if showAllBeaches, otherwise open-only)
      if (statusFilters.length === 0) {
        if (!showAllBeaches) {
          return (beach.biotoxinStatus === 'open' || beach.biotoxinStatus === 'wdfw_managed') && beach.seasonOpen !== false;
        }
        return true;
      }
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
    open: speciesFilteredBeaches.filter(b => (b.biotoxinStatus === 'open' || b.biotoxinStatus === 'wdfw_managed') && b.seasonOpen !== false).length,
    conditional: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'conditional').length,
    closed: speciesFilteredBeaches.filter(b => b.biotoxinStatus === 'closed').length,
    seasonClosed: speciesFilteredBeaches.filter(b => b.seasonOpen === false).length,
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2.5 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress />
          <Typography color="text.secondary" sx={{ mt: 2 }}>Loading beach data...</Typography>
        </Box>
      </Box>
    );
  }

  if (error && beaches.length === 0) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2.5 }}>
        <Alert severity="error" sx={{ textAlign: 'center' }}>
          <AlertTitle>Error loading data</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 2.5 }} className="dashboard-container">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }} className="dashboard-header">
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a202c', mb: 0.5 }}>Sea Harvest All in One</Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} className="tab-container">
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Beaches" value="beaches" />
          <Tab label="Species Guide" value="species" />
          <Tab label="Comments" value="comments" />
        </Tabs>
      </Box>

      {activeTab === 'comments' ? (
        <CommentsSection beaches={beaches} />
      ) : activeTab === 'species' ? (
        <SpeciesGuide />
      ) : (
        <>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1.5, mt: 0 }}>
        Select a species to find the best beaches and harvest times
      </Typography>
      {allSpecies.length > 0 && (
        <Box
          className="species-filter"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: '10px 14px',
            bgcolor: selectedSpecies.length === 0 ? '#f0fff4' : '#f7fafc',
            border: selectedSpecies.length === 0 ? '2px solid #48bb78' : '2px solid transparent',
            borderRadius: '8px',
            boxShadow: selectedSpecies.length === 0 ? '0 0 0 1px #48bb78' : 'none',
            transition: 'all 0.2s ease',
            width: '100%',
            maxWidth: '100%',
            mb: 1.5
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#4a5568', mr: 0.5 }}>🦪 Species:</Typography>
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <Select
              className="species-select"
              value={selectedSpecies[0] || ''}
              onChange={(e) => handleSpeciesToggle(e.target.value)}
              displayEmpty
              sx={{ fontSize: 14 }}
            >
              <MenuItem value="">Select a species...</MenuItem>
              {allSpecies.map((species) => (
                <MenuItem key={species} value={species}>{species}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}
      <Button
        fullWidth
        variant="outlined"
        onClick={() => setShowMap(!showMap)}
        sx={{ mb: showMap ? 0 : 2, py: 1 }}
      >
        {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
      </Button>

      {showMap && (
        <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }} className="stats-row">
        <Paper
          className="stat-card"
          onClick={() => toggleStatusFilter('open')}
          sx={{
            p: 2.5, cursor: 'pointer', borderRadius: '12px', textAlign: 'center',
            border: 2, borderColor: statusFilters.includes('open') ? 'primary.main' : 'transparent',
            boxShadow: statusFilters.includes('open') ? '0 2px 8px rgba(49,130,206,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <Typography variant="body2" color="text.secondary" className="stat-label">Open</Typography>
          <Typography variant="h3" sx={{ color: '#48bb78', fontWeight: 700 }} className="stat-value">{stats.open}</Typography>
        </Paper>
        <Paper
          className="stat-card"
          onClick={() => toggleStatusFilter('conditional')}
          sx={{
            p: 2.5, cursor: 'pointer', borderRadius: '12px', textAlign: 'center',
            border: 2, borderColor: statusFilters.includes('conditional') ? 'primary.main' : 'transparent',
            boxShadow: statusFilters.includes('conditional') ? '0 2px 8px rgba(49,130,206,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <Typography variant="body2" color="text.secondary" className="stat-label">Conditional</Typography>
          <Typography variant="h3" sx={{ color: '#ecc94b', fontWeight: 700 }} className="stat-value">{stats.conditional}</Typography>
        </Paper>
        <Paper
          className="stat-card"
          onClick={() => toggleStatusFilter('closed')}
          sx={{
            p: 2.5, cursor: 'pointer', borderRadius: '12px', textAlign: 'center',
            border: 2, borderColor: statusFilters.includes('closed') ? 'primary.main' : 'transparent',
            boxShadow: statusFilters.includes('closed') ? '0 2px 8px rgba(49,130,206,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <Typography variant="body2" color="text.secondary" className="stat-label">Biotoxin Unsafe</Typography>
          <Typography variant="h3" sx={{ color: '#f56565', fontWeight: 700 }} className="stat-value">{stats.closed}</Typography>
        </Paper>
        {stats.seasonClosed > 0 && (
        <Paper
          className="stat-card"
          onClick={() => toggleStatusFilter('seasonClosed')}
          sx={{
            p: 2.5, cursor: 'pointer', borderRadius: '12px', textAlign: 'center',
            border: 2, borderColor: statusFilters.includes('seasonClosed') ? 'primary.main' : 'transparent',
            boxShadow: statusFilters.includes('seasonClosed') ? '0 2px 8px rgba(49,130,206,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <Typography variant="body2" color="text.secondary" className="stat-label">Season Closed</Typography>
          <Typography variant="h3" sx={{ color: '#ed8936', fontWeight: 700 }} className="stat-value">{stats.seasonClosed}</Typography>
        </Paper>
        )}
      </Box>

      <Box className="map-container">
        <MapView beaches={filteredBeaches} onBeachClick={handleBeachSelect} userLocation={userLocation} selectedBeach={selectedBeach} />
      </Box>
      </>
      )}

      <Stack spacing={2} className="main-content">
        {/* Calendar Section - Order 1 on mobile */}
        <Box className="calendar-section" sx={{ order: 1 }}>
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
            showAllBeaches={showAllBeaches}
          />
        </Box>


        {/* Beach List Section - Order 3 on mobile */}
        <Box className="beach-list-wrapper" sx={{ order: 3 }}>

          <Paper sx={{ bgcolor: 'white', borderRadius: 3, p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} className="beach-list-section">
            <Box sx={{ textAlign: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 0.5 }} className="section-title">
                {selectedSpecies.length > 0 && selectedCalendarDate ? (
                  `Best beaches to catch ${selectedSpecies.join(', ')} on ${new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                ) : sortMode === 'distance' ? 'Closest to me' : 'Beaches by Opportunity'}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#f7fafc', borderRadius: '8px', p: 1.5, mb: 2 }} className="filter-section">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }} className="search-sort-row">
                <TextField
                  placeholder="Search..."
                  size="small"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                  }}
                  className="search-input"
                  sx={{ flex: '1 1 auto', minWidth: 120 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant={sortMode === 'distance' ? 'contained' : 'outlined'}
                  size="small"
                  className="filter-button sort-button"
                  onClick={handleSortByDistance}
                  disabled={locationLoading}
                  title="Sort by distance from your location"
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    borderRadius: '20px', fontSize: 12, textTransform: 'none',
                    flexShrink: 0,
                    ...(sortMode === 'distance' ? { bgcolor: '#805ad5', '&:hover': { bgcolor: '#6b46c1' } } : {}),
                  }}
                >
                  <span style={{ fontSize: 12 }}>&#128205;</span>
                  {locationLoading ? '...' : drivingLoading ? 'Calculating...' : 'Closest to me'}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }} className="toggle-row">
                <Box
                  sx={{ bgcolor: '#edf2f7', borderRadius: '8px', p: '3px', display: 'flex', gap: '2px' }}
                  className="MuiToggleButtonGroup-root"
                >
                  <ToggleButton
                    value="open"
                    selected={!showAllBeaches}
                    onClick={() => setShowAllBeaches(false)}
                    sx={{ border: 'none', borderRadius: '6px !important', px: 1.5, py: 0.25, fontSize: 12, textTransform: 'none' }}
                  >
                    Open only
                  </ToggleButton>
                  <ToggleButton
                    value="all"
                    selected={showAllBeaches}
                    onClick={() => setShowAllBeaches(true)}
                    sx={{ border: 'none', borderRadius: '6px !important', px: 1.5, py: 0.25, fontSize: 12, textTransform: 'none' }}
                  >
                    All beaches
                  </ToggleButton>
                  <ToggleButton
                    value="road"
                    selected={accessFilter === 'public'}
                    onClick={() => setAccessFilter('public')}
                    sx={{ border: 'none', borderRadius: '6px !important', px: 1.5, py: 0.25, fontSize: 12, textTransform: 'none' }}
                  >
                    Road only
                  </ToggleButton>
                  <ToggleButton
                    value="access"
                    selected={accessFilter === 'all'}
                    onClick={() => setAccessFilter('all')}
                    sx={{ border: 'none', borderRadius: '6px !important', px: 1.5, py: 0.25, fontSize: 12, textTransform: 'none' }}
                  >
                    All access
                  </ToggleButton>
                </Box>
                {locationError && (
                  <Typography variant="caption" color="error">{locationError}</Typography>
                )}
              </Box>
            </Box>

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
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2.5, pt: 2, borderTop: '1px solid #e2e8f0' }} className="pagination">
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => goToPage(page)}
                  shape="rounded"
                  size="small"
                />
                <Typography variant="body2" color="text.secondary" className="page-info">
                  {startIndex + 1}-{Math.min(endIndex, displayBeaches.length)} of {displayBeaches.length}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>
        </>
      )}

      {/* Beach Detail Popout */}
      <Dialog
        open={!!selectedBeach}
        onClose={() => setSelectedBeach(null)}
        maxWidth="sm"
        fullWidth
        className="beach-detail-overlay"
      >
        <DialogTitle sx={{ pr: 6 }}>
          {selectedBeach?.name}
          <IconButton
            onClick={() => setSelectedBeach(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedBeach && (
          <>
              <Box sx={{ mb: 1 }}>
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBeach.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontSize: 13, fontWeight: 500 }}
                >
                  View on Google Maps &#x2197;
                </Link>
              </Box>
              <Chip
                label={selectedBeach.statusColor === 'green' ? 'OPEN' : selectedBeach.statusColor === 'blue' ? 'WDFW MANAGED' : 'CLOSED'}
                sx={{
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  bgcolor: selectedBeach.statusColor === 'green' ? '#c6f6d5' : selectedBeach.statusColor === 'blue' ? '#ebf8ff' : '#fed7d7',
                  color: selectedBeach.statusColor === 'green' ? '#22543d' : selectedBeach.statusColor === 'blue' ? '#2b6cb0' : '#742a2a',
                  fontSize: 13,
                }}
              />
              <Stack direction="row" spacing={2} sx={{ mt: 1.25, fontSize: 13 }}>
                <Typography variant="body2" sx={{ color: selectedBeach.biotoxinStatus === 'wdfw_managed' ? '#2b6cb0' : selectedBeach.biotoxinStatus === 'open' ? '#276749' : selectedBeach.biotoxinStatus === 'closed' ? '#c53030' : '#975a16' }}>
                  {selectedBeach.biotoxinStatus === 'wdfw_managed' ? 'Razor clam digs are managed by WDFW' : `Biotoxin: ${selectedBeach.biotoxinStatus === 'open' ? 'Safe' : selectedBeach.biotoxinStatus === 'closed' ? 'Unsafe' : selectedBeach.biotoxinStatus === 'conditional' ? 'Caution' : 'Unknown'}`}
                </Typography>
                <Divider orientation="vertical" flexItem />
                <Typography variant="body2" sx={{ color: selectedBeach.seasonOpen ? '#276749' : '#c05621' }}>
                  Season: {selectedBeach.seasonOpen ? 'Open' : 'Closed'}
                </Typography>
              </Stack>
              {selectedBeach.wdfwUrl && (
                <Box sx={{ mt: 1 }}>
                  <Link
                    href={selectedBeach.wdfwUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: 13, fontWeight: 500 }}
                  >
                    Check status on WDFW &#x2197;
                  </Link>
                </Box>
              )}

            {selectedBeach.biotoxinStatus === 'wdfw_managed' && (
              <Alert severity="info" sx={{ mb: 2.5 }}>
                <AlertTitle>Managed by WDFW</AlertTitle>
                <Typography variant="body2">
                  Razor clam digs are managed by WDFW through separate announcements, not DOH biotoxin monitoring.
                </Typography>
                {selectedBeach.upcomingDigs?.length > 0 ? (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Upcoming Digs:</Typography>
                    {selectedBeach.upcomingDigs.map((dig, i) => (
                      <Typography key={i} variant="body2" sx={{ pl: 1 }}>
                        {dig.date} ({dig.dayOfWeek}) — {dig.time}, {dig.tideHeight}ft tide
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    No upcoming digs currently scheduled.
                  </Typography>
                )}
                {selectedBeach.wdfwUrl && (
                  <Link href={selectedBeach.wdfwUrl} target="_blank" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                    View on WDFW &#x2197;
                  </Link>
                )}
              </Alert>
            )}

            {selectedBeach.biotoxinStatus === 'closed' && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                <AlertTitle>Biotoxin Closure</AlertTitle>
                {selectedBeach.closureReason && (
                  <Typography variant="body2">{selectedBeach.closureReason}</Typography>
                )}
                {selectedBeach.speciesAffected && (
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    Species affected: {selectedBeach.speciesAffected}
                  </Typography>
                )}
              </Alert>
            )}

            {selectedBeach.biotoxinStatus === 'conditional' && (
              <Alert severity="warning" sx={{ mb: 2.5 }}>
                <AlertTitle>Conditional Biotoxin Status</AlertTitle>
                {selectedBeach.speciesAffected && (
                  <Typography variant="body2">Species restriction: {selectedBeach.speciesAffected}</Typography>
                )}
                {selectedBeach.closureReason && (
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    {selectedBeach.closureReason}
                  </Typography>
                )}
                {selectedBeach.speciesAffected && (
                  <Typography variant="body2" sx={{ mt: 1.5 }}>
                    Other species may be harvested. Check current regulations.
                  </Typography>
                )}
              </Alert>
            )}

            {selectedBeach.seasonInfo && (
              <Alert severity={selectedBeach.seasonOpen ? 'success' : 'warning'} sx={{ mb: 2.5 }}>
                <AlertTitle>WDFW Season Info</AlertTitle>
                {selectedBeach.seasonInfo}
                {!selectedBeach.seasonOpen && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    This beach is currently outside its approved harvest season.
                  </Typography>
                )}
              </Alert>
            )}

            {selectedBeach.species && selectedBeach.species.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ display: 'block', mb: 1.5, fontSize: 16, fontWeight: 600 }}>What You Can Catch:</Typography>
                <Stack spacing={1}>
                  {selectedBeach.species.map((s, i) => (
                    <Box key={i} sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: '12px 16px',
                      bgcolor: '#f7fafc',
                      borderRadius: '8px',
                      fontSize: 14
                    }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                        <Chip
                          label={s.abundance}
                          size="small"
                          sx={{
                            fontSize: 12,
                            bgcolor: s.abundance === 'abundant' ? '#bee3f8' :
                                   s.abundance === 'scattered' ? '#fefcbf' : '#e2e8f0',
                            color: s.abundance === 'abundant' ? '#2c5282' :
                                  s.abundance === 'scattered' ? '#744210' : '#4a5568'
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          &lt;{s.min_tide_ft}ft
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
                {selectedBeach.notes && (
                  <Typography variant="body2" sx={{ mt: 1.5, color: '#718096', fontStyle: 'italic' }}>
                    {selectedBeach.notes}
                  </Typography>
                )}
              </Box>
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

          </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer with resources */}
      <Box sx={{ mt: 5, p: 2.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Resources:</strong>
        </Typography>
        <Typography variant="body2">
          <Link href="https://wdfw.wa.gov/sites/default/files/fishing/shellfishing/WDFWAnnualBeachSeasonsBarChart.pdf" target="_blank" rel="noopener noreferrer" sx={{ mr: 2 }}>
            WDFW 2026 Beach Seasons (PDF)
          </Link>
          <Link href="https://fortress.wa.gov/doh/eh/portal/odw/si/Shellfish.aspx" target="_blank" rel="noopener noreferrer" sx={{ mr: 2 }}>
            DOH Shellfish Safety Map
          </Link>
          <Link href="https://wdfw.wa.gov/places-to-go/shellfish-beaches" target="_blank" rel="noopener noreferrer">
            WDFW Shellfish Beaches
          </Link>
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1.5, color: '#a0aec0' }}>
          Always check DOH biotoxin status on the day of harvest. Both WDFW season AND DOH approval required.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1.5, color: '#4a5568', fontWeight: 500 }}>
          Follow all laws and guidance, and make sure you have a valid license
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
          Like this project? Leave a star on{' '}
          <Link href="https://github.com/shikele/sea-harvest-tracker" target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
