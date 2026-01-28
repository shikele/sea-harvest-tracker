import React, { useEffect, useState } from 'react';
import { getHarvestWindows, refreshData } from '../services/api';
import BeachCard from './BeachCard';
import TideChart from './TideChart';
import HarvestCalendar from './HarvestCalendar';
import MapView from './MapView';

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c'
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '4px'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  statLabel: {
    fontSize: '13px',
    color: '#718096',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700'
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '24px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  beachList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1a202c'
  },
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  filterButton: {
    padding: '6px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    backgroundColor: 'white',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#4299e1',
    color: 'white',
    borderColor: '#4299e1'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#718096'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#c53030',
    backgroundColor: '#fff5f5',
    borderRadius: '12px'
  },
  selectedBeachPanel: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  closeButton: {
    float: 'right',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#718096'
  }
};

export default function Dashboard() {
  const [beaches, setBeaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedBeach, setSelectedBeach] = useState(null);

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

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshData();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredBeaches = beaches.filter((beach) => {
    if (filter === 'all') return true;
    if (filter === 'open') return beach.biotoxinStatus === 'open';
    if (filter === 'closed') return beach.biotoxinStatus === 'closed';
    if (filter === 'harvestable') return beach.harvestable;
    return true;
  });

  const stats = {
    total: beaches.length,
    open: beaches.filter(b => b.biotoxinStatus === 'open').length,
    closed: beaches.filter(b => b.biotoxinStatus === 'closed').length,
    harvestable: beaches.filter(b => b.harvestable).length
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading beach data...</div>
      </div>
    );
  }

  if (error && beaches.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h3>Error loading data</h3>
          <p>{error}</p>
          <button
            style={{ ...styles.refreshButton, marginTop: '16px' }}
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sea Harvest Tracker</h1>
          <p style={styles.subtitle}>
            Shellfish harvesting conditions near Redmond, WA
          </p>
        </div>
        <button
          style={{
            ...styles.refreshButton,
            opacity: refreshing ? 0.7 : 1
          }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Beaches</div>
          <div style={{ ...styles.statValue, color: '#4299e1' }}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Open</div>
          <div style={{ ...styles.statValue, color: '#48bb78' }}>{stats.open}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Closed</div>
          <div style={{ ...styles.statValue, color: '#f56565' }}>{stats.closed}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ready to Harvest</div>
          <div style={{ ...styles.statValue, color: '#805ad5' }}>{stats.harvestable}</div>
        </div>
      </div>

      <MapView beaches={beaches} onBeachClick={setSelectedBeach} />

      <div style={styles.mainContent}>
        <div style={styles.leftColumn}>
          <HarvestCalendar onBeachClick={(beach) => setSelectedBeach(beach)} />

          <div style={styles.beachList}>
            <h2 style={styles.sectionTitle}>Beaches by Opportunity</h2>

            <div style={styles.filterRow}>
              {['all', 'harvestable', 'open', 'closed'].map((f) => (
                <button
                  key={f}
                  style={{
                    ...styles.filterButton,
                    ...(filter === f ? styles.filterButtonActive : {})
                  }}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {filteredBeaches.map((beach) => (
              <BeachCard
                key={beach.id}
                beach={beach}
                onClick={setSelectedBeach}
              />
            ))}
          </div>
        </div>

        <div style={styles.rightColumn}>
          {selectedBeach && (
            <div style={styles.selectedBeachPanel}>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedBeach(null)}
              >
                x
              </button>
              <h3 style={styles.sectionTitle}>{selectedBeach.name}</h3>
              <p style={{ color: '#718096', marginBottom: '16px' }}>
                {selectedBeach.region} - {selectedBeach.county} County
              </p>

              <div style={{ marginBottom: '16px' }}>
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    color:
                      selectedBeach.biotoxinStatus === 'open'
                        ? '#48bb78'
                        : selectedBeach.biotoxinStatus === 'closed'
                        ? '#f56565'
                        : '#ecc94b'
                  }}
                >
                  {selectedBeach.biotoxinStatus.toUpperCase()}
                </span>
              </div>

              {selectedBeach.closureReason && (
                <div style={{ marginBottom: '16px', color: '#c53030' }}>
                  <strong>Closure Reason:</strong> {selectedBeach.closureReason}
                </div>
              )}

              <TideChart
                stationId={selectedBeach.tide_station_id || beaches.find(b => b.id === selectedBeach.id)?.tide_station_id}
                stationName={selectedBeach.region}
              />
            </div>
          )}

          {!selectedBeach && beaches[0] && (
            <TideChart
              stationId={beaches[0].tide_station_id}
              stationName="Hood Canal (Default)"
            />
          )}
        </div>
      </div>
    </div>
  );
}
