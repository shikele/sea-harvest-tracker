import React from 'react';

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '8px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
    borderTop: '2px solid transparent',
    borderRight: '2px solid transparent',
    borderBottom: '2px solid transparent',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s'
  },
  cardSelected: {
    borderTop: '2px solid #48bb78',
    borderRight: '2px solid #48bb78',
    borderBottom: '2px solid #48bb78',
    boxShadow: '0 2px 8px rgba(72, 187, 120, 0.3)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0'
  },
  name: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a202c'
  },
  location: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '2px'
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  tideInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 10px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px'
  },
  tideInfoCompact: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '6px',
    fontSize: '13px',
    color: '#4a5568'
  },
  tideLabel: {
    fontSize: '11px',
    color: '#718096'
  },
  tideTime: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#2d3748'
  },
  tideHeight: {
    fontSize: '12px',
    color: '#4a5568'
  },
  qualityBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
  },
  nextGoodTideInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '10px',
    backgroundColor: '#ebf8ff',
    borderRadius: '8px',
    borderLeft: '3px solid #4299e1'
  },
  extendedLabel: {
    fontSize: '11px',
    color: '#2b6cb0',
    fontWeight: '500',
    marginBottom: '2px'
  },
  distanceBadge: {
    fontSize: '12px',
    color: '#805ad5',
    fontWeight: '500',
    marginLeft: '8px'
  },
  ferryBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
    marginLeft: '4px'
  },
  boatBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
    marginLeft: '8px',
    textTransform: 'uppercase'
  },
  badTimeBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '500',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    marginLeft: '6px'
  }
};

const statusColors = {
  green: { border: '#48bb78', badge: '#c6f6d5', text: '#22543d' },
  yellow: { border: '#ecc94b', badge: '#fefcbf', text: '#744210' },
  orange: { border: '#ed8936', badge: '#fefcbf', text: '#c05621' },
  red: { border: '#f56565', badge: '#fed7d7', text: '#742a2a' },
  gray: { border: '#a0aec0', badge: '#e2e8f0', text: '#4a5568' }
};

