// src/app/print/layout.js
'use client';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

// Create a theme instance for print pages
const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    mode: 'light',
  },
});

export default function PrintLayout({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Toaster position="top-center" />
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}