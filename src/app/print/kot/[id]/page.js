// src/app/print/kot/[id]/page.js
'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Divider,
  Button,
  CircularProgress,
  Container
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';

export default function ThermalKOTPrintPage() {
  const params = useParams();
  const { id } = params;
  const [kot, setKot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch KOT data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch KOT data
        const kotResponse = await axiosWithAuth.get(`/api/orders/kot/${id}`);
        
        if (!kotResponse.data.success) {
          setError('Failed to load KOT data');
          setLoading(false);
          return;
        }
        
        const kotData = kotResponse.data.data;
        
        // Fetch outlet data (assuming the first outlet for simplicity)
        // In a multi-outlet setup, you can use a specific outlet ID from the order
        const outletResponse = await axiosWithAuth.get('/api/outlets');
        
        if (outletResponse.data.success && outletResponse.data.data.length > 0) {
          // Get the first outlet
          const outletData = outletResponse.data.data[0];
          
          // Add restaurant details from outlet to KOT data
          const updatedKot = {
            ...kotData,
            restaurantDetails: {
              name: outletData.name,
              address: outletData.address,
              phone: outletData.phone
            }
          };
          
          setKot(updatedKot);
        } else {
          // Fall back to KOT data if outlet info isn't available
          setKot(kotData);
        }
        
        // Auto-print if this is the first time
        if (!kotData.printed) {
          // Short delay to ensure content is loaded
          setTimeout(() => {
            window.print();
            // Mark as printed after printing
            axiosWithAuth.put(`/api/orders/kot/${id}`, {
              printed: true,
              printerId: 'main-kitchen'
            }).catch(err => console.error('Error marking KOT as printed:', err));
          }, 1000);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(`Error: ${error.message || 'Could not load data'}`);
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchData();
    }
  }, [id]);
  // Handle print function
  const handlePrint = () => {
    window.print();
  };

  // Go back function
  const handleBack = () => {
    window.history.back();
  };

  // Format time for kitchen display
  const formatTimeOnly = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading KOT...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" my={5}>
        <Typography variant="h4" color="error" gutterBottom>Error</Typography>
        <Typography variant="body1">{error}</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 3 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!kot) {
    return (
      <Box textAlign="center" my={5}>
        <Typography variant="h4" gutterBottom>KOT Not Found</Typography>
        <Typography variant="body1">The requested KOT could not be found.</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 3 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* Print Controls - Hidden during print */}
      <Box className="no-print" sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
        >
          Back
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>

      {/* KOT Content - Thermal Receipt Style */}
      <Container maxWidth="xs" className="thermal-receipt">
        {/* Header */}
        <Box textAlign="center" mb={1}>
  <Typography variant="body2" fontWeight="bold">
    {kot.restaurantDetails?.name || 'Restaurant Name'}
  </Typography>
  <Typography variant="h5" fontWeight="bold">
    <RestaurantIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
    KITCHEN ORDER
  </Typography>
  <Typography variant="h6" fontWeight="bold">KOT #{kot.kotTokenNum}</Typography>
  <Typography variant="body2">
    {formatDate(kot.createdAt)}
  </Typography>
</Box>

        <Divider style={{ borderStyle: 'dashed' }} />

        {/* Order Information */}
        <Box my={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" fontWeight="bold">Order Mode:</Typography>
            <Typography variant="body2">{kot.orderMode}</Typography>
          </Box>
          {kot.orderMode === 'Dine-in' && kot.table && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" fontWeight="bold">Table:</Typography>
              <Typography variant="body2" fontWeight="bold" fontSize="16px">
                {typeof kot.table === 'object' ? kot.table.tableName : kot.table}
              </Typography>
            </Box>
          )}
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" fontWeight="bold">Customer:</Typography>
            <Typography variant="body2">{kot.customer?.name || 'Guest'}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" fontWeight="bold">Status:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {kot.kotStatus.toUpperCase()}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" fontWeight="bold">Invoice:</Typography>
            <Typography variant="body2">{kot.invoiceNum}</Typography>
          </Box>
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />

        {/* Items Section */}
        <Box my={1}>
          <Typography variant="body1" fontWeight="bold" textAlign="center">
            ITEMS
          </Typography>
          
          {kot.items && kot.items.map((item, index) => (
            <React.Fragment key={index}>
              <Box mt={1} mb={0.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body1" fontWeight="bold">
                    {item.dishName}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    x{item.quantity}
                  </Typography>
                </Box>
                
                {item.variantName && (
                  <Typography variant="body2">
                    Variant: {item.variantName}
                  </Typography>
                )}
                
                {item.addOns && item.addOns.length > 0 && (
                  <Typography variant="body2">
                    Add-ons: {item.addOns.map(addon => addon.addOnName).join(', ')}
                  </Typography>
                )}
                
                {item.notes && (
                  <Typography variant="body2" fontStyle="italic" sx={{ mt: 0.5, border: '1px dashed #aaa', p: 0.5 }}>
                    ** {item.notes} **
                  </Typography>
                )}
              </Box>
              
              {index < kot.items.length - 1 && (
                <Divider sx={{ my: 1, borderStyle: 'dotted' }} />
              )}
            </React.Fragment>
          ))}
        </Box>

        <Divider style={{ borderStyle: 'dashed' }} />

        {/* Footer */}
        <Box textAlign="center" my={1}>
          <Typography variant="body2">
            KOT Time: {formatTimeOnly(kot.createdAt)}
          </Typography>
          <Typography variant="body2">
            Print Time: {formatTimeOnly(new Date())}
          </Typography>
          <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>
            KOT #{kot.kotTokenNum}
          </Typography>
        </Box>
      </Container>

      {/* Add print-specific styles optimized for thermal printers */}
      <style jsx global>{`
        @media screen {
          .thermal-receipt {
            border: 1px dashed #ccc;
            padding: 8px;
            background-color: white;
          }
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            font-size: 12px;
            width: 80mm; /* Standard thermal receipt width */
          }
          
          .thermal-receipt {
            width: 72mm; /* Allow for margins */
            padding: 0;
            margin: 0;
          }
          
          @page {
            size: 80mm auto; /* Width of thermal paper */
            margin: 3mm;
          }
        }
      `}</style>
    </>
  );
}