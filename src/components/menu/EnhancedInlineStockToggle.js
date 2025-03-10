// src/components/menu/EnhancedInlineStockToggle.js
'use client';
import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Popover
} from '@mui/material';
import {
  CheckCircle as InStockIcon,
  RemoveShoppingCart as OutOfStockIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import EnhancedOutOfStockModal from './EnhancedOutOfStockModal';
import EnhancedRestockModal from './EnhancedRestockModal';

// Order modes
const ORDER_MODES = [
  { value: 'dineIn', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'qrOrdering', label: 'QR Ordering' },
  { value: 'directTakeaway', label: 'Direct Takeaway' },
  { value: 'directDelivery', label: 'Direct Delivery' },
  { value: 'zomato', label: 'Zomato' }
];

const EnhancedInlineStockToggle = ({ item, itemType = 'dish', onSuccess }) => {
  const [openOutOfStockModal, setOpenOutOfStockModal] = useState(false);
  const [openRestockModal, setOpenRestockModal] = useState(false);
  
  // For the status popover
  const [anchorEl, setAnchorEl] = useState(null);
  const openPopover = Boolean(anchorEl);
  
  // Get the overall stock status
  const isGloballyOutOfStock = item?.stockStatus?.isOutOfStock || false;
  
  // Count how many order modes are out of stock
  const getOutOfStockModeCount = () => {
    if (!item?.stockStatus?.orderModes) return 0;
    
    return ORDER_MODES.filter(mode => 
      item.stockStatus.orderModes[mode.value]?.isOutOfStock
    ).length;
  };
  
  const outOfStockModeCount = getOutOfStockModeCount();
  
  // Determine if item has mixed status (some modes out of stock, others in stock)
  const hasMixedStatus = outOfStockModeCount > 0 && outOfStockModeCount < ORDER_MODES.length;
  
  const handleOpenOutOfStockModal = () => {
    setOpenOutOfStockModal(true);
  };
  
  const handleOpenRestockModal = () => {
    setOpenRestockModal(true);
  };
  
  const handleCloseModals = () => {
    setOpenOutOfStockModal(false);
    setOpenRestockModal(false);
  };
  
  const handleToggleClick = () => {
    if (isGloballyOutOfStock || outOfStockModeCount > 0) {
      handleOpenRestockModal();
    } else {
      handleOpenOutOfStockModal();
    }
  };
  
  const handleSuccessCallback = (updatedItem) => {
    if (onSuccess) {
      onSuccess(updatedItem);
    }
    handleCloseModals();
  };
  
  const handleInfoClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  
  // Render the status chip based on the overall status
  const renderStatusChip = () => {
    if (isGloballyOutOfStock) {
      return <Chip 
        label="Out of Stock" 
        color="error" 
        size="small" 
        icon={<OutOfStockIcon />} 
      />;
    }
    
    if (hasMixedStatus) {
      return <Chip 
        label={`Partial (${outOfStockModeCount}/${ORDER_MODES.length})`} 
        color="warning" 
        size="small" 
        variant="outlined"
        onClick={handleInfoClick}
      />;
    }
    
    if (outOfStockModeCount > 0) {
      return <Chip 
        label="Out of Stock" 
        color="error" 
        size="small" 
        icon={<OutOfStockIcon />} 
        onClick={handleInfoClick}
      />;
    }
    
    return <Chip 
      label="In Stock" 
      color="success" 
      size="small" 
      icon={<InStockIcon />} 
    />;
  };
  
  return (
    <>
      <Box display="flex" alignItems="center">
        {renderStatusChip()}
        
        {(hasMixedStatus || outOfStockModeCount > 0) && (
          <Tooltip title="View detailed status">
            <IconButton size="small" onClick={handleInfoClick}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        
        <Button 
          size="small" 
          color={isGloballyOutOfStock || outOfStockModeCount > 0 ? "success" : "error"}
          variant="text"
          onClick={handleToggleClick}
          sx={{ ml: 1 }}
        >
          {isGloballyOutOfStock || outOfStockModeCount > 0 ? "Restock" : "Mark Out"}
        </Button>
      </Box>
      
      {/* Status Popover */}
      <Popover
        open={openPopover}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            Order Mode Stock Status
          </Typography>
          
          <Box>
            {ORDER_MODES.map(mode => {
              const modeOutOfStock = item?.stockStatus?.orderModes?.[mode.value]?.isOutOfStock;
              
              return (
                <Box key={mode.value} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                  <Typography variant="body2">{mode.label}:</Typography>
                  <Chip 
                    label={modeOutOfStock ? "Out of Stock" : "In Stock"} 
                    color={modeOutOfStock ? "error" : "success"} 
                    size="small"
                    sx={{ minWidth: 90 }}
                  />
                </Box>
              );
            })}
          </Box>
          
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button 
              size="small" 
              color={isGloballyOutOfStock || outOfStockModeCount > 0 ? "success" : "error"}
              variant="outlined"
              onClick={handleToggleClick}
            >
              {isGloballyOutOfStock || outOfStockModeCount > 0 ? "Restock" : "Mark Out"}
            </Button>
          </Box>
        </Box>
      </Popover>
      
      {/* Enhanced Out of Stock Modal */}
      <EnhancedOutOfStockModal
        open={openOutOfStockModal}
        onClose={handleCloseModals}
        item={item}
        itemType={itemType}
        onSuccess={handleSuccessCallback}
      />
      
      {/* Enhanced Restock Modal */}
      <EnhancedRestockModal
        open={openRestockModal}
        onClose={handleCloseModals}
        item={item}
        itemType={itemType}
        onSuccess={handleSuccessCallback}
      />
    </>
  );
};

export default EnhancedInlineStockToggle;