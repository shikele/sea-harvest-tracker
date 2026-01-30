import React, { useEffect, useState, useMemo } from 'react';
import { getHarvestCalendar } from '../services/api';

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c'
  },
  viewToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#edf2f7',
    borderRadius: '8px',
    padding: '4px'
  },
  viewButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#718096',
    transition: 'all 0.2s'
  },
  viewButtonActive: {
    backgroundColor: 'white',
    color: '#2d3748',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  navButton: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px'
  },
  monthLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    minWidth: '150px',
    textAlign: 'center'
  },
  weekDayHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '4px'
  },
  weekDayLabel: {
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '500',
    color: '#718096',
    padding: '8px 0'
  },
  calendar7Day: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '8px'
  },
  calendarMonth: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px'
  },
  dayCard: {
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    padding: '12px',
    height: '180px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  dayCardMonth: {
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    padding: '8px',
    height: '125px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    flexDirection: 'column'
  },
  dayCardEmpty: {
    backgroundColor: 'transparent',
    height: '125px',
    visibility: 'hidden'
  },
  dayCardPast: {
    backgroundColor: '#f1f1f1',
    opacity: 0.6
  },
  pastLabel: {
    position: 'absolute',
    top: '2px',
    right: '4px',
    fontSize: '8px',
    color: '#e53e3e',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  dayCardToday: {
    border: '2px solid #4299e1'
  },
  dayHeader: {
    textAlign: 'center',
    marginBottom: '8px',
    flexShrink: 0
  },
  dayHeaderMonth: {
    marginBottom: '6px'
  },
  dayOfWeek: {
    fontSize: '12px',
    color: '#718096',
    textTransform: 'uppercase',
    fontWeight: '500'
  },
  dayDate: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748'
  },
  dayDateMonth: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748'
  },
  dayDateToday: {
    backgroundColor: '#4299e1',
    color: 'white',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  beachList: {
    fontSize: '11px',
    flex: 1,
    overflow: 'hidden'
  },
  beachItem: {
    padding: '6px 8px',
    marginBottom: '6px',
    borderRadius: '4px',
    backgroundColor: 'white',
    borderLeft: '3px solid'
  },
  beachItemMonth: {
    padding: '2px 4px',
    marginBottom: '2px',
    borderRadius: '3px',
    backgroundColor: 'white',
    borderLeft: '2px solid',
    fontSize: '10px'
  },
  beachName: {
    fontWeight: '500',
    color: '#2d3748',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  tideTime: {
    color: '#718096',
    fontSize: '10px'
  },
  tideTimeMonth: {
    color: '#718096',
    fontSize: '9px'
  },
  emptyDay: {
    color: '#718096',
    fontSize: '11px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '4px'
  },
  emptyIcon: {
    fontSize: '28px',
    color: '#a0aec0'
  },
  emptyIconSmall: {
    fontSize: '20px',
    color: '#a0aec0'
  },
  emptyDayMonth: {
    color: '#a0aec0',
    fontSize: '10px',
    textAlign: 'center',
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096'
  },
  moreCount: {
    fontSize: '10px',
    color: '#718096',
    textAlign: 'center',
    marginTop: '4px'
  },
  tideDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '4px'
  },
  tideIndicators: {
    display: 'flex',
    gap: '2px',
    flexWrap: 'wrap',
    marginTop: '4px'
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '12px',
    fontSize: '11px',
    color: '#718096'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

const qualityColors = {
  excellent: '#48bb78',
  good: '#4299e1',
  fair: '#ecc94b'
};

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

export default function HarvestCalendar({ onBeachClick }) {
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
    return now.toISOString().split('T')[0];
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

  // Filter calendar data to only include today and future for week view
  const futureCalendarData = useMemo(() => {
    return calendarData.filter(day => day.date >= today);
  }, [calendarData, today]);

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

  // Create a map of date -> beaches for quick lookup
  const dateMap = useMemo(() => {
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
      const hasData = dateStr in dateMap;
      grid.push({
        date: dateStr,
        day,
        beaches: dateMap[dateStr] || [],
        isToday: dateStr === today,
        isPast,
        hasData
      });
    }

    return grid;
  }, [currentMonth, dateMap, today]);

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
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Harvest Calendar</div>
        </div>
        <div style={styles.loading}>Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>Harvest Calendar</div>
        </div>
        <div style={styles.loading}>Error: {error}</div>
      </div>
    );
  }

  const maxBeachesPerDay = viewMode === 'month' ? 2 : 4;

  return (
    <div style={styles.container} className="calendar-container">
      <div style={styles.header} className="calendar-header">
        <div style={styles.title} className="calendar-title">Harvest Calendar</div>
        <div style={styles.viewToggle} className="calendar-view-toggle">
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'week' ? styles.viewButtonActive : {})
            }}
            className="calendar-view-button"
            onClick={() => setViewMode('week')}
          >
            7 Days
          </button>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'month' ? styles.viewButtonActive : {})
            }}
            className="calendar-view-button"
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
      </div>

      {viewMode === 'week' && (
        <div style={styles.monthNav} className="calendar-nav">
          <button
            style={{...styles.navButton, opacity: weekOffset === 0 ? 0.5 : 1}}
            className="calendar-nav-button"
            onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
          >
            &larr; Prev
          </button>
          <div style={styles.monthLabel} className="calendar-label">{weekLabel}</div>
          <button
            style={{...styles.navButton, opacity: weekOffset >= maxWeeks - 1 ? 0.5 : 1}}
            className="calendar-nav-button"
            onClick={() => setWeekOffset(w => Math.min(maxWeeks - 1, w + 1))}
            disabled={weekOffset >= maxWeeks - 1}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div style={styles.monthNav} className="calendar-nav">
          <button
            style={{...styles.navButton, opacity: isCurrentMonth ? 0.4 : 1, cursor: isCurrentMonth ? 'not-allowed' : 'pointer'}}
            className="calendar-nav-button"
            onClick={() => navigateMonth(-1)}
            disabled={isCurrentMonth}
          >
            &larr; Prev
          </button>
          <div style={styles.monthLabel} className="calendar-label">{monthLabel}</div>
          <button
            style={{...styles.navButton, opacity: isMaxMonth ? 0.4 : 1, cursor: isMaxMonth ? 'not-allowed' : 'pointer'}}
            className="calendar-nav-button"
            onClick={() => navigateMonth(1)}
            disabled={isMaxMonth}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div style={styles.weekDayHeader} className="calendar-weekday-header">
          {WEEKDAYS.map(day => (
            <div key={day} style={styles.weekDayLabel} className="calendar-weekday-label">{day}</div>
          ))}
        </div>
      )}

      {viewMode === 'week' ? (
        <div style={styles.calendar7Day} className="calendar-7day-grid">
          {weekData.map((day) => (
            <div key={day.date} style={{
              ...styles.dayCard,
              ...(isSameDay(day.date, today) ? styles.dayCardToday : {})
            }} className="calendar-day-card">
              <div style={styles.dayHeader} className="calendar-day-header">
                <div style={styles.dayOfWeek} className="calendar-day-of-week">{day.dayOfWeek}</div>
                <div style={styles.dayDate} className="calendar-day-date">{formatDayDate(day.date)}</div>
              </div>

              <div style={styles.beachList} className="calendar-beach-list">
                {day.beaches.length === 0 ? (
                  <div style={styles.emptyDay}>
                    {!(day.date in dateMap) ? (
                      <>
                        <span style={{ fontSize: '14px', color: '#a0aec0' }}>—</span>
                        <span style={{ fontStyle: 'italic' }}>No data</span>
                      </>
                    ) : (
                      <>
                        <span style={styles.emptyIcon}>⬆</span>
                        <span>Tides too high</span>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {day.beaches.map((beach, i) => (
                      <div
                        key={`${beach.id}-${i}`}
                        style={{
                          ...styles.beachItem,
                          borderLeftColor: qualityColors[beach.tideQuality] || '#4299e1',
                          cursor: 'pointer'
                        }}
                        className="calendar-beach-item"
                        onClick={() => onBeachClick?.(beach)}
                        title={beach.name}
                      >
                        <div style={styles.beachName} className="calendar-beach-name">{beach.name}</div>
                        <div style={styles.tideTime} className="calendar-tide-time">
                          {beach.tideHeight.toFixed(1)}ft {formatTime(beach.tideTime)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.calendarMonth} className="calendar-month-grid">
          {monthGrid.map((cell, idx) => (
            cell.empty ? (
              <div key={`empty-${idx}`} style={styles.dayCardEmpty} className="calendar-day-empty" />
            ) : (
              <div
                key={cell.date}
                style={{
                  ...styles.dayCardMonth,
                  ...(cell.isToday ? styles.dayCardToday : {}),
                  ...(cell.isPast ? styles.dayCardPast : {}),
                  ...(cell.beaches.length > 0 && !cell.isPast ? { backgroundColor: '#f0fff4' } : {}),
                  position: 'relative'
                }}
                className={`calendar-month-day ${cell.isPast ? 'past-day' : ''}`}
                onClick={() => !cell.isPast && cell.beaches[0] && onBeachClick?.(cell.beaches[0])}
              >
                {cell.isPast && <span style={styles.pastLabel}>Past</span>}
                <div style={styles.dayHeaderMonth} className="calendar-month-day-header">
                  <span style={{
                    ...styles.dayDateMonth,
                    ...(cell.isToday ? styles.dayDateToday : {}),
                    ...(cell.isPast ? { color: '#a0aec0' } : {})
                  }} className="calendar-month-day-date">
                    {cell.day}
                  </span>
                </div>

                {cell.beaches.length === 0 ? (
                  <div style={styles.emptyDayMonth}>
                    {!cell.hasData ? (
                      <span style={{ fontSize: '10px', color: '#a0aec0', fontStyle: 'italic' }}>No data</span>
                    ) : (
                      <span style={{...styles.emptyIconSmall, ...(cell.isPast ? { color: '#cbd5e0' } : {})}}>⬆</span>
                    )}
                  </div>
                ) : (
                  <>
                    {cell.beaches.map((beach, i) => (
                      <div
                        key={`${beach.id}-${i}`}
                        style={{
                          ...styles.beachItemMonth,
                          borderLeftColor: cell.isPast ? '#cbd5e0' : (qualityColors[beach.tideQuality] || '#4299e1'),
                          cursor: cell.isPast ? 'default' : 'pointer'
                        }}
                        className="calendar-month-beach-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!cell.isPast) onBeachClick?.(beach);
                        }}
                        title={beach.name}
                      >
                        <div style={{...styles.beachName, ...(cell.isPast ? { color: '#a0aec0' } : {})}} className="calendar-beach-name">{beach.name}</div>
                        <div style={styles.tideTimeMonth} className="calendar-tide-time-month">
                          {beach.tideHeight.toFixed(1)}ft {formatTime(beach.tideTime)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          ))}
        </div>
      )}

      <div style={styles.legend} className="calendar-legend">
        <div style={styles.legendItem} className="calendar-legend-item">
          <span style={{ ...styles.tideDot, backgroundColor: qualityColors.excellent }} />
          Excellent (&lt;0ft)
        </div>
        <div style={styles.legendItem} className="calendar-legend-item">
          <span style={{ ...styles.tideDot, backgroundColor: qualityColors.good }} />
          Good (0-1ft)
        </div>
        <div style={styles.legendItem} className="calendar-legend-item">
          <span style={{ fontSize: '14px', color: '#a0aec0' }}>⬆</span>
          Tides too high
        </div>
        <div style={styles.legendItem} className="calendar-legend-item">
          <span style={{ fontSize: '11px', color: '#a0aec0', fontStyle: 'italic' }}>No data</span>
          Beyond forecast
        </div>
      </div>
    </div>
  );
}
