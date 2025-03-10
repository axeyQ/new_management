'use client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Chip
} from '@mui/material';
import {
  Receipt as OrderPlacedIcon,
  LocalDining as PrepareIcon,
  CheckCircle as ReadyIcon,
  PersonPin as PartnerAssignedIcon,
  EmojiPeople as PartnerArrivedIcon,
  DeliveryDining as DeliveryIcon,
  TaskAlt as DeliveredIcon,
  Cancel as CancelledIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

// Map of timeline events to display configuration
const timelineConfig = {
  'placed': {
    icon: <OrderPlacedIcon />,
    label: 'Order Placed',
    color: 'primary'
  },
  'accepted': {
    icon: <OrderPlacedIcon />,
    label: 'Order Accepted',
    color: 'primary'
  },
  'preparing': {
    icon: <PrepareIcon />,
    label: 'Preparing',
    color: 'warning'
  },
  'ready': {
    icon: <ReadyIcon />,
    label: 'Ready for Pickup',
    color: 'success'
  },
  'delivery-partner-assigned': {
    icon: <PartnerAssignedIcon />,
    label: 'Delivery Partner Assigned',
    color: 'info'
  },
  'delivery-partner-arrived': {
    icon: <PartnerArrivedIcon />,
    label: 'Delivery Partner Arrived',
    color: 'info'
  },
  'out-for-delivery': {
    icon: <DeliveryIcon />,
    label: 'Out For Delivery',
    color: 'primary'
  },
  'delivered': {
    icon: <DeliveredIcon />,
    label: 'Delivered',
    color: 'success'
  },
  'cancelled': {
    icon: <CancelledIcon />,
    label: 'Cancelled',
    color: 'error'
  }
};

const getDefaultTimeline = (orderDateTime) => {
  // Generate a default timeline if none exists
  return [
    {
      status: 'placed',
      timestamp: orderDateTime,
      note: 'Order placed via Zomato'
    }
  ];
};

const ZomatoOrderTimeline = ({ order }) => {
  // If no zomatoOrderDetails or timeline, create a default timeline
  const timeline = order?.zomatoOrderDetails?.timeline || getDefaultTimeline(order.orderDateTime);
  
  // Sort timeline events by timestamp
  const sortedTimeline = [...timeline].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Get the current/latest status
  const currentStatus = order?.zomatoOrderDetails?.zomatoStatus || 'placed';
  
  // Calculate estimated ready and delivery times
  const estimatedReady = order?.zomatoOrderDetails?.estimatedReadyTime;
  const estimatedDelivery = order?.zomatoOrderDetails?.estimatedDeliveryTime;
  
  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Order Timeline
        </Typography>
        
        {/* Estimated times display */}
        {(estimatedReady || estimatedDelivery) && (
          <Box mb={3} p={2} bgcolor="background.default" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Estimated Times
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={1}>
              {estimatedReady && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    icon={<ReadyIcon />} 
                    label="Ready for Pickup" 
                    color="info" 
                    variant="outlined" 
                    size="small"
                  />
                  <Typography variant="body2">
                    {format(new Date(estimatedReady), 'PPp')}
                    {' '}
                    <Typography component="span" color="text.secondary" variant="caption">
                      ({formatDistanceToNow(new Date(estimatedReady), { addSuffix: true })})
                    </Typography>
                  </Typography>
                </Box>
              )}
              
              {estimatedDelivery && (
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    icon={<DeliveredIcon />} 
                    label="Estimated Delivery" 
                    color="success" 
                    variant="outlined" 
                    size="small"
                  />
                  <Typography variant="body2">
                    {format(new Date(estimatedDelivery), 'PPp')}
                    {' '}
                    <Typography component="span" color="text.secondary" variant="caption">
                      ({formatDistanceToNow(new Date(estimatedDelivery), { addSuffix: true })})
                    </Typography>
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
        
        {/* Timeline stepper */}
        <Stepper orientation="vertical">
          {sortedTimeline.map((event, index) => {
            const config = timelineConfig[event.status] || timelineConfig.placed;
            return (
              <Step key={index} active={true} completed={true}>
                <StepLabel 
                  StepIconProps={{
                    icon: config.icon,
                    active: event.status === currentStatus
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {config.label}
                    <Chip
                      label={format(new Date(event.timestamp), 'p')}
                      size="small"
                      color={event.status === currentStatus ? config.color : 'default'}
                      variant={event.status === currentStatus ? 'filled' : 'outlined'}
                    />
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(event.timestamp), 'PPP')}
                    </Typography>
                    
                    {event.note && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {event.note}
                      </Typography>
                    )}
                    
                    {/* Delivery partner arrived event */}
                    {event.status === 'delivery-partner-arrived' && order?.zomatoOrderDetails?.deliveryPartner && (
                      <Box mt={1} p={1} bgcolor="background.paper" borderRadius={1}>
                        <Typography variant="body2">
                          Delivery Partner: {order.zomatoOrderDetails.deliveryPartner.name}
                          {order.zomatoOrderDetails.deliveryPartner.phone && (
                            <>
                              {' • '}
                              {order.zomatoOrderDetails.deliveryPartner.phone}
                            </>
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
        
        {/* If no events yet */}
        {sortedTimeline.length === 0 && (
          <Paper square elevation={0} sx={{ p: 3, textAlign: 'center' }}>
            <Typography>No timeline events recorded yet.</Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default ZomatoOrderTimeline;