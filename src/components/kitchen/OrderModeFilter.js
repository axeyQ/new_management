'use client';

import { Box, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalDining as DineInIcon,
  TakeoutDining as TakeawayIcon,
  LocalShipping as DeliveryIcon,
  QrCode as QRIcon,
  Motorcycle as DirectDeliveryIcon,
  LocalPizza as ZomatoIcon
} from '@mui/icons-material';

// Order modes from the SalesOrder model
const ORDER_MODES = [
  { id: 'all', label: 'All Orders', icon: <RestaurantIcon /> },
  { id: 'Dine-in', label: 'Dine-in', icon: <DineInIcon /> },
  { id: 'Takeaway', label: 'Takeaway', icon: <TakeawayIcon /> },
  { id: 'Delivery', label: 'Delivery', icon: <DeliveryIcon /> },
  { id: 'Direct Order-TableQR', label: 'QR Order', icon: <QRIcon /> },
  { id: 'Direct Order-Takeaway', label: 'Direct Takeaway', icon: <TakeawayIcon /> },
  { id: 'Direct Order-Delivery', label: 'Direct Delivery', icon: <DirectDeliveryIcon /> },
  { id: 'Zomato', label: 'Zomato', icon: <ZomatoIcon /> }
];

// Count orders by order mode
const countOrdersByMode = (orders) => {
  return ORDER_MODES.map(mode => {
    const count = mode.id === 'all'
      ? orders.length
      : orders.filter(order => order.orderMode === mode.id).length;
    return {
      ...mode,
      count
    };
  });
};

const OrderModeFilter = ({ orders, selectedOrderMode, onChange }) => {
  const orderModesWithCount = countOrdersByMode(orders);

  const handleOrderModeChange = (event, newOrderMode) => {
    if (newOrderMode !== null) {
      onChange(newOrderMode);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Filter by Order Mode
      </Typography>
      <ToggleButtonGroup
        value={selectedOrderMode}
        exclusive
        onChange={handleOrderModeChange}
        aria-label="order mode filter"
        sx={{ flexWrap: 'wrap' }}
      >
        {orderModesWithCount.map(mode => (
          <ToggleButton
            key={mode.id}
            value={mode.id}
            aria-label={mode.label}
            sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {mode.icon}
              <Typography sx={{ mx: 1 }}>
                {mode.label}
              </Typography>
              <Chip
                label={mode.count}
                size="small"
                color={selectedOrderMode === mode.id ? "primary" : "default"}
                sx={{ ml: 0.5 }}
              />
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default OrderModeFilter;