const qualityColors = {
  excellent: { bg: '#c6f6d5', text: '#22543d' },
  good: { bg: '#bee3f8', text: '#2c5282' },
  fair: { bg: '#fefcbf', text: '#744210' },
  poor: { bg: '#e2e8f0', text: '#4a5568' }
};

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getTimeUntil(dateTimeStr) {
  if (!dateTimeStr) return '';
  const now = new Date();
  const target = new Date(dateTimeStr);
  const hours = Math.round((target - now) / (1000 * 60 * 60));

  if (hours < 1) return 'Now';
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function formatTimeOnly(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function isBadTime(dateTimeStr) {
  if (!dateTimeStr) return false;
  const date = new Date(dateTimeStr);
  const hour = date.getHours();
  // Bad time if before 8am or after 8pm (20:00)
  return hour < 8 || hour >= 20;
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  // Ensure both dates parse in local timezone
  const d1 = new Date(typeof date1 === 'string' && !date1.includes('T') && !date1.includes(':') ? date1 + 'T00:00:00' : date1);
  const d2 = new Date(typeof date2 === 'string' && !date2.includes('T') && !date2.includes(':') ? date2 + 'T00:00:00' : date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Derive status color from biotoxinStatus and seasonOpen if statusColor not provided
function getStatusColorFromStatus(biotoxinStatus, seasonOpen) {
  if (biotoxinStatus === 'closed') return 'red';
  if (biotoxinStatus === 'open' && seasonOpen === false) return 'orange';
  if (biotoxinStatus === 'open') return 'green';
  if (biotoxinStatus === 'conditional') return 'yellow';
  return 'gray';
}

export default function BeachCard({ beach, onClick, selectedDate, isSelected = false }) {
  const colorKey = beach.statusColor || getStatusColorFromStatus(beach.biotoxinStatus, beach.seasonOpen);
  const colors = statusColors[colorKey] || statusColors.gray;

  // If beach has direct tide data from calendar (tideHeight, tideTime, tideQuality), use it
  const hasDirectTideData = beach.tideHeight !== undefined && beach.tideTime !== undefined;

  // If selectedDate is provided, find the best (lowest) tide for that day
  const tideForSelectedDay = selectedDate && beach.nextLowTides && !hasDirectTideData
    ? beach.nextLowTides
        .filter(t => isSameDay(t.datetime, selectedDate))
        .reduce((best, t) => (!best || t.height < best.height) ? t : best, null)
    : null;

  // Build tide object from direct data or looked up data
  // For the default view (no selectedDate), prefer the first good/excellent tide
  const firstGoodTide = beach.nextLowTides?.find(t => t.quality === 'good' || t.quality === 'excellent');
  const nextTide = hasDirectTideData
    ? { datetime: beach.tideTime, height: beach.tideHeight, quality: beach.tideQuality }
    : (tideForSelectedDay || firstGoodTide || beach.nextLowTides?.[0]);
  const tideQualityColors = nextTide ? qualityColors[nextTide.quality] : null;

  // Check if there's a good/excellent tide in the 7-day period
  const hasGoodTideIn7Days = beach.nextLowTides?.some(
    t => t.quality === 'good' || t.quality === 'excellent'
  );

  // Get the next good tide (may be extended beyond 7 days)
  const nextGoodTide = beach.nextGoodTide;
  const showExtendedTide = !hasGoodTideIn7Days && nextGoodTide?.isExtended && !selectedDate;

  return (
    <div
      style={{
        ...styles.card,
        borderLeft: `4px solid ${colors.border}`,
        ...(isSelected ? styles.cardSelected : {})
      }}
      className="beach-card"
      onClick={() => onClick?.(beach)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
      }}
    >
      <div style={styles.header}>
        <div>
          <div style={styles.name}>
            {beach.name}
            {beach.accessType === 'boat' && (
              <span style={styles.boatBadge}>Boat</span>
            )}
            {beach.distance !== null && beach.distance !== undefined && (
              beach.distanceSource === 'driving' ? (
                <span style={styles.distanceBadge}>
                  ({beach.durationMin} min / {beach.distance.toFixed(1)} mi)
                  {beach.hasFerry && (
                    <span style={styles.ferryBadge}>ferry</span>
                  )}
                </span>
              ) : (
                <span style={styles.distanceBadge}>
                  ({beach.distance.toFixed(1)} mi)
                </span>
              )
            )}
          </div>
          <div style={styles.location}>
            {beach.region} - {beach.county} County
          </div>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: colors.badge,
            color: colors.text
          }}
        >
          {colorKey === 'green' ? 'OPEN' : 'CLOSED'}
        </span>
      </div>

      {selectedDate && nextTide && colorKey === 'green' ? (
        <div style={styles.tideInfoCompact}>
          <span>Low tide: <strong>{formatTimeOnly(nextTide.datetime)}</strong></span>
          <span>{nextTide.height.toFixed(1)} ft</span>
          {tideQualityColors && (
            <span
              style={{
                ...styles.qualityBadge,
                backgroundColor: tideQualityColors.bg,
                color: tideQualityColors.text
              }}
            >
              {nextTide.quality === 'poor' ? 'poor tide' : nextTide.quality === 'excellent' ? 'low tide' : nextTide.quality}
            </span>
          )}
          {isBadTime(nextTide.datetime) && (
            <span style={styles.badTimeBadge}>bad time</span>
          )}
        </div>
      ) : !selectedDate && nextTide && colorKey === 'green' && (
        <div style={styles.tideInfo}>
          <div style={{ flex: 1 }}>
            <div style={styles.tideLabel}>Next Low Tide</div>
            <div style={styles.tideTime}>
              {formatDateTime(nextTide.datetime)}
            </div>
            <div style={styles.tideHeight}>
              {nextTide.height.toFixed(1)} ft ({getTimeUntil(nextTide.datetime)} from now)
            </div>
          </div>
          {tideQualityColors && (
            <span
              style={{
                ...styles.qualityBadge,
                backgroundColor: tideQualityColors.bg,
                color: tideQualityColors.text
              }}
            >
              {nextTide.quality === 'poor' ? 'poor tide' : nextTide.quality === 'excellent' ? 'low tide' : nextTide.quality}
            </span>
          )}
        </div>
      )}

      {showExtendedTide && nextGoodTide && (
        <div style={styles.nextGoodTideInfo}>
          <div style={{ flex: 1 }}>
            <div style={styles.extendedLabel}>Next Good Tide (beyond 7 days)</div>
            <div style={styles.tideTime}>
              {formatDateTime(nextGoodTide.datetime)}
            </div>
            <div style={styles.tideHeight}>
              {nextGoodTide.height.toFixed(1)} ft ({getTimeUntil(nextGoodTide.datetime)} from now)
            </div>
          </div>
          <span
            style={{
              ...styles.qualityBadge,
              backgroundColor: qualityColors[nextGoodTide.quality]?.bg || '#e2e8f0',
              color: qualityColors[nextGoodTide.quality]?.text || '#4a5568'
            }}
          >
            {nextGoodTide.quality === 'poor' ? 'poor tide' : nextGoodTide.quality === 'excellent' ? 'low tide' : nextGoodTide.quality}
          </span>
        </div>
      )}
    </div>
  );
}
