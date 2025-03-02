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
  IconButton,
  Collapse
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Done as DoneIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'preparing':
      return 'info';
    case 'ready':
      return 'success';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

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

  // Get next status based on current status
  const getNextStatus = () => {
    switch (order.kotStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  // Handle bumping the order to next status
  const handleBumpOrder = () => {
    if (nextStatus) {
      onStatusUpdate(order._id, nextStatus);
    }
  };

  // Format order times
  const orderTime = new Date(order.createdAt);
  const elapsedTime = getElapsedTime(orderTime);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor:
          order.kotStatus === 'pending' ? 'warning.main' :
          order.kotStatus === 'preparing' ? 'info.main' :
          order.kotStatus === 'ready' ? 'success.main' :
          'grey.300'
      }}
    >
      <CardHeader
        title={
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              #{order.kotTokenNum}
            </Typography>
            <Chip
              label={order.kotStatus.toUpperCase()}
              color={getStatusColor(order.kotStatus)}
              size="small"
            />
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {order.orderMode} • Table: {order.table?.tableName || 'N/A'}
            </Typography>
            <Box display="flex" alignItems="center" mt={0.5}>
              <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
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
            >
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1">
                      {item.quantity}× {item.dishName}
                    </Typography>
                    <Chip
                      label={item.station}
                      variant="outlined"
                      size="small"
                      color="primary"
                    />
                  </Box>
                }
                secondary={
                  item.notes && (
                    <Typography variant="body2" color="text.secondary">
                      Note: {item.notes}
                    </Typography>
                  )
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
              {order.customer.name} • {order.customer.phone}
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
          startIcon={<InfoIcon />}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
        </Button>
        {nextStatus && (
          <Button
            variant="contained"
            color={getStatusColor(order.kotStatus)}
            startIcon={order.kotStatus === 'preparing' ? <DoneIcon /> : <AssignmentIcon />}
            onClick={handleBumpOrder}
          >
            {order.kotStatus === 'pending' ? 'Start Cooking' :
             order.kotStatus === 'preparing' ? 'Ready to Serve' :
             order.kotStatus === 'ready' ? 'Complete' : 'Bump'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default OrderCard;