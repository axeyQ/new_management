'use client';
import { useState } from 'react';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as ReadyIcon,
  LocalDining as ServeIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

// Define workflow steps
const orderSteps = [
  { status: 'pending', label: 'Order Placed', description: 'Order has been received but not yet sent to kitchen' },
  { status: 'preparing', label: 'Preparing', description: 'Kitchen is preparing the order' },
  { status: 'ready', label: 'Ready', description: 'Order is ready to be served' },
  { status: 'served', label: 'Served', description: 'Order has been served to the customer' },
  { status: 'completed', label: 'Completed', description: 'Order has been completed and paid for' },
  { status: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' }
];

const StatusUpdateButton = ({ order, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const getNextStatus = () => {
    const currentIndex = orderSteps.findIndex(step => step.status === order.orderStatus);
    if (currentIndex < orderSteps.length - 2) { // -2 because completed and cancelled are special
      return orderSteps[currentIndex + 1].status;
    }
    return null;
  };

  const getActiveStep = () => {
    return orderSteps.findIndex(step => step.status === order.orderStatus);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const updateStatus = async (newStatus) => {
    setLoading(true);
    try {
      const response = await axiosWithAuth.put(`/api/orders/${order._id}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        if (onSuccess) onSuccess(response.data.data);
        handleCloseDialog();
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error.response?.data?.message || 'Error updating order status');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStatus = () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      updateStatus(nextStatus);
    }
  };

  // Only show button for statuses that can be advanced
  if (['completed', 'cancelled'].includes(order.orderStatus)) {
    return null;
  }

  // Get button text and icon based on current status
  const getButtonConfig = () => {
    switch (order.orderStatus) {
      case 'pending':
        return {
          text: 'Start Preparing',
          icon: <StartIcon />,
          color: 'primary'
        };
      case 'preparing':
        return {
          text: 'Mark as Ready',
          icon: <ReadyIcon />,
          color: 'secondary'
        };
      case 'ready':
        return {
          text: 'Mark as Served',
          icon: <ServeIcon />,
          color: 'success'
        };
      default:
        return {
          text: 'Update Status',
          icon: null,
          color: 'primary'
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <>
      <Button
        variant="contained"
        color={buttonConfig.color}
        startIcon={buttonConfig.icon}
        onClick={handleOpenDialog}
        disabled={loading}
        sx={{ mr: 1 }}
      >
        {buttonConfig.text}
      </Button>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Order #{order.invoiceNumber} - Current Status: 
            <strong>{order.orderStatus}</strong>
          </Typography>
          
          <Stepper activeStep={getActiveStep()} orientation="vertical" sx={{ mt: 3 }}>
            {orderSteps.slice(0, 5).map((step, index) => (
              <Step key={step.status}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  {index === getActiveStep() && getNextStatus() && (
                    <Box sx={{ mb: 2, mt: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleNextStatus}
                        size="small"
                      >
                        {index === 0 ? 'Start Preparing' :
                         index === 1 ? 'Mark as Ready' :
                         index === 2 ? 'Serve Order' : 
                         'Continue'}
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {getActiveStep() === -1 && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography>Order workflow completed!</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          
          {order.orderStatus !== 'served' && (
            <Button
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => updateStatus('cancelled')}
            >
              Cancel Order
            </Button>
          )}
          
          {getNextStatus() && (
            <Button
              color="primary"
              variant="contained"
              onClick={handleNextStatus}
            >
              {buttonConfig.text}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StatusUpdateButton;