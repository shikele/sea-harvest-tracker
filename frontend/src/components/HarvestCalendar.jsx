import React, { useEffect, useState, useMemo } from 'react';
import { getHarvestCalendar } from '../services/api';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';


const qualityColors = {
  lowEnough: '#805ad5',   // purple - tide is low enough
  slightlyHigh: '#dd6b20' // orange - tide slightly high
};

const statusColors = {
  open: '#48bb78',        // green
  closed: '#f56565',      // red
  conditional: '#ecc94b', // yellow
  wdfw_managed: '#4299e1', // blue
  unclassified: '#a0aec0' // gray
};

function getStatusBorderColor(biotoxinStatus, seasonOpen) {
  if (biotoxinStatus === 'wdfw_managed') return statusColors.wdfw_managed;
  if (biotoxinStatus === 'closed') return statusColors.closed;
  if (biotoxinStatus === 'open' && seasonOpen === false) return '#ed8936'; // orange (season closed)
  if (biotoxinStatus === 'open') return statusColors.open;
  if (biotoxinStatus === 'conditional') return statusColors.conditional;
  return statusColors.unclassified;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatDayDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.getDate();
}

function isSameDay(dateStr1, dateStr2) {
  return dateStr1 === dateStr2;
}

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  return { startPadding, daysInMonth, firstDay, lastDay };
}

