import React, { useEffect, useState } from 'react';
import { getTides } from '../services/api';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

function formatTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatTooltipTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function TideChart({ stationId, stationName, days = 7, expanded = false, onClose, selectedDate = null, onResetToToday = null }) {
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showDetails, setShowDetails] = useState(false);

  // Calculate 7-day range starting from the selected date
  const getRange = (date) => {
    const d = typeof date === 'string'
      ? new Date(date + 'T00:00:00')
      : new Date(date);
    d.setHours(0, 0, 0, 0);

    const start = new Date(d);
    const end = new Date(d);
    end.setDate(start.getDate() + 6); // 7 days inclusive
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  // Determine the 7-day range to display
  const displayDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const { start: weekStart, end: weekEnd } = getRange(displayDate);

  // Check if showing today or a selected date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isShowingToday = !selectedDate || (displayDate.toDateString() === today.toDateString());

  // Helper to check if a prediction is on the selected date
  const isOnSelectedDate = (datetime) => {
    if (!selectedDate) return false;
    const predDate = new Date(datetime);
    // Parse selectedDate in local timezone
    const selDate = new Date(selectedDate + 'T00:00:00');
    return predDate.getFullYear() === selDate.getFullYear() &&
           predDate.getMonth() === selDate.getMonth() &&
           predDate.getDate() === selDate.getDate();
  };

  useEffect(() => {
    async function fetchTides() {
      if (!stationId) {
        setLoading(false);
        setError('No station ID');
        return;
      }

      setLoading(true);
      try {
        // Fetch enough days to cover the week (14 days to be safe)
        const data = await getTides(stationId, 14);
        setTideData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTides();
  }, [stationId]);

  if (loading) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <CircularProgress size={32} />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Alert severity="error">Error: {error}</Alert>
      </Paper>
    );
  }

  if (!tideData?.predictions?.length) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>No tide data available</Typography>
      </Paper>
    );
  }

  // Filter predictions to only show the selected week
  const predictions = tideData.predictions.filter(p => {
    const predDate = new Date(p.datetime);
    return predDate >= weekStart && predDate <= weekEnd;
  });

  // Format the date range for the title
  const startDateStr = weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const endDateStr = weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // If no predictions for selected week, show message
  if (predictions.length === 0) {
    return (
      <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a202c' }}>
            Tide Predictions: {startDateStr} - {endDateStr}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {stationName || tideData.stationName}
          </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>No tide data available for this period</Typography>
      </Paper>
    );
  }
  const minHeight = Math.min(...predictions.map(p => p.height));
  const maxHeight = Math.max(...predictions.map(p => p.height));
  const range = maxHeight - minHeight || 1;

  // Create SVG path for tide curve
  const width = 420;
  const height = 140;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = predictions.map((p, i) => {
    const x = paddingLeft + (i / (predictions.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((p.height - minHeight) / range) * chartHeight;
    return { x, y, ...p };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Y-axis labels
  const yAxisLabels = [
    { value: maxHeight, y: paddingTop },
    { value: 0, y: paddingTop + chartHeight - ((0 - minHeight) / range) * chartHeight },
    { value: minHeight, y: paddingTop + chartHeight }
  ].filter(l => l.value >= minHeight && l.value <= maxHeight);

  // X-axis labels (first, middle, last)
  const xAxisLabels = [
    { label: predictions[0]?.datetime?.split(' ')[0] || '', x: paddingLeft },
    { label: predictions[Math.floor(predictions.length / 2)]?.datetime?.split(' ')[0] || '', x: paddingLeft + chartWidth / 2 },
    { label: predictions[predictions.length - 1]?.datetime?.split(' ')[0] || '', x: paddingLeft + chartWidth }
  ];

  const maxTideItems = expanded ? 30 : 8;

  return (
    <Paper sx={{ bgcolor: 'white', borderRadius: '12px', p: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', ...(expanded ? { maxHeight: '80vh', overflowY: 'auto' } : {}) }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1a202c' }}>
            Tide Predictions: {startDateStr} - {endDateStr}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {stationName || tideData.stationName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!isShowingToday && onResetToToday && (
            <Button
              variant="outlined"
              size="small"
              onClick={onResetToToday}
            >
              Reset to Today
            </Button>
          )}
          {expanded && onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ position: 'relative', height: 150, mb: 2 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%' }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Y-axis */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={paddingTop + chartHeight}
            stroke="#cbd5e0"
            strokeWidth="1"
          />

          {/* X-axis */}
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={paddingLeft + chartWidth}
            y2={paddingTop + chartHeight}
            stroke="#cbd5e0"
            strokeWidth="1"
          />

          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <text
              key={i}
              x={paddingLeft - 5}
              y={label.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#718096"
            >
              {label.value.toFixed(0)}ft
            </text>
          ))}

          {/* X-axis labels */}
          {xAxisLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={height - 5}
              textAnchor="middle"
              fontSize="9"
              fill="#718096"
            >
              {label.label.slice(5)}
            </text>
          ))}

          {/* Zero line */}
          {minHeight < 0 && maxHeight > 0 && (
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight - ((0 - minHeight) / range) * chartHeight}
              x2={paddingLeft + chartWidth}
              y2={paddingTop + chartHeight - ((0 - minHeight) / range) * chartHeight}
              stroke="#e2e8f0"
              strokeDasharray="4,4"
            />
          )}

          {/* Tide curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#4299e1"
            strokeWidth="2"
          />

          {/* Data points with hover and long-press */}
          {points.map((p, i) => {
            const isSelected = isOnSelectedDate(p.datetime);
            // Use orange for selected date points, otherwise green (low) or red (high)
            const fillColor = isSelected
              ? '#ed8936' // orange for selected date
              : (p.isLowTide ? '#48bb78' : '#f56565');
            const pointSize = isSelected ? 7 : 5;

            return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint === i ? 8 : pointSize}
              fill={fillColor}
              stroke={isSelected ? '#dd6b20' : (hoveredPoint === i ? '#fff' : 'none')}
              strokeWidth={isSelected ? 2 : 2}
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={(e) => {
                setHoveredPoint(i);
                const rect = e.target.ownerSVGElement.getBoundingClientRect();
                const scaleX = rect.width / width;
                const scaleY = rect.height / height;
                setTooltipPos({
                  x: p.x * scaleX,
                  y: p.y * scaleY
                });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={(e) => {
                e.preventDefault();
                // Show tooltip immediately on touch (same as hover)
                setHoveredPoint(i);
                const rect = e.target.ownerSVGElement.getBoundingClientRect();
                const scaleX = rect.width / width;
                const scaleY = rect.height / height;
                setTooltipPos({
                  x: p.x * scaleX,
                  y: p.y * scaleY
                });
              }}
              onTouchEnd={() => {
                // Hide tooltip after 2 seconds on touch release
                setTimeout(() => setHoveredPoint(null), 2000);
              }}
            />
          );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            style={{
              position: 'absolute',
              left: tooltipPos.x,
              top: tooltipPos.y - 60,
              transform: 'translateX(-50%)',
              backgroundColor: '#1a202c',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {formatTooltipTime(points[hoveredPoint].datetime)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: points[hoveredPoint].isLowTide ? '#48bb78' : '#f56565'
              }} />
              <span>{points[hoveredPoint].isLowTide ? 'Low' : 'High'} Tide</span>
              <span style={{ fontWeight: '600' }}>{points[hoveredPoint].height.toFixed(1)} ft</span>
            </div>
            {/* Tooltip arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1a202c'
            }} />
          </div>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2.5, fontSize: 12, color: '#718096' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#48bb78' }} />
          <Typography variant="caption">Low Tide</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f56565' }} />
          <Typography variant="caption">High Tide</Typography>
        </Box>
        {selectedDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ed8936', border: '2px solid #dd6b20' }} />
            <Typography variant="caption">Selected Date</Typography>
          </Box>
        )}
      </Box>

      {/* Collapsible Details Toggle */}
      <Button
        variant="outlined"
        fullWidth
        onClick={() => setShowDetails(!showDetails)}
        endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ mt: '12px' }}
      >
        {showDetails ? 'Hide' : 'Show'} Tide Details
      </Button>

      {/* Collapsible Tide List */}
      {showDetails && (
        <Box sx={{ mt: 1.5 }}>
          {predictions.slice(0, maxTideItems).map((p, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: p.isLowTide ? '#48bb78' : '#f56565'
                  }}
                />
                <Typography variant="body2">{p.isLowTide ? 'Low' : 'High'}</Typography>
              </Box>
              <Typography variant="body2">{formatTime(p.datetime)}</Typography>
              <Typography variant="body2">{p.height.toFixed(1)} ft</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
