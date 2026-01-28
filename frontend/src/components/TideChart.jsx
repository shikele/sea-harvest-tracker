import React, { useEffect, useState } from 'react';
import { getTides } from '../services/api';

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1a202c'
  },
  chart: {
    position: 'relative',
    height: '150px',
    marginBottom: '16px'
  },
  svg: {
    width: '100%',
    height: '100%'
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    fontSize: '12px',
    color: '#718096'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  tideList: {
    marginTop: '16px'
  },
  tideItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  tideType: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  tideIcon: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096'
  }
};

function formatTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function TideChart({ stationId, stationName }) {
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTides() {
      if (!stationId) {
        setLoading(false);
        setError('No station ID');
        return;
      }

      setLoading(true);
      try {
        const data = await getTides(stationId, 3);
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
      <div style={styles.container}>
        <div style={styles.loading}>Loading tide data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Error: {error}</div>
      </div>
    );
  }

  if (!tideData?.predictions?.length) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>No tide data available</div>
      </div>
    );
  }

  const predictions = tideData.predictions;
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

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        Tide Predictions - {stationName || tideData.stationName}
      </div>

      <div style={styles.chart}>
        <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
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

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="5"
              fill={p.isLowTide ? '#48bb78' : '#f56565'}
            />
          ))}
        </svg>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#48bb78' }} />
          <span>Low Tide</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, backgroundColor: '#f56565' }} />
          <span>High Tide</span>
        </div>
      </div>

      <div style={styles.tideList}>
        {predictions.slice(0, 8).map((p, i) => (
          <div key={i} style={styles.tideItem}>
            <div style={styles.tideType}>
              <div
                style={{
                  ...styles.tideIcon,
                  backgroundColor: p.isLowTide ? '#48bb78' : '#f56565'
                }}
              />
              <span>{p.isLowTide ? 'Low' : 'High'}</span>
            </div>
            <span>{formatTime(p.datetime)}</span>
            <span>{p.height.toFixed(1)} ft</span>
          </div>
        ))}
      </div>
    </div>
  );
}
