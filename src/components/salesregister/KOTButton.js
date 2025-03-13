'use client';
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import {
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import KOTService from './KOTService';

/**
* A set of KOT operation buttons for use in the SalesRegister
*/
const KOTButton = ({ order, type, onSuccess, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  
  const validateOrder = () => {
    // Basic validation
    if (!order) {
      toast.error('No order data available');
      return false;
    }
    if (!order.itemsSold || order.itemsSold.length === 0) {
      toast.error('Please add items to the order first');
      return false;
    }
    if (order.orderMode === 'Dine-in' && !order.table) {
      toast.error('Please select a table for dine-in orders');
      return false;
    }
    // Ensure we have a menu selected
    if (!order.menu) {
      toast.error('Please select a menu');
      return false;
    }
    return true;
  };
  
  // Get only the items that haven't been sent to the kitchen yet
  const getUnsentItems = () => {
    return order.itemsSold.filter(item => !item.kotSent);
  };

  // Create a clean copy of the order for KOT generation
  // This ensures we don't pass potentially problematic object references
  const prepareOrderData = (orderData, onlyUnsentItems = true) => {
    // Create a clean copy by JSON serialization
    const cleanOrder = JSON.parse(JSON.stringify(orderData));
    
    // Only include items that haven't been sent to kitchen if specified
    if (onlyUnsentItems) {
      const unsentItems = cleanOrder.itemsSold.filter(item => !item.kotSent);
      
      // Check if we have any unsent items
      if (unsentItems.length === 0) {
        throw new Error('No new items to send to kitchen');
      }
      
      cleanOrder.itemsSold = unsentItems;
    }
    
    // Ensure order has all required fields
    if (!cleanOrder.itemsSold) cleanOrder.itemsSold = [];
    
    // Ensure customer exists
    if (!cleanOrder.customer) {
      cleanOrder.customer = {
        name: 'Guest',
        phone: '',
        email: '',
        address: ''
      };
    }
    
    return cleanOrder;
  };

  const handleGenerateKOT = async () => {
    if (!validateOrder()) return;
    
    // Check if there are unsent items
    const unsentItems = getUnsentItems();
    if (unsentItems.length === 0) {
      toast.error('No new items to send to kitchen');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare a clean copy of the order data with only unsent items
      const cleanOrderData = prepareOrderData(order);
      
      // Check if there's an existing order ID already
      const isNewOrder = !cleanOrderData._id;
      
      // Additional logging for debugging
      console.log("Generating KOT with order:", {
        id: cleanOrderData._id || 'New Order',
        tableId: cleanOrderData.table,
        items: cleanOrderData.itemsSold?.length || 0,
        menu: cleanOrderData.menu
      });
      
      // Generate the KOT (this will also create the order if needed)
      const result = await KOTService.generateKOT(cleanOrderData, isNewOrder);
      
      if (result.success) {
        toast.success('KOT generated successfully');
        
        // Mark the sent items as processed in the original order
        // This is done in the parent component through the onSuccess callback
        if (onSuccess) onSuccess(result.data);
      } else {
        toast.error(result.message || 'Failed to generate KOT');
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
      
      // Enhanced error messaging
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Error generating KOT: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintKOT = async () => {
    if (!validateOrder()) return;
    
    // Check if there are unsent items
    const unsentItems = getUnsentItems();
    if (unsentItems.length === 0) {
      toast.error('No new items to send to kitchen');
      return;
    }
    
    setLoading(true);
    try {
      // Prepare a clean copy of the order data with only unsent items
      const cleanOrderData = prepareOrderData(order);
      
      // Check if there's an existing order ID already
      const isNewOrder = !cleanOrderData._id;
      
      const genResult = await KOTService.generateKOT(cleanOrderData, isNewOrder);
      
      if (genResult.success) {
        // Now print the KOT
        await KOTService.printKOT(genResult.data);
        toast.success('KOT printed successfully');
        
        if (onSuccess) onSuccess(genResult.data);
      } else {
        toast.error(genResult.message || 'Failed to generate KOT for printing');
      }
    } catch (error) {
      console.error('Error with KOT operation:', error);
      
      // Enhanced error messaging
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(`Error with KOT operation: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Render different button based on type prop
  const renderButton = () => {
    switch (type) {
      case 'save':
        return (
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleGenerateKOT}
            disabled={loading || disabled || getUnsentItems().length === 0}
          >
            SAVE KOT {getUnsentItems().length > 0 ? `(${getUnsentItems().length})` : ''}
          </Button>
        );
      case 'print':
        return (
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <PrintIcon />}
            onClick={handlePrintKOT}
            disabled={loading || disabled || getUnsentItems().length === 0}
          >
            PRINT KOT {getUnsentItems().length > 0 ? `(${getUnsentItems().length})` : ''}
          </Button>
        );
      case 'view':
        return (
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => onSuccess && onSuccess()}
            disabled={disabled}
          >
            VIEW KOT
          </Button>
        );
      default:
        return (
          <Button
            variant="contained"
            color="secondary"
            startIcon={loading ? <CircularProgress size={20} /> : <ReceiptIcon />}
            onClick={handleGenerateKOT}
            disabled={loading || disabled || getUnsentItems().length === 0}
          >
            Generate KOT {getUnsentItems().length > 0 ? `(${getUnsentItems().length})` : ''}
          </Button>
        );
    }
  };
  
  return renderButton();
};

export default KOTButton;