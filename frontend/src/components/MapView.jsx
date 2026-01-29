import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px'
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
  legend: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  mapWrapper: {
    height: '400px',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  popup: {
    minWidth: '200px'
  },
  popupName: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  popupLocation: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '8px'
  },
  popupStatus: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  popupTide: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#4a5568'
  }
};

const statusColors = {
  green: { bg: '#48bb78', text: '#fff' },
  yellow: { bg: '#ecc94b', text: '#744210' },
  red: { bg: '#f56565', text: '#fff' },
  gray: { bg: '#a0aec0', text: '#fff' }
};

// Create custom colored markers
function createColoredIcon(color) {
  const markerHtml = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#fff" stroke-width="1"/>
      <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
    </svg>
  `;

  return L.divIcon({
    html: markerHtml,
    className: 'custom-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35]
  });
}

const markerIcons = {
  green: createColoredIcon('#48bb78'),
  yellow: createColoredIcon('#ecc94b'),
  red: createColoredIcon('#f56565'),
  gray: createColoredIcon('#a0aec0')
};

// Create user location marker (blue with pulsing effect)
function createUserLocationIcon() {
  const markerHtml = `
    <div style="position: relative;">
      <div style="
        position: absolute;
        width: 40px;
        height: 40px;
        background: rgba(66, 153, 225, 0.3);
        border-radius: 50%;
        top: -12px;
        left: -12px;
        animation: pulse 2s infinite;
      "></div>
      <div style="
        width: 16px;
        height: 16px;
        background: #4299e1;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  `;

  return L.divIcon({
    html: markerHtml,
    className: 'user-location-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10]
  });
}

const userLocationIcon = createUserLocationIcon();

// Component to fit bounds only on initial load
function FitBounds({ beaches, initialFitDone, setInitialFitDone }) {
  const map = useMap();

  useEffect(() => {
    if (beaches.length > 0 && !initialFitDone) {
      const bounds = L.latLngBounds(
        beaches.map(b => [b.lat, b.lon])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
      setInitialFitDone(true);
    }
  }, [beaches, map, initialFitDone, setInitialFitDone]);

  return null;
}

function formatTideTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function MapView({ beaches, onBeachClick, userLocation }) {
  const [initialFitDone, setInitialFitDone] = useState(false);

  // Center on Puget Sound region (or user location if available)
  const center = userLocation ? [userLocation.lat, userLocation.lon] : [47.6, -122.7];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Beach Map</h2>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: '#48bb78' }} />
            <span>Open + Good Tide</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: '#ecc94b' }} />
            <span>Open</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, backgroundColor: '#f56565' }} />
            <span>Closed</span>
          </div>
          {userLocation && (
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: '#4299e1', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              <span>You</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.mapWrapper}>
        <MapContainer
          center={center}
          zoom={9}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds beaches={beaches} initialFitDone={initialFitDone} setInitialFitDone={setInitialFitDone} />

          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lon]}
              icon={userLocationIcon}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={styles.popup}>
                  <div style={styles.popupName}>Your Location</div>
                  <div style={styles.popupLocation}>
                    {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {beaches.map((beach) => (
            <Marker
              key={beach.id}
              position={[beach.lat, beach.lon]}
              icon={markerIcons[beach.statusColor] || markerIcons.gray}
              eventHandlers={{
                click: () => onBeachClick?.(beach)
              }}
            >
              <Popup>
                <div style={styles.popup}>
                  <div style={styles.popupName}>{beach.name}</div>
                  <div style={styles.popupLocation}>
                    {beach.region} - {beach.county} County
                  </div>
                  <span
                    style={{
                      ...styles.popupStatus,
                      backgroundColor: statusColors[beach.statusColor]?.bg || '#a0aec0',
                      color: statusColors[beach.statusColor]?.text || '#fff'
                    }}
                  >
                    {beach.biotoxinStatus}
                  </span>
                  {beach.nextLowTides?.[0] && (
                    <div style={styles.popupTide}>
                      Next low tide: {formatTideTime(beach.nextLowTides[0].datetime)}
                      <br />
                      Height: {beach.nextLowTides[0].height.toFixed(1)} ft ({beach.nextLowTides[0].quality})
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
