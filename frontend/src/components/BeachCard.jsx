import React from 'react';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

const statusColors = {
  green: { border: '#48bb78', badge: '#c6f6d5', text: '#22543d' },
  yellow: { border: '#ecc94b', badge: '#fefcbf', text: '#744210' },
  orange: { border: '#ed8936', badge: '#fefcbf', text: '#c05621' },
  red: { border: '#f56565', badge: '#fed7d7', text: '#742a2a' },
  blue: { border: '#4299e1', badge: '#ebf8ff', text: '#2b6cb0' },
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
  if (biotoxinStatus === 'wdfw_managed') return 'blue';
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
    <Paper
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
      sx={{
        p: '12px 14px',
        mb: 1,
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        borderTop: '2px solid transparent',
        borderRight: '2px solid transparent',
        borderBottom: '2px solid transparent',
        borderLeft: `4px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        ...(isSelected ? {
          borderTop: '2px solid #48bb78',
          borderRight: '2px solid #48bb78',
          borderBottom: '2px solid #48bb78',
          boxShadow: '0 2px 8px rgba(72, 187, 120, 0.3)'
        } : {})
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body1" sx={{ fontSize: 16, fontWeight: 600, color: '#1a202c' }}>
            {beach.name}
            {beach.accessType === 'boat' && (
              <Chip label="Boat" size="small" variant="outlined" color="primary" sx={{ ml: 1, fontSize: 10, height: 20 }} />
            )}
            {beach.distance !== null && beach.distance !== undefined && (
              beach.distanceSource === 'driving' ? (
                <Chip
                  size="small"
                  label={`${beach.durationMin} min / ${beach.distance.toFixed(1)} mi`}
                  sx={{ ml: 1, fontSize: 12, fontWeight: 500, color: '#805ad5', bgcolor: 'rgba(128,90,213,0.08)', height: 22 }}
                />
              ) : (
                <Chip
                  size="small"
                  label={`${beach.distance.toFixed(1)} mi`}
                  sx={{ ml: 1, fontSize: 12, fontWeight: 500, color: '#805ad5', bgcolor: 'rgba(128,90,213,0.08)', height: 22 }}
                />
              )
            )}
            {beach.hasFerry && beach.distanceSource === 'driving' && (
              <Chip label="ferry" size="small" color="info" sx={{ ml: 0.5, fontSize: 10, height: 20 }} />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {beach.region} - {beach.county} County
          </Typography>
        </Box>
        <Chip
          label={colorKey === 'green' ? 'OPEN' : colorKey === 'blue' ? 'WDFW' : 'CLOSED'}
          size="small"
          sx={{
            fontWeight: 500,
            textTransform: 'uppercase',
            bgcolor: colors.badge,
            color: colors.text,
            fontSize: 12,
          }}
        />
      </Box>

      {colorKey === 'blue' && (
        <Box sx={{ mt: 1, p: '8px 10px', bgcolor: '#ebf8ff', borderRadius: '8px', borderLeft: '3px solid #4299e1' }}>
          {beach.upcomingDigs?.length > 0 ? (
            <>
              <Typography variant="caption" sx={{ color: '#2b6cb0', fontWeight: 600, display: 'block', mb: 0.5 }}>
                Upcoming Digs
              </Typography>
              {beach.upcomingDigs.slice(0, 3).map((dig, i) => (
                <Typography key={i} variant="caption" sx={{ color: '#2b6cb0', display: 'block' }}>
                  {dig.date} ({dig.dayOfWeek}) {dig.time} — {dig.tideHeight}ft
                </Typography>
              ))}
              {beach.upcomingDigs.length > 3 && (
                <Typography variant="caption" sx={{ color: '#2b6cb0', fontStyle: 'italic' }}>
                  +{beach.upcomingDigs.length - 3} more
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="caption" sx={{ color: '#2b6cb0', fontWeight: 500 }}>
              Razor clam digs are managed by WDFW.
              {beach.wdfwUrl && (
                <Link href={beach.wdfwUrl} target="_blank" sx={{ ml: 0.5, color: '#2b6cb0', textDecoration: 'underline' }}>
                  Check WDFW for dig dates
                </Link>
              )}
            </Typography>
          )}
        </Box>
      )}

      {selectedDate && nextTide && colorKey === 'green' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, fontSize: 13, color: '#4a5568' }}>
          <Typography variant="body2">Low tide: <strong>{formatTimeOnly(nextTide.datetime)}</strong></Typography>
          <Typography variant="body2">{nextTide.height.toFixed(1)} ft</Typography>
          {tideQualityColors && (
            <Chip
              label={nextTide.quality === 'excellent' ? 'low tide' : nextTide.quality === 'good' ? 'low tide' : nextTide.quality === 'fair' ? 'tide slightly high' : 'poor tide'}
              size="small"
              sx={{ fontSize: 11, height: 20, bgcolor: tideQualityColors.bg, color: tideQualityColors.text }}
            />
          )}
          {isBadTime(nextTide.datetime) && (
            <Chip label="bad time" size="small" color="error" sx={{ fontSize: 10, height: 20 }} />
          )}
        </Box>
      ) : !selectedDate && nextTide && colorKey === 'green' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: '8px 10px', bgcolor: '#f7fafc', borderRadius: '8px' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">Next Low Tide</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2d3748' }}>
              {formatDateTime(nextTide.datetime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextTide.height.toFixed(1)} ft ({getTimeUntil(nextTide.datetime)} from now)
            </Typography>
          </Box>
          {tideQualityColors && (
            <Chip
              label={nextTide.quality === 'excellent' ? 'low tide' : nextTide.quality === 'good' ? 'low tide' : nextTide.quality === 'fair' ? 'tide slightly high' : 'poor tide'}
              size="small"
              sx={{ fontSize: 11, height: 20, bgcolor: tideQualityColors.bg, color: tideQualityColors.text }}
            />
          )}
        </Box>
      )}

      {showExtendedTide && nextGoodTide && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1.25, bgcolor: '#ebf8ff', borderRadius: '8px', borderLeft: '3px solid #4299e1' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#2b6cb0', fontWeight: 500, display: 'block', mb: 0.25 }}>Next Good Tide (beyond 7 days)</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#2d3748' }}>
              {formatDateTime(nextGoodTide.datetime)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextGoodTide.height.toFixed(1)} ft ({getTimeUntil(nextGoodTide.datetime)} from now)
            </Typography>
          </Box>
          <Chip
            label={nextGoodTide.quality === 'excellent' ? 'low tide' : nextGoodTide.quality === 'good' ? 'low tide' : nextGoodTide.quality === 'fair' ? 'tide slightly high' : 'poor tide'}
            size="small"
            sx={{ fontSize: 11, height: 20, bgcolor: qualityColors[nextGoodTide.quality]?.bg || '#e2e8f0', color: qualityColors[nextGoodTide.quality]?.text || '#4a5568' }}
          />
        </Box>
      )}
    </Paper>
  );
}
