import React from 'react';

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: '4px solid',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
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
    marginTop: '12px',
    padding: '10px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px'
  },
  tideLabel: {
    fontSize: '12px',
    color: '#718096'
  },
  tideTime: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2d3748'
  },
  tideHeight: {
    fontSize: '13px',
    color: '#4a5568'
  },
  closureReason: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#fff5f5',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#c53030'
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
  }
};

const statusColors = {
  green: { border: '#48bb78', badge: '#c6f6d5', text: '#22543d' },
  yellow: { border: '#ecc94b', badge: '#fefcbf', text: '#744210' },
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

export default function BeachCard({ beach, onClick }) {
  const colors = statusColors[beach.statusColor] || statusColors.gray;
  const nextTide = beach.nextLowTides?.[0];
  const tideQualityColors = nextTide ? qualityColors[nextTide.quality] : null;

  // Check if there's a good/excellent tide in the 7-day period
  const hasGoodTideIn7Days = beach.nextLowTides?.some(
    t => t.quality === 'good' || t.quality === 'excellent'
  );

  // Get the next good tide (may be extended beyond 7 days)
  const nextGoodTide = beach.nextGoodTide;
  const showExtendedTide = !hasGoodTideIn7Days && nextGoodTide?.isExtended;

  return (
    <div
      style={{ ...styles.card, borderLeftColor: colors.border }}
      onClick={() => onClick?.(beach)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      <div style={styles.header}>
        <div>
          <div style={styles.name}>
            {beach.name}
            {beach.accessType === 'boat' && (
              <span style={styles.boatBadge}>Boat</span>
            )}
          </div>
          <div style={styles.location}>
            {beach.region} - {beach.county} County
            {beach.distance !== null && beach.distance !== undefined && (
              <span style={styles.distanceBadge}>
                ({beach.distance.toFixed(1)} mi)
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: colors.badge,
            color: colors.text
          }}
        >
          {beach.biotoxinStatus}
        </span>
      </div>

      {beach.closureReason && (
        <div style={styles.closureReason}>
          Closed: {beach.closureReason}
          {beach.speciesAffected && ` (${beach.speciesAffected})`}
        </div>
      )}

      {nextTide && beach.biotoxinStatus !== 'closed' && (
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
              {nextTide.quality}
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
            {nextGoodTide.quality}
          </span>
        </div>
      )}
    </div>
  );
}
