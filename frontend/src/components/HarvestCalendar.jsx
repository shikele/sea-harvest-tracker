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
    minHeight: '100px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  dayCardEmpty: {
    backgroundColor: 'transparent',
    minHeight: '100px'
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
    color: '#a0aec0',
    fontSize: '11px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  emptyDayMonth: {
    color: '#cbd5e0',
    fontSize: '10px',
    textAlign: 'center',
    padding: '10px 0'
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

  useEffect(() => {
    async function fetchCalendar() {
      setLoading(true);
      try {
        // Always fetch 90 days for navigation
        const data = await getHarvestCalendar(90);
        setCalendarData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
  }, []);

  // Get current week's data based on offset
  const weekData = useMemo(() => {
    const start = weekOffset * 7;
    return calendarData.slice(start, start + 7);
  }, [calendarData, weekOffset]);

  // Week navigation label
  const weekLabel = useMemo(() => {
    if (weekData.length === 0) return '';
    const startDate = new Date(weekData[0]?.date + 'T00:00:00');
    const endDate = new Date(weekData[weekData.length - 1]?.date + 'T00:00:00');
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [weekData]);

  const maxWeeks = Math.floor(calendarData.length / 7);

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

    // Add empty cells for padding
    for (let i = 0; i < startPadding; i++) {
      grid.push({ empty: true });
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      grid.push({
        date: dateStr,
        day,
        beaches: dateMap[dateStr] || [],
        isToday: dateStr === today
      });
    }

    return grid;
  }, [currentMonth, dateMap, today]);

  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  function navigateMonth(delta) {
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
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Harvest Calendar</div>
        <div style={styles.viewToggle}>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'week' ? styles.viewButtonActive : {})
            }}
            onClick={() => setViewMode('week')}
          >
            7 Days
          </button>
          <button
            style={{
              ...styles.viewButton,
              ...(viewMode === 'month' ? styles.viewButtonActive : {})
            }}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
      </div>

      {viewMode === 'week' && (
        <div style={styles.monthNav}>
          <button
            style={{...styles.navButton, opacity: weekOffset === 0 ? 0.5 : 1}}
            onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
          >
            &larr; Prev
          </button>
          <div style={styles.monthLabel}>{weekLabel}</div>
          <button
            style={{...styles.navButton, opacity: weekOffset >= maxWeeks - 1 ? 0.5 : 1}}
            onClick={() => setWeekOffset(w => Math.min(maxWeeks - 1, w + 1))}
            disabled={weekOffset >= maxWeeks - 1}
          >
            Next &rarr;
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div style={styles.monthNav}>
          <button style={styles.navButton} onClick={() => navigateMonth(-1)}>
            &larr; Prev
          </button>
          <div style={styles.monthLabel}>{monthLabel}</div>
          <button style={styles.navButton} onClick={() => navigateMonth(1)}>
            Next &rarr;
          </button>
        </div>
      )}

      {viewMode === 'month' && (
        <div style={styles.weekDayHeader}>
          {WEEKDAYS.map(day => (
            <div key={day} style={styles.weekDayLabel}>{day}</div>
          ))}
        </div>
      )}

      {viewMode === 'week' ? (
        <div style={styles.calendar7Day}>
          {weekData.map((day) => (
            <div key={day.date} style={{
              ...styles.dayCard,
              ...(isSameDay(day.date, today) ? styles.dayCardToday : {})
            }}>
              <div style={styles.dayHeader}>
                <div style={styles.dayOfWeek}>{day.dayOfWeek}</div>
                <div style={styles.dayDate}>{formatDayDate(day.date)}</div>
              </div>

              <div style={styles.beachList}>
                {day.beaches.length === 0 ? (
                  <div style={styles.emptyDay}>-</div>
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
                        onClick={() => onBeachClick?.(beach)}
                        title={beach.name}
                      >
                        <div style={styles.beachName}>{beach.name}</div>
                        <div style={styles.tideTime}>
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
        <div style={styles.calendarMonth}>
          {monthGrid.map((cell, idx) => (
            cell.empty ? (
              <div key={`empty-${idx}`} style={styles.dayCardEmpty} />
            ) : (
              <div
                key={cell.date}
                style={{
                  ...styles.dayCardMonth,
                  ...(cell.isToday ? styles.dayCardToday : {}),
                  ...(cell.beaches.length > 0 ? { backgroundColor: '#f0fff4' } : {})
                }}
                onClick={() => cell.beaches[0] && onBeachClick?.(cell.beaches[0])}
              >
                <div style={styles.dayHeaderMonth}>
                  <span style={{
                    ...styles.dayDateMonth,
                    ...(cell.isToday ? styles.dayDateToday : {})
                  }}>
                    {cell.day}
                  </span>
                </div>

                {cell.beaches.length === 0 ? (
                  <div style={styles.emptyDayMonth}>-</div>
                ) : (
                  <>
                    {cell.beaches.map((beach, i) => (
                      <div
                        key={`${beach.id}-${i}`}
                        style={{
                          ...styles.beachItemMonth,
                          borderLeftColor: qualityColors[beach.tideQuality] || '#4299e1',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBeachClick?.(beach);
                        }}
                        title={beach.name}
                      >
                        <div style={styles.beachName}>{beach.name}</div>
                        <div style={styles.tideTimeMonth}>
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

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.tideDot, backgroundColor: qualityColors.excellent }} />
          &lt;0ft
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.tideDot, backgroundColor: qualityColors.good }} />
          0-1ft
        </div>
      </div>
    </div>
  );
}
