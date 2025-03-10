'use client';
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  FormHelperText,
} from '@mui/material';
import {
  LocalDining as PrepareIcon,
  CheckCircle as ReadyIcon,
  DeliveryDining as DeliveryIcon,
  Schedule as ScheduleIcon,
  Done as CompletedIcon,
  Person as DeliveryPartnerIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Map status to icon and color
const statusConfig = {
  'placed': { icon: <ScheduleIcon />, color: 'info', label: 'Placed' },
  'preparing': { icon: <PrepareIcon />, color: 'warning', label: 'Preparing' },
  'ready': { icon: <ReadyIcon />, color: 'success', label: 'Ready' },
  'out-for-delivery': { icon: <DeliveryIcon />, color: 'primary', label: 'Out for Delivery' },
  'scheduled': { icon: <ScheduleIcon />, color: 'secondary', label: 'Scheduled' },
  'completed': { icon: <CompletedIcon />, color: 'success', label: 'Completed' },
  'cancelled': { icon: null, color: 'error', label: 'Cancelled' },
};

const ZomatoOrderStatus = ({ order, onStatusUpdate }) => {
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState({
    zomatoStatus: order?.zomatoOrderDetails?.zomatoStatus || 'placed',
    deliveryPartner: {
      name: order?.zomatoOrderDetails?.deliveryPartner?.name || '',
      phone: order?.zomatoOrderDetails?.deliveryPartner?.phone || '',
      arrived: order?.zomatoOrderDetails?.deliveryPartner?.arrived || false,
    },
    estimatedReadyTime: order?.zomatoOrderDetails?.estimatedReadyTime || 
      new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16), // Default to 30 min from now
    estimatedDeliveryTime: order?.zomatoOrderDetails?.estimatedDeliveryTime || 
      new Date(Date.now() + 60 * 60000).toISOString().slice(0, 16), // Default to 60 min from now
    timelineEvent: '',
    note: '',
  });

  const handleStatusChange = (event) => {
    setStatusData({
      ...statusData,
      zomatoStatus: event.target.value,
      // Automatically set timeline event to match status change
      timelineEvent: event.target.value
    });
  };

  const handleDeliveryPartnerChange = (field, value) => {
    setStatusData({
      ...statusData,
      deliveryPartner: {
        ...statusData.deliveryPartner,
        [field]: value,
      },
      // If marking as arrived, also set the timeline event
      ...(field === 'arrived' && value === true ? { timelineEvent: 'delivery-partner-arrived' } : {})
    });
  };

  const handleInputChange = (field, value) => {
    setStatusData({
      ...statusData,
      [field]: value,
    });
  };

  const handleUpdateStatus = async () => {
    setLoading(true);
    try {
      const response = await axiosWithAuth.put(
        `/api/orders/${order._id}/zomato-status`,
        statusData
      );

      if (response.data.success) {
        toast.success('Zomato order status updated successfully');
        setOpenStatusDialog(false);
        if (onStatusUpdate) {
          onStatusUpdate(response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating Zomato status:', error);
      toast.error('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  // Get current status config
  const currentStatus = order?.zomatoOrderDetails?.zomatoStatus || 'placed';
  const status = statusConfig[currentStatus] || statusConfig.placed;

  // Check if we have delivery partner information
  const hasDeliveryPartner = order?.zomatoOrderDetails?.deliveryPartner?.name;
  const partnerArrived = order?.zomatoOrderDetails?.deliveryPartner?.arrived;

  return (
    <>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Zomato Order Status</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setOpenStatusDialog(true)}
            >
              Update Status
            </Button>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <Chip
              icon={status.icon}
              label={status.label}
              color={status.color}
              size="medium"
              sx={{ mr: 2 }}
            />
            {hasDeliveryPartner && (
              <Chip
                icon={<DeliveryPartnerIcon />}
                label={partnerArrived ? 'Partner Arrived' : 'Partner Assigned'}
                color={partnerArrived ? 'success' : 'info'}
                variant="outlined"
                size="medium"
              />
            )}
          </Box>

          <Grid container spacing={2}>
            {order?.zomatoOrderDetails?.estimatedReadyTime && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Estimated Ready Time:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {format(new Date(order.zomatoOrderDetails.estimatedReadyTime), 'PPp')}
                </Typography>
              </Grid>
            )}

            {order?.zomatoOrderDetails?.estimatedDeliveryTime && (
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Estimated Delivery Time:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {format(new Date(order.zomatoOrderDetails.estimatedDeliveryTime), 'PPp')}
                </Typography>
              </Grid>
            )}

            {hasDeliveryPartner && (
              <Grid item xs={12}>
                <Box mt={1} p={2} bgcolor="background.paper" borderRadius={1}>
                  <Typography variant="subtitle2" gutterBottom>
                    Delivery Partner Information
                  </Typography>
                  <Typography variant="body1">
                    Name: {order.zomatoOrderDetails.deliveryPartner.name}
                  </Typography>
                  <Typography variant="body1">
                    Phone: {order.zomatoOrderDetails.deliveryPartner.phone}
                  </Typography>
                  <Typography variant="body1">
                    Status: {partnerArrived ? 'Arrived at restaurant' : 'On the way'}
                  </Typography>
                  {partnerArrived && order.zomatoOrderDetails.deliveryPartner.arrivedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Arrived at: {format(new Date(order.zomatoOrderDetails.deliveryPartner.arrivedAt), 'PPp')}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog
        open={openStatusDialog}
        onClose={() => !loading && setOpenStatusDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Update Zomato Order Status</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="zomato-status-label">Order Status</InputLabel>
                <Select
                  labelId="zomato-status-label"
                  value={statusData.zomatoStatus}
                  onChange={handleStatusChange}
                  label="Order Status"
                >
                  <MenuItem value="placed">Placed</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="out-for-delivery">Out For Delivery</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="timeline-event-label">Timeline Event</InputLabel>
                <Select
                  labelId="timeline-event-label"
                  value={statusData.timelineEvent}
                  onChange={(e) => handleInputChange('timelineEvent', e.target.value)}
                  label="Timeline Event"
                >
                  <MenuItem value="">No timeline update</MenuItem>
                  <MenuItem value="placed">Order Placed</MenuItem>
                  <MenuItem value="accepted">Order Accepted</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready for Pickup</MenuItem>
                  <MenuItem value="delivery-partner-assigned">Delivery Partner Assigned</MenuItem>
                  <MenuItem value="delivery-partner-arrived">Delivery Partner Arrived</MenuItem>
                  <MenuItem value="out-for-delivery">Out For Delivery</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
                <FormHelperText>
                  Optional: Add a specific timeline event that may differ from status
                </FormHelperText>
              </FormControl>
            </Grid>

            {statusData.timelineEvent && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Note (Optional)"
                  value={statusData.note}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                  multiline
                  rows={2}
                  placeholder="Add any additional notes about this status change"
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Delivery Partner Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Partner Name"
                value={statusData.deliveryPartner.name}
                onChange={(e) => handleDeliveryPartnerChange('name', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                label="Partner Phone"
                value={statusData.deliveryPartner.phone}
                onChange={(e) => handleDeliveryPartnerChange('phone', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel id="partner-arrived-label">Arrived?</InputLabel>
                <Select
                  labelId="partner-arrived-label"
                  value={statusData.deliveryPartner.arrived}
                  onChange={(e) => handleDeliveryPartnerChange('arrived', e.target.value)}
                  label="Arrived?"
                >
                  <MenuItem value={true}>Yes</MenuItem>
                  <MenuItem value={false}>No</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Ready Time"
                type="datetime-local"
                value={statusData.estimatedReadyTime}
                onChange={(e) => handleInputChange('estimatedReadyTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Delivery Time"
                type="datetime-local"
                value={statusData.estimatedDeliveryTime}
                onChange={(e) => handleInputChange('estimatedDeliveryTime', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ZomatoOrderStatus;