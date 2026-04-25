import React from 'react';
import Box from '@mui/material/Box';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8' }}>
      <Dashboard />
    </Box>
  );
}
