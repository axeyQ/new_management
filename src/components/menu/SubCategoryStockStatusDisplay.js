import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Popover,
  Divider,
} from '@mui/material';
import {
  CheckCircle as InStockIcon,
  RemoveShoppingCart as OutOfStockIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format, isValid, isBefore } from 'date-fns';

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

/**
 * Enhanced component that displays the stock status of a subcategory and its restock times
 */
const SubCategoryStockStatusDisplay = ({ 
  subCategory, 
  onMarkOutOfStock, 
  onRestock 
}) => {
  // For the status popover
  const [anchorEl, setAnchorEl] = useState(null);
  const openPopover = Boolean(anchorEl);

  // Get the overall stock status
  const isGloballyOutOfStock = subCategory?.stockStatus?.isOutOfStock || false;

  // Get out-of-stock order modes for a subcategory
  const getOutOfStockModes = () => {
    if (!subCategory?.stockStatus?.orderModes) return [];
    return ORDER_MODES.filter(mode =>
      subCategory.stockStatus.orderModes[mode.value]?.isOutOfStock
    );
  };
  
  const outOfStockModes = getOutOfStockModes();
  const outOfStockModeCount = outOfStockModes.length;
  
  // Check if subcategory is out of stock for all modes
  const isAllModesOutOfStock = outOfStockModeCount === ORDER_MODES.length;
  
  // Check if subcategory is out of stock for any mode
  const isAnyModeOutOfStock = outOfStockModeCount > 0;
  
  // Determine if subcategory has mixed status
  const hasMixedStatus = isAnyModeOutOfStock && !isAllModesOutOfStock;

  const handleInfoClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  // Format restock time in a human-readable way
  const formatRestockTime = (timeString) => {
    if (!timeString) return 'Indefinite';
    
    try {
      const restockTime = new Date(timeString);
      if (!isValid(restockTime)) return 'Invalid time';
      
      // If the restock time is in the past, show "Overdue"
      if (isBefore(restockTime, new Date())) {
        return 'Overdue';
      }
      
      return format(restockTime, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting restock time:', error);
      return 'Invalid time';
    }
  };

  // Get the global restock time
  const getGlobalRestockTime = () => {
    if (!subCategory?.stockStatus?.restockTime) return null;
    return formatRestockTime(subCategory.stockStatus.restockTime);
  };

  // Get restock time for a specific mode
  const getModeRestockTime = (modeKey) => {
    if (!subCategory?.stockStatus?.orderModes?.[modeKey]?.restockTime) {
      return null;
    }
    return formatRestockTime(subCategory.stockStatus.orderModes[modeKey].restockTime);
  };

  // Get the earliest restock time across all modes
  const getEarliestRestockTime = () => {
    if (!subCategory?.stockStatus) return null;
    
    let earliestTime = null;
    let earliestTimeString = null;
    
    // Check global restock time
    if (subCategory.stockStatus.restockTime) {
      earliestTime = new Date(subCategory.stockStatus.restockTime);
      earliestTimeString = subCategory.stockStatus.restockTime;
    }
    
    // Check each order mode
    if (subCategory.stockStatus.orderModes) {
      Object.keys(subCategory.stockStatus.orderModes).forEach(mode => {
        const modeTime = subCategory.stockStatus.orderModes[mode].restockTime;
        if (modeTime) {
          const modeDate = new Date(modeTime);
          if (isValid(modeDate) && (!earliestTime || modeDate < earliestTime)) {
            earliestTime = modeDate;
            earliestTimeString = modeTime;
          }
        }
      });
    }
    
    return earliestTimeString ? formatRestockTime(earliestTimeString) : null;
  };

  // Render the status chip based on the overall status
  const renderStatusChip = () => {
    const restockTime = getEarliestRestockTime();
    
    if (isGloballyOutOfStock) {
      return (
        <Tooltip title={restockTime ? `Restock: ${restockTime}` : 'Out of Stock'}>
          <Chip
            label="Out of Stock"
            color="error"
            size="small"
            icon={<OutOfStockIcon />}
            onClick={handleInfoClick}
          />
        </Tooltip>
      );
    }
    
    if (hasMixedStatus) {
      return (
        <Tooltip title={restockTime ? `Next restock: ${restockTime}` : 'Some modes are out of stock'}>
          <Chip
            label={`Partial (${outOfStockModeCount}/${ORDER_MODES.length})`}
            color="warning"
            size="small"
            variant="outlined"
            onClick={handleInfoClick}
          />
        </Tooltip>
      );
    }
    
    if (isAnyModeOutOfStock) {
      return (
        <Tooltip title={restockTime ? `Restock: ${restockTime}` : 'All modes are out of stock'}>
          <Chip
            label="Out of Stock"
            color="error"
            size="small"
            icon={<OutOfStockIcon />}
            onClick={handleInfoClick}
          />
        </Tooltip>
      );
    }
    
    return (
      <Chip
        label="In Stock"
        color="success"
        size="small"
        icon={<InStockIcon />}
      />
    );
  };

  // Helper function to determine if any mode has a restock time
  const anyModeHasRestockTime = () => {
    if (subCategory?.stockStatus?.restockTime) return true;
    
    if (subCategory?.stockStatus?.orderModes) {
      return Object.keys(subCategory.stockStatus.orderModes).some(mode => 
        subCategory.stockStatus.orderModes[mode].restockTime
      );
    }
    
    return false;
  };

  return (
    <>
      <Box display="flex" alignItems="center">
        {renderStatusChip()}
        
        {(hasMixedStatus || isAnyModeOutOfStock) && (
          <Tooltip title="View detailed status">
            <IconButton size="small" onClick={handleInfoClick}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        
        {anyModeHasRestockTime() && (
          <Tooltip title="Has scheduled restock times">
            <TimeIcon 
              fontSize="small" 
              color="info" 
              sx={{ ml: 1, cursor: 'pointer' }} 
              onClick={handleInfoClick}
            />
          </Tooltip>
        )}
        
        <Button
          size="small"
          color={isAnyModeOutOfStock ? "success" : "error"}
          variant="text"
          onClick={isAnyModeOutOfStock ? onRestock : onMarkOutOfStock}
          sx={{ ml: 1 }}
        >
          {isAnyModeOutOfStock ? "Restock" : "Mark Out"}
        </Button>
      </Box>
      
      {/* Enhanced Status Popover with Restock Times */}
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
        <Box sx={{ p: 2, maxWidth: 350 }}>
          <Typography variant="subtitle2" gutterBottom>
            Order Mode Stock Status: {subCategory.subCategoryName}
          </Typography>
          
          {isGloballyOutOfStock && subCategory?.stockStatus?.restockTime && (
            <Box mb={1}>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                Global Restock Time: {getGlobalRestockTime()}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box>
            {ORDER_MODES.map(mode => {
              const modeOutOfStock = 
                subCategory?.stockStatus?.orderModes?.[mode.value]?.isOutOfStock;
              const modeRestockTime = getModeRestockTime(mode.value);
              
              return (
                <Box key={mode.value} sx={{ mb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{mode.label}:</Typography>
                    <Chip
                      label={modeOutOfStock ? "Out of Stock" : "In Stock"}
                      color={modeOutOfStock ? "error" : "success"}
                      size="small"
                      sx={{ minWidth: 90 }}
                    />
                  </Box>
                  
                  {modeOutOfStock && modeRestockTime && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block' }}>
                      Restock: {modeRestockTime}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          
          {subCategory?.stockStatus?.outOfStockReason && (
            <Box mt={1}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>Reason:</strong> {subCategory.stockStatus.outOfStockReason}
              </Typography>
            </Box>
          )}
          
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              size="small"
              color={isAnyModeOutOfStock ? "success" : "error"}
              variant="outlined"
              onClick={isAnyModeOutOfStock ? onRestock : onMarkOutOfStock}
            >
              {isAnyModeOutOfStock ? "Restock" : "Mark Out"}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default SubCategoryStockStatusDisplay;