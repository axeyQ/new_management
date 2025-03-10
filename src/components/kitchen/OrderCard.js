'use client';
import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { getOrderTypeDetails, getStatusColor, getStatusLabel, getOrderTypeEmoji, getStatusEmoji } from '@/config/orderTypes';

// Helper function for time display
const getElapsedTime = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  } catch (error) {
    return 'Unknown';
  }
};

const OrderCard = ({ order, onStatusUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get order type details
  const orderType = getOrderTypeDetails(order.orderMode);

  // Get next status based on current status
  const getNextStatus = () => {
    switch (order.kotStatus) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'completed';
      default: return null;
    }
  };

  const nextStatus = getNextStatus();
  
  // Handle status update (bump order)
  const handleBumpOrder = () => {
    if (nextStatus) {
      onStatusUpdate(order._id, nextStatus);
    }
  };

  // Format order times
  const orderTime = new Date(order.createdAt);
  const elapsedTime = getElapsedTime(orderTime);
  
  // Calculate how long the order has been in current status
  const urgencyLevel = 
    elapsedTime.includes('hour') || elapsedTime.includes('day') 
      ? 'high' 
      : elapsedTime.includes('min') && parseInt(elapsedTime) > 15 
        ? 'medium' 
        : 'normal';
  
  // Get border color based on status and urgency
  const getBorderColor = () => {
    if (order.kotStatus === 'preparing' && urgencyLevel === 'high') {
      return 'error.main'; // Red border for preparing orders taking too long
    }
    
    return order.kotStatus === 'pending' ? 'warning.main' :
           order.kotStatus === 'preparing' ? 'info.main' :
           order.kotStatus === 'ready' ? 'success.main' :
           'grey.300';
  };

  // Get status button text
  const getStatusButtonText = () => {
    switch (order.kotStatus) {
      case 'pending': return `Start Cooking ${getStatusEmoji('preparing')}`;
      case 'preparing': return `Ready to Serve ${getStatusEmoji('ready')}`;
      case 'ready': return `Complete ${getStatusEmoji('completed')}`;
      default: return 'Bump';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: getBorderColor(),
        ...(urgencyLevel === 'high' && { boxShadow: 3 })
      }}
    >
      <CardHeader
        sx={{
          bgcolor: order.kotStatus === 'pending' ? 'warning.light' : 
                  order.kotStatus === 'preparing' ? 'info.light' :
                  order.kotStatus === 'ready' ? 'success.light' :
                  'background.paper'
        }}
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              #{order.kotTokenNum}
            </Typography>
            <Chip
              label={`${getStatusEmoji(order.kotStatus)} ${getStatusLabel(order.kotStatus)}`}
              color={getStatusColor(order.kotStatus)}
              size="small"
            />
          </Box>
        }
        subheader={
          <Box>
            <Box display="flex" alignItems="center" mb={0.5} mt={0.5}>
              <Chip
                label={`${getOrderTypeEmoji(order.orderMode)} ${orderType.label}`}
                color={orderType.color}
                size="small"
                sx={{ mr: 1 }}
              />
              {order.table && (
                <Typography variant="body2">
                  Table: {order.table?.tableName || 'N/A'}
                </Typography>
              )}
            </Box>
            <Box display="flex" alignItems="center" mt={0.5}>
              <span style={{ marginRight: '4px', fontSize: '16px' }}>⏱️</span>
              <Typography 
                variant="body2" 
                color={urgencyLevel === 'high' ? 'error.main' : 'text.secondary'}
              >
                {elapsedTime} ago
              </Typography>
            </Box>
          </Box>
        }
      />
      <Divider />
      <CardContent sx={{ flexGrow: 1, p: 0 }}>
        <List dense disablePadding>
          {order.items.map((item, index) => (
            <ListItem
              key={index}
              divider={index < order.items.length - 1}
              sx={{
                bgcolor: item.notes ? 'rgba(255, 235, 59, 0.1)' : 'transparent'
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1" fontWeight={item.notes ? 'medium' : 'regular'}>
                      {item.quantity}× {item.dishName}
                    </Typography>
                    {item.variantName && (
                      <Typography variant="body2" color="text.secondary">
                        {item.variantName}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <>
                    {item.notes && (
                      <Typography variant="body2" color="error" fontStyle="italic">
                        Note: {item.notes}
                      </Typography>
                    )}
                    {item.addOns && item.addOns.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        + {item.addOns.map(addon => addon.addOnName || addon.name).join(', ')}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box p={2}>
            <Typography variant="subtitle2" gutterBottom>
              Customer Information
            </Typography>
            <Typography variant="body2">
              {order.customer?.name || 'Unknown'} • {order.customer?.phone || 'No phone'}
            </Typography>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Order Details
            </Typography>
            <Typography variant="body2">
              Ref #: {order.refNum || 'N/A'}<br />
              KOT ID: {order.kotFinalId || 'N/A'}<br />
              Invoice: {order.invoiceNum || 'N/A'}
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', padding: 1 }}>
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less ↑' : 'More ↓'}
        </Button>
        
        <Box>
          {order.printed !== true && (
            <Button 
              size="small" 
              color="primary"
              sx={{ mr: 1 }}
              onClick={() => {
                // TODO: Implement printing functionality
                alert('Printing functionality not implemented');
              }}
            >
              🖨️ Print
            </Button>
          )}
          
          {nextStatus && (
            <Button
              variant="contained"
              color={getStatusColor(order.kotStatus)}
              onClick={handleBumpOrder}
              size="small"
            >
              {getStatusButtonText()}
            </Button>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default OrderCard;