export default function HarvestCalendar({ onBeachClick, onDateSelect, selectedDate, statusFilters = [], accessFilter = 'all', selectedSpecies = [], allBeaches = [], allSpecies = [], onSpeciesToggle, showAllBeaches = false }) {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [weekOffset, setWeekOffset] = useState(0); // For 7-day nav
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const today = useMemo(() => {
    const now = new Date();
    // Use local date components to avoid UTC timezone shift
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Fetch calendar data once on mount - covers current month + 4 months ahead
  useEffect(() => {
    async function fetchCalendar() {
      setLoading(true);
      try {
        // Calculate start of current month
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        // Fetch 150 days to cover current month + ~4 months ahead
        const data = await getHarvestCalendar(150, true, monthStart);
        setCalendarData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
  }, []); // Only fetch once on mount

  // Create a lookup map for full beach data (to get species info)
  const beachDataMap = useMemo(() => {
    const map = {};
    for (const beach of allBeaches) {
      map[beach.id] = beach;
    }
    return map;
  }, [allBeaches]);

  // Apply filters to calendar data with species-aware tide requirements
  const filteredCalendarData = useMemo(() => {
    // If no species selected, show no beaches (user must select species)
    if (selectedSpecies.length === 0) {
      return calendarData.map(day => ({
        ...day,
        beaches: [],
        hasSpeciesBeaches: false,
        tideHighForSpecies: false
      }));
    }

    return calendarData.map(day => {
      // If original day has no beaches, tides are too high for all species
      if (day.beaches.length === 0) {
        return {
          ...day,
          beaches: [],
          hasSpeciesBeaches: false,
          tideHighForSpecies: true  // Tides too high for any species
        };
      }

      // Track if any beach has the selected species (regardless of tide)
      let hasSpeciesBeaches = false;
      let tideHighForSpecies = false;

      const filteredBeaches = day.beaches.map(beach => {
        const fullBeach = beachDataMap[beach.id];
        if (!fullBeach) return null;

        // Status filter (empty array = all)
        if (statusFilters.length > 0 && !statusFilters.includes(beach.biotoxinStatus)) {
          return null;
        }

        // Access filter
        if (accessFilter !== 'all') {
          if (accessFilter === 'public' && fullBeach.accessType === 'boat') return null;
          if (accessFilter === 'boat' && fullBeach.accessType !== 'boat') return null;
        }

        // Species filter with tide requirement check
        const beachSpecies = fullBeach.species || [];

        // Check if beach has any of the selected species
        const speciesOnBeach = selectedSpecies.map(selectedName => {
          return beachSpecies.find(s => s.name === selectedName);
        }).filter(Boolean);

        if (speciesOnBeach.length > 0) {
          hasSpeciesBeaches = true;

          // WDFW-managed beaches (razor clams) skip tide filtering — digs are announced by WDFW
          if (beach.biotoxinStatus === 'wdfw_managed') {
            return { ...fullBeach, ...beach, tideStatus: 'good' };
          }

          // Find the best (lowest) min_tide requirement among selected species on this beach
          const lowestMinTide = Math.min(...speciesOnBeach.map(s => s.min_tide_ft ?? 1));

          // Check if tide is good, slightly high (within 1ft), or too high
          if (beach.tideHeight <= lowestMinTide) {
            // Tide is good - include fullBeach data for lat/lon
            return { ...fullBeach, ...beach, tideStatus: 'good' };
          } else if (beach.tideHeight <= lowestMinTide + 1) {
            // Tide is slightly too high (within 1ft) - include fullBeach data for lat/lon
            return { ...fullBeach, ...beach, tideStatus: 'slightlyHigh', minTideNeeded: lowestMinTide };
          } else {
            // Tide is too high
            tideHighForSpecies = true;
            return null;
          }
        }

        return null;
      }).filter(Boolean);

      // Sort by tide height (lowest first)
      filteredBeaches.sort((a, b) => a.tideHeight - b.tideHeight);

      // Calendar display: biotoxin-open/wdfw_managed + road accessible + season-open (or season dates cover this day)
      const calendarBeaches = filteredBeaches.filter(b => {
        if (b.biotoxinStatus !== 'open' && b.biotoxinStatus !== 'wdfw_managed') return false;
        if (b.accessType === 'boat') return false;
        // Season check: open now, OR season dates cover this calendar day
        if (b.seasonOpen) return true;
        if (b.seasonStartDate && b.seasonEndDate) {
          return day.date >= b.seasonStartDate && day.date <= b.seasonEndDate;
        }
        return false;
      });

      // Beach list beaches: apply showAllBeaches logic
      const listBeaches = showAllBeaches
        ? filteredBeaches
        : filteredBeaches.filter(b => {
            if (b.biotoxinStatus !== 'open' && b.biotoxinStatus !== 'wdfw_managed') return false;
            // For season check with day-awareness
            if (b.seasonOpen) return true;
            if (b.seasonStartDate && b.seasonEndDate) {
              return day.date >= b.seasonStartDate && day.date <= b.seasonEndDate;
            }
            return false;
          });

      return {
        ...day,
        beaches: calendarBeaches.slice(0, 2), // Top 2 for calendar display (open + road only)
        allBeaches: listBeaches, // Beaches for the list panel
        hasSpeciesBeaches,
        tideHighForSpecies
      };
    });
  }, [calendarData, selectedSpecies, statusFilters, accessFilter, beachDataMap, showAllBeaches]);

  // Filter calendar data to only include today and future for week view
  const futureCalendarData = useMemo(() => {
    return filteredCalendarData.filter(day => day.date >= today);
  }, [filteredCalendarData, today]);

  // Get current week's data based on offset (from today onwards)
  const weekData = useMemo(() => {
    const start = weekOffset * 7;
    return futureCalendarData.slice(start, start + 7);
  }, [futureCalendarData, weekOffset]);

  // Week navigation label
  const weekLabel = useMemo(() => {
    if (weekData.length === 0) return '';
    const startDate = new Date(weekData[0]?.date + 'T00:00:00');
    const endDate = new Date(weekData[weekData.length - 1]?.date + 'T00:00:00');
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekData]);

  const maxWeeks = Math.max(1, Math.floor(futureCalendarData.length / 7));

  // Create a map of date -> day data for quick lookup (uses filtered data)
  const dateMap = useMemo(() => {
    const map = {};
    for (const day of filteredCalendarData) {
      map[day.date] = {
        beaches: day.beaches,
        allBeaches: day.allBeaches,
        hasSpeciesBeaches: day.hasSpeciesBeaches,
        tideHighForSpecies: day.tideHighForSpecies
      };
    }
    return map;
  }, [filteredCalendarData]);

  // Create a map of date -> original beaches (unfiltered) to distinguish "tides too high" from "filtered out"
  const originalDateMap = useMemo(() => {
    const map = {};
    for (const day of calendarData) {
      map[day.date] = day.beaches;
    }
    return map;
  }, [calendarData]);

  // Generate month calendar grid
  const monthGrid = useMemo(() => {
    const { startPadding, daysInMonth } = getMonthData(currentMonth.year, currentMonth.month);
    const grid = [];

    // Add empty cells for padding (previous month days)
    for (let i = 0; i < startPadding; i++) {
      grid.push({ empty: true, isPadding: true });
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dateStr < today;
      const hasData = dateStr in originalDateMap;
      const originalBeaches = originalDateMap[dateStr] || [];
      const dayData = dateMap[dateStr] || { beaches: [], hasSpeciesBeaches: false, tideHighForSpecies: false };

      // If original data has no beaches, tides are too high for all species
      const tidesHighForAll = hasData && originalBeaches.length === 0;

      grid.push({
        date: dateStr,
        day,
        beaches: dayData.beaches,
        allBeaches: dayData.allBeaches || [],
        isToday: dateStr === today,
        isPast,
        hasData,
        hadOriginalBeaches: originalBeaches.length > 0,
        hasSpeciesBeaches: dayData.hasSpeciesBeaches,
        tideHighForSpecies: dayData.tideHighForSpecies || tidesHighForAll
      });
    }

    return grid;
  }, [currentMonth, dateMap, originalDateMap, today]);

  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Check if we're at the current month (can't go back further)
  const now = new Date();
  const isCurrentMonth = currentMonth.year === now.getFullYear() && currentMonth.month === now.getMonth();

  // Check if we're at max month (3 months after current month)
  const maxMonth = (now.getMonth() + 3) % 12;
  const maxYear = now.getFullYear() + Math.floor((now.getMonth() + 3) / 12);
  const isMaxMonth = currentMonth.year === maxYear && currentMonth.month === maxMonth;

  function navigateMonth(delta) {
    // Don't allow going to previous months
    if (delta < 0 && isCurrentMonth) return;
    // Don't allow going past 3 months ahead
    if (delta > 0 && isMaxMonth) return;

    setCurrentMonth(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
      return { year: newYear, month: newMonth };
    });
  }

  if (loading) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a202c' }}>Harvest Calendar</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress size={32} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a202c' }}>Harvest Calendar</Typography>
        </Box>
        <Alert severity="error">Error: {error}</Alert>
      </Paper>
    );
  }

  const maxBeachesPerDay = viewMode === 'month' ? 2 : 4;

  return (
    <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} className="calendar-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }} className="calendar-header">
        <Typography sx={{ fontSize: '18px', fontWeight: 600, color: '#1a202c' }} className="calendar-title">Harvest Calendar</Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, v) => v && setViewMode(v)}
          size="small"
          className="calendar-view-toggle"
          sx={{ bgcolor: '#edf2f7', borderRadius: '8px', p: '4px' }}
        >
          <ToggleButton value="week" className="calendar-view-button" sx={{ border: 'none', borderRadius: '6px', px: 1.5, py: 0.5, fontSize: 13, textTransform: 'none' }}>
            7 Days
          </ToggleButton>
          <ToggleButton value="month" className="calendar-view-button" sx={{ border: 'none', borderRadius: '6px', px: 1.5, py: 0.5, fontSize: 13, textTransform: 'none' }}>
            Month
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'week' && (
        <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', mb: 2 }} className="calendar-nav">
          <Box sx={{ display: 'flex', alignItems: 'stretch' }} className="calendar-nav-buttons">
            <IconButton
              className="calendar-nav-button"
              onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              sx={{
                height: 38, width: 38,
                border: '1px solid black',
                borderRadius: '4px 0 0 4px',
                bgcolor: weekOffset === 0 ? '#e0e0e0' : 'white',
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{
              boxSizing: 'border-box',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              bgcolor: 'white',
              border: '1px solid black',
              borderLeft: 'none',
              borderRight: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: 'black',
              minWidth: '150px'
            }} className="calendar-label">{weekLabel}</Box>
            <IconButton
              className="calendar-nav-button"
              onClick={() => setWeekOffset(w => Math.min(maxWeeks - 1, w + 1))}
              disabled={weekOffset >= maxWeeks - 1}
              sx={{
                height: 38, width: 38,
                border: '1px solid black',
                borderRadius: '0 4px 4px 0',
                bgcolor: weekOffset >= maxWeeks - 1 ? '#e0e0e0' : 'white',
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Box className="calendar-nav-toggle" sx={{
            display: 'none',
            bgcolor: '#edf2f7',
            borderRadius: '6px',
            p: '2px'
          }}>
            <Box
              component="button"
              sx={{
                padding: '6px 8px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: '#4299e1',
                color: 'white'
              }}
            >
              7D
            </Box>
            <Box
              component="button"
              sx={{
                padding: '6px 8px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#718096'
              }}
              onClick={() => setViewMode('month')}
            >
              Mo
            </Box>
          </Box>
        </Box>
      )}

      {viewMode === 'month' && (
        <Box sx={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', mb: 2 }} className="calendar-nav">
          <Box sx={{ display: 'flex', alignItems: 'stretch' }} className="calendar-nav-buttons">
            <IconButton
              className="calendar-nav-button"
              onClick={() => navigateMonth(-1)}
              disabled={isCurrentMonth}
              sx={{
                height: 38, width: 38,
                border: '1px solid black',
                borderRadius: '4px 0 0 4px',
                bgcolor: isCurrentMonth ? '#e0e0e0' : 'white',
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{
              boxSizing: 'border-box',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 2,
              bgcolor: 'white',
              border: '1px solid black',
              borderLeft: 'none',
              borderRight: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: 'black',
              minWidth: '150px'
            }} className="calendar-label">{monthLabel}</Box>
            <IconButton
              className="calendar-nav-button"
              onClick={() => navigateMonth(1)}
              disabled={isMaxMonth}
              sx={{
                height: 38, width: 38,
                border: '1px solid black',
                borderRadius: '0 4px 4px 0',
                bgcolor: isMaxMonth ? '#e0e0e0' : 'white',
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
          <Box className="calendar-nav-toggle" sx={{
            display: 'none',
            bgcolor: '#edf2f7',
            borderRadius: '6px',
            p: '2px'
          }}>
            <Box
              component="button"
              sx={{
                padding: '6px 8px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: '#718096'
              }}
              onClick={() => setViewMode('week')}
            >
              7D
            </Box>
            <Box
              component="button"
              sx={{
                padding: '6px 8px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                backgroundColor: '#4299e1',
                color: 'white'
              }}
            >
              Mo
            </Box>
          </Box>
        </Box>
      )}

      {viewMode === 'month' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: '4px' }} className="calendar-weekday-header">
          {WEEKDAYS.map(day => (
            <Typography key={day} sx={{ textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#718096', py: 1 }} className="calendar-weekday-label">{day}</Typography>
          ))}
        </Box>
      )}

      {viewMode === 'week' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }} className="calendar-7day-grid">
          {weekData.map((day) => (
            <Box
              key={day.date}
              sx={{
                backgroundColor: '#f7fafc',
                borderRadius: '8px',
                px: 1,
                minHeight: '280px',
                height: '280px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                ...(day.beaches.length > 0 ? {
                  backgroundColor: day.beaches.every(b => b.tideStatus === 'slightlyHigh') ? '#fffaf0' : '#f0fff4'
                } : selectedSpecies.length > 0 && day.date in originalDateMap ? {
                  backgroundColor: '#fff5f5'
                } : {}),
                ...(isSameDay(day.date, today) ? { border: '2px solid #4299e1' } : {}),
                ...(selectedDate === day.date ? { border: '2px solid #718096', boxShadow: '0 0 0 1px #718096' } : {})
              }}
              className="calendar-day-card"
              onClick={() => onDateSelect?.(selectedDate === day.date ? null : day.date, selectedDate === day.date ? [] : (day.allBeaches || day.beaches))}
            >
              <Box sx={{ textAlign: 'center', mb: '4px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }} className="calendar-day-header">
                <Typography component="span" sx={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', fontWeight: 500 }} className="calendar-day-of-week">{day.dayOfWeek}</Typography>
                <Typography component="span" sx={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }} className="calendar-day-date">{formatDayDate(day.date)}</Typography>
              </Box>

              <Box sx={{ fontSize: '11px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="calendar-beach-list">
                {day.beaches.length === 0 ? (
                  <Box sx={{ color: '#718096', fontSize: '11px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, pt: '12px', pb: '12px' }}>
                    {selectedSpecies.length === 0 ? (
                      <>
                        <Typography sx={{ fontSize: '20px', color: '#a0aec0' }}></Typography>
                        <Typography sx={{ color: '#718096', fontSize: '10px' }}>Select a species</Typography>
                      </>
                    ) : !(day.date in originalDateMap) ? (
                      <>
                        <Typography sx={{ fontSize: '14px', color: '#a0aec0' }}>--</Typography>
                        <Typography sx={{ fontStyle: 'italic' }}>No data</Typography>
                      </>
                    ) : (
                      <Typography sx={{ color: '#e53e3e', fontSize: '11px' }}>Tides too high</Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'auto' }} className="calendar-beach-grid">
                    {day.beaches.map((beach, i) => (
                      <Box
                        key={`${beach.id}-${i}`}
                        sx={{
                          padding: '10px 10px',
                          borderRadius: '4px',
                          bgcolor: 'white',
                          borderLeft: '3px solid',
                          borderLeftColor: getStatusBorderColor(beach.biotoxinStatus, beach.seasonOpen),
                          cursor: 'default',
                          mb: 0
                        }}
                        className="calendar-beach-item"
                        title={beach.tideStatus === 'slightlyHigh' ? `${beach.name} - Tide slightly high (needs ${beach.minTideNeeded}ft)` : beach.name}
                      >
                        <Typography sx={{ fontWeight: 500, color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="calendar-beach-name">
                          {beach.tideStatus === 'slightlyHigh' && <Typography component="span" sx={{ mr: '4px' }}></Typography>}
                          {beach.name}
                          {beach.isDigDay && <Typography component="span" sx={{ fontSize: '9px', fontWeight: 700, color: '#2b6cb0', ml: '4px', textTransform: 'uppercase' }}>DIG</Typography>}
                        </Typography>
                        <Typography sx={{ color: '#718096', fontSize: '10px', ...(beach.tideStatus === 'slightlyHigh' ? { color: '#c05621' } : {}) }} className="calendar-tide-time">
                          {beach.tideHeight.toFixed(1)}ft {beach.isDigDay && beach.digTime ? beach.digTime : formatTime(beach.tideTime)}
                          {beach.tideStatus === 'slightlyHigh' && <Typography component="span" sx={{ fontSize: '9px', ml: '4px' }}>(need {beach.minTideNeeded}ft)</Typography>}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }} className="calendar-month-grid">
          {monthGrid.map((cell, idx) => (
            cell.empty ? (
              <Box key={`empty-${idx}`} sx={{ backgroundColor: 'transparent' }} className="calendar-day-empty" />
            ) : (
              <Box
                key={cell.date}
                sx={{
                  backgroundColor: '#f7fafc',
                  borderRadius: '6px',
                  p: 1,
                  height: '125px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  ...(!cell.isPast ? {
                    backgroundColor: cell.beaches.length > 0
                      ? (cell.beaches.every(b => b.tideStatus === 'slightlyHigh') ? '#fffaf0' : '#f0fff4')
                      : '#fff5f5'
                  } : {}),
                  ...(cell.isToday ? { border: '2px solid #4299e1' } : {}),
                  ...(cell.isPast ? { backgroundColor: '#f1f1f1', opacity: 0.6 } : {}),
                  ...(selectedDate === cell.date && !cell.isPast ? { border: '2px solid #718096', boxShadow: '0 0 0 1px #718096' } : {}),
                  position: 'relative'
                }}
                className={`calendar-month-day ${cell.isPast ? 'past-day' : ''}`}
                onClick={() => !cell.isPast && onDateSelect?.(selectedDate === cell.date ? null : cell.date, selectedDate === cell.date ? [] : (cell.allBeaches || cell.beaches))}
              >
                {cell.isPast && <Typography sx={{ position: 'absolute', top: '2px', right: '4px', fontSize: '8px', color: '#e53e3e', textTransform: 'uppercase', fontWeight: 600 }}>Past</Typography>}
                <Box sx={{ mb: '6px' }} className="calendar-month-day-header">
                  <Typography component="span" sx={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2d3748',
                    ...(cell.isToday ? {
                      backgroundColor: '#4299e1',
                      color: 'white',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    } : {}),
                    ...(cell.isPast ? { color: '#a0aec0' } : {})
                  }} className="calendar-month-day-date">
                    {cell.day}
                  </Typography>
                </Box>

                {cell.beaches.length === 0 ? (
                  <Box sx={{ color: '#a0aec0', fontSize: '10px', textAlign: 'center', py: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }} className="calendar-month-empty-content" />
                ) : (
                  <>
                    {cell.beaches.map((beach, i) => (
                      <Box
                        key={`${beach.id}-${i}`}
                        sx={{
                          padding: '2px 4px',
                          mb: '2px',
                          borderRadius: '3px',
                          bgcolor: 'white',
                          borderLeft: '2px solid',
                          borderLeftColor: cell.isPast ? '#cbd5e0' : (beach.tideStatus === 'slightlyHigh' ? qualityColors.slightlyHigh : qualityColors.lowEnough),
                          fontSize: '10px',
                          cursor: 'default',
                          ...(beach.tideStatus === 'slightlyHigh' && !cell.isPast ? { backgroundColor: '#fffaf0' } : {})
                        }}
                        className="calendar-month-beach-item"
                        title={beach.tideStatus === 'slightlyHigh' ? `${beach.name} - Tide slightly high` : beach.name}
                      >
                        <Typography sx={{ fontWeight: 500, color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(cell.isPast ? { color: '#a0aec0' } : {}), ...(beach.tideStatus === 'slightlyHigh' ? { color: '#c05621' } : {}) }} className="calendar-beach-name">
                          {beach.tideStatus === 'slightlyHigh' && <Typography component="span" sx={{ fontSize: '8px' }}></Typography>}
                          {beach.name}
                          {beach.isDigDay && <Typography component="span" sx={{ fontSize: '8px', fontWeight: 700, color: '#2b6cb0', ml: '2px' }}>DIG</Typography>}
                        </Typography>
                        <Typography sx={{ color: '#718096', fontSize: '9px', ...(beach.tideStatus === 'slightlyHigh' ? { color: '#c05621' } : {}) }} className="calendar-tide-time-month">
                          {beach.tideHeight.toFixed(1)}ft{beach.isDigDay && beach.digTime ? ` ${beach.digTime}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </>
                )}
              </Box>
            )
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: '16px', mt: '12px', fontSize: '11px', color: '#718096' }} className="calendar-legend">
        {selectedSpecies.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
            <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#e2e8f0', border: '1px solid #a0aec0', borderRadius: '2px' }} />
            <Typography sx={{ fontSize: '11px', color: '#718096' }}>Select a species to see harvest days</Typography>
          </Box>
        ) : viewMode === 'week' ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>Good harvest day</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>Tide slightly high</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>No good tides</Typography>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>Good harvest day</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>Tide slightly high</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="calendar-legend-item">
              <Box sx={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '2px' }} />
              <Typography sx={{ fontSize: '11px', color: '#718096' }}>No good tides</Typography>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
}
