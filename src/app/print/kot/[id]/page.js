'use client';

// src/app/print/kot/[id]/page.js
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button,
  Divider
} from '@mui/material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import { Print as PrintIcon } from '@mui/icons-material';

/**
 * KOT Print View component - for printing kitchen order tickets
 */
export default function KOTPrint() {
  const params = useParams();
  const id = params.id;
  const [kot, setKot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    // Only fetch data when id is available
    if (id) {
      fetchKOT();
    }
  }, [id]);

  const fetchKOT = async () => {
    try {
      setLoading(true);
      const res = await axiosWithAuth.get(`/api/orders/kot/${id}`);
      if (res.data.success) {
        setKot(res.data.data);
      } else {
        setError('Failed to load KOT data');
      }
    } catch (err) {
      console.error('Error fetching KOT:', err);
      setError(`Error: ${err.message || 'Could not load KOT'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh" flexDirection="column">
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.close()}>
          Close Window
        </Button>
      </Box>
    );
  }

  if (!kot) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>KOT not found</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Print Controls - hidden when printing */}
      <Box className="no-print" sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h5">Kitchen Order Ticket Preview</Typography>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print KOT
        </Button>
      </Box>

      {/* Printable KOT */}
      <Box 
        ref={printRef} 
        className="print-section" 
        sx={{ 
          width: { xs: '100%', sm: '80mm' },
          margin: '0 auto',
          padding: '10mm',
          border: '1px dashed #ccc' 
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>KITCHEN ORDER</Typography>
          <Typography variant="body2">KOT: {kot.kotFinalId}</Typography>
          <Typography variant="body2">
            {kot.kotStatus.toUpperCase()} - TOKEN #{kot.kotTokenNum}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Order Mode:</strong> {kot.orderMode}
          </Typography>
          {kot.table && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Table:</strong> {kot.table.tableName || kot.table}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Time:</strong> {formatDate(kot.createdAt)}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Reference:</strong> {kot.refNum}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>ITEMS:</Typography>
          
          {kot.items.map((item, idx) => (
            <Box key={idx} sx={{ mb: 1.5, pb: 1, borderBottom: '1px dotted #ccc' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {item.dishName}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  x{item.quantity}
                </Typography>
              </Box>
              
              {item.variantName && (
                <Typography variant="body2" sx={{ ml: 2 }}>
                  Variant: {item.variantName}
                </Typography>
              )}
              
              {item.addOns && item.addOns.length > 0 && (
                <Box sx={{ ml: 2 }}>
                  <Typography variant="body2">
                    Add-ons: {item.addOns.map(addon => addon.addOnName).join(', ')}
                  </Typography>
                </Box>
              )}
              
              {item.notes && (
                <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic' }}>
                  Note: {item.notes}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption">
            Printed: {formatDate(new Date())}
          </Typography>
        </Box>
      </Box>

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            width: 100% !important;
            border: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </Box>
  );
}