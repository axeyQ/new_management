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
 * Enhanced component that displays the stock status of a category and its restock times
 */
const CategoryStockStatusDisplay = ({ 
  category, 
  onMarkOutOfStock, 
  onRestock 
}) => {
  // For the status popover
  const [anchorEl, setAnchorEl] = useState(null);
  const openPopover = Boolean(anchorEl);

  // Get the overall stock status
  const isGloballyOutOfStock = category?.stockStatus?.isOutOfStock || false;

  // Count how many order modes are out of stock
  const getOutOfStockModeCount = () => {
    if (!category?.stockStatus?.orderModes) return 0;
    return ORDER_MODES.filter(mode =>
      category.stockStatus.orderModes[mode.value]?.isOutOfStock
    ).length;
  };
  
  const outOfStockModeCount = getOutOfStockModeCount();
  
  // Determine if category has mixed status (some modes out of stock, others in stock)
  const hasMixedStatus = outOfStockModeCount > 0 && outOfStockModeCount < ORDER_MODES.length;

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
    if (!category?.stockStatus?.restockTime) return null;
    return formatRestockTime(category.stockStatus.restockTime);
  };

  // Get restock time for a specific mode
  const getModeRestockTime = (modeKey) => {
    if (!category?.stockStatus?.orderModes?.[modeKey]?.restockTime) {
      return null;
    }
    return formatRestockTime(category.stockStatus.orderModes[modeKey].restockTime);
  };

  // Render the status chip based on the overall status
  const renderStatusChip = () => {
    if (isGloballyOutOfStock) {
      const restockTime = getGlobalRestockTime();
      
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
        <Tooltip title="Some modes are out of stock">
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
    
    if (outOfStockModeCount > 0) {
      return (
        <Tooltip title="All modes are out of stock">
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
    if (category?.stockStatus?.restockTime) return true;
    
    if (category?.stockStatus?.orderModes) {
      return Object.keys(category.stockStatus.orderModes).some(mode => 
        category.stockStatus.orderModes[mode].restockTime
      );
    }
    
    return false;
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
          color={isGloballyOutOfStock || outOfStockModeCount > 0 ? "success" : "error"}
          variant="text"
          onClick={isGloballyOutOfStock || outOfStockModeCount > 0 ? onRestock : onMarkOutOfStock}
          sx={{ ml: 1 }}
        >
          {isGloballyOutOfStock || outOfStockModeCount > 0 ? "Restock" : "Mark Out"}
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
            Order Mode Stock Status: {category.categoryName}
          </Typography>
          
          {isGloballyOutOfStock && category?.stockStatus?.restockTime && (
            <Box mb={1}>
              <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                Global Restock Time: {getGlobalRestockTime()}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box>
            {ORDER_MODES.map(mode => {
              const modeOutOfStock = category?.stockStatus?.orderModes?.[mode.value]?.isOutOfStock;
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
          
          {category?.stockStatus?.outOfStockReason && (
            <Box mt={1}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>Reason:</strong> {category.stockStatus.outOfStockReason}
              </Typography>
            </Box>
          )}
          
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button
              size="small"
              color={isGloballyOutOfStock || outOfStockModeCount > 0 ? "success" : "error"}
              variant="outlined"
              onClick={isGloballyOutOfStock || outOfStockModeCount > 0 ? onRestock : onMarkOutOfStock}
            >
              {isGloballyOutOfStock || outOfStockModeCount > 0 ? "Restock" : "Mark Out"}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default CategoryStockStatusDisplay;