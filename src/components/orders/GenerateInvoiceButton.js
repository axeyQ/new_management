import { useState, useEffect } from 'react';
import { Button, CircularProgress } from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const GenerateInvoiceButton = ({ orderId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState(null);
  const [checkedForExisting, setCheckedForExisting] = useState(false);

  // Check for existing invoice immediately on component mount
  useEffect(() => {
    if (orderId) {
      checkForExistingInvoice();
    }
  }, [orderId]);

  // Always check for existing invoice before doing anything else
  const checkForExistingInvoice = async () => {
    if (!orderId || checkedForExisting) return;
    
    try {
      console.log(`[Invoice] Checking for existing invoice for order: ${orderId}`);
      const response = await axiosWithAuth.get(`/api/orders/invoice?orderId=${orderId}`);
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const invoice = response.data.data[0];
        console.log('[Invoice] Found existing invoice:', invoice._id);
        setExistingInvoice(invoice);
        
        // If we already have an invoice, call onSuccess immediately
        if (onSuccess) {
          onSuccess(invoice);
        }
      } else {
        console.log('[Invoice] No existing invoice found for order:', orderId);
      }
    } catch (error) {
      console.error('[Invoice] Error checking for existing invoice:', error);
    } finally {
      setCheckedForExisting(true);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!orderId) {
      toast.error('No order ID provided');
      return;
    }
    
    setLoading(true);
    
    try {
      // Always double-check for existing invoice first, even if we already checked
      console.log(`[Invoice] Double-checking for existing invoice for order: ${orderId}`);
      const checkResponse = await axiosWithAuth.get(`/api/orders/invoice?orderId=${orderId}`);
      
      if (checkResponse.data.success && checkResponse.data.data && checkResponse.data.data.length > 0) {
        // Use existing invoice
        const invoice = checkResponse.data.data[0];
        console.log('[Invoice] Using existing invoice:', invoice._id);
        toast.success('Using existing invoice');
        
        if (onSuccess) {
          onSuccess(invoice);
        }
        
        setLoading(false);
        return;
      }
      
      // Only attempt to create a new invoice if we're absolutely sure one doesn't exist
      console.log('[Invoice] Creating new invoice');
      const createResponse = await axiosWithAuth.post('/api/orders/invoice', {
        salesOrder: orderId
      });
      
      if (createResponse.data.success) {
        toast.success('Invoice generated successfully');
        if (onSuccess) {
          onSuccess(createResponse.data.data);
        }
      } else {
        // If creation fails for some reason, try one more time to fetch existing
        toast.error(createResponse.data.message || 'Failed to generate invoice');
        await tryRecovery();
      }
    } catch (error) {
      console.error('[Invoice] Error in invoice operation:', error);
      
      if (error.response?.status === 400 && 
          error.response?.data?.message?.includes('already exists')) {
        toast.info('Invoice already exists, retrieving existing invoice');
        await tryRecovery();
      } else {
        toast.error(error.response?.data?.message || 'Error with invoice operation');
        // Try recovery anyway as a last resort
        await tryRecovery();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Last-resort recovery function
  const tryRecovery = async () => {
    try {
      console.log('[Invoice] Attempting recovery by fetching existing invoice');
      // Wait a moment for any potential race conditions to resolve
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await axiosWithAuth.get(`/api/orders/invoice?orderId=${orderId}`);
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const invoice = response.data.data[0];
        console.log('[Invoice] Recovery successful, found invoice:', invoice._id);
        
        if (onSuccess) {
          onSuccess(invoice);
          toast.success('Existing invoice retrieved');
        }
        return true;
      }
      
      console.log('[Invoice] Recovery failed, no invoice found');
      return false;
    } catch (error) {
      console.error('[Invoice] Recovery attempt failed:', error);
      return false;
    }
  };

  // If we already know there's an invoice, just show it
  if (existingInvoice) {
    return (
      <Button
        variant="contained"
        color="primary"
        startIcon={<ReceiptIcon />}
        onClick={() => {
          if (onSuccess) onSuccess(existingInvoice);
          toast.success('Showing existing invoice');
        }}
        fullWidth
      >
        View Existing Invoice
      </Button>
    );
  }

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
      onClick={handleGenerateInvoice}
      disabled={loading}
      fullWidth
    >
      {loading ? 'Processing...' : (checkedForExisting ? 'Generate Invoice' : 'Checking...')}
    </Button>
  );
};

export default GenerateInvoiceButton;