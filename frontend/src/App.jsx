import React from 'react';
import Dashboard from './components/Dashboard';

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8'
  }
};

export default function App() {
  return (
    <div style={styles.app}>
      <Dashboard />
    </div>
  );
}
