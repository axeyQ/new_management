// src/components/orders/KotList.js
'use client';
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

const KotList = ({ orderId, kots, onKotCreated }) => {
  const [openKotDialog, setOpenKotDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [kotStatus, setKotStatus] = useState('pending');
  const [printerId, setPrinterId] = useState('');
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedKot, setSelectedKot] = useState(null);
  const [newKotStatus, setNewKotStatus] = useState('');

  const openCreateKot = () => {
    setOpenKotDialog(true);
  };

  const closeCreateKot = () => {
    setOpenKotDialog(false);
    setSelectedItems([]);
    setKotStatus('pending');
    setPrinterId('');
  };

  const handleItemToggle = (item) => {
    const itemIndex = selectedItems.findIndex(
      (selectedItem) => selectedItem.dish === item.dish && 
                       (selectedItem.variant === item.variant)
    );
    
    if (itemIndex === -1) {
      // Add item
      setSelectedItems([...selectedItems, { ...item, kotQuantity: 1 }]);
    } else {
      // Remove item
      const newItems = [...selectedItems];
      newItems.splice(itemIndex, 1);
      setSelectedItems(newItems);
    }
  };

  const handleKotQuantityChange = (index, value) => {
    const newItems = [...selectedItems];
    newItems[index].kotQuantity = parseInt(value);
    setSelectedItems(newItems);
  };

  const createKot = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    try {
      // Format items for KOT
      const items = selectedItems.map(item => ({
        dish: item.dish,
        dishName: item.dishName,
        variant: item.variant || null,
        variantName: item.variantName || null,
        quantity: item.kotQuantity,
        notes: item.notes || ''
      }));

      const kotData = {
        salesOrder: orderId,
        items,
        kotStatus,
        printed: false,
        printerId: printerId || 'default'
      };

      const res = await axiosWithAuth.post('/api/orders/kot', kotData);
      
      if (res.data.success) {
        toast.success('KOT created successfully');
        onKotCreated();
        closeCreateKot();
      } else {
        toast.error(res.data.message || 'Failed to create KOT');
      }
    } catch (error) {
      console.error('Error creating KOT:', error);
      toast.error(error.response?.data?.message || 'Error creating KOT');
    }
  };

  const openUpdateStatus = (kot) => {
    setSelectedKot(kot);
    setNewKotStatus(kot.kotStatus);
    setOpenStatusDialog(true);
  };

  const closeUpdateStatus = () => {
    setOpenStatusDialog(false);
    setSelectedKot(null);
  };

  const updateKotStatus = async () => {
    try {
      const res = await axiosWithAuth.put(`/api/orders/kot/${selectedKot._id}`, {
        kotStatus: newKotStatus
      });
      
      if (res.data.success) {
        toast.success('KOT status updated successfully');
        onKotCreated();
      } else {
        toast.error(res.data.message || 'Failed to update KOT status');
      }
    } catch (error) {
      console.error('Error updating KOT status:', error);
      toast.error('Error updating KOT status');
    } finally {
      closeUpdateStatus();
    }
  };

  const printKot = async (kot) => {
    try {
      const res = await axiosWithAuth.put(`/api/orders/kot/${kot._id}`, {
        printed: true,
        printerId: 'kitchen-printer' // Use default or get from settings
      });
      
      if (res.data.success) {
        toast.success('KOT sent to printer');
        onKotCreated();
        // In a real app, this would trigger the printing process
        window.open(`/print/kot/${kot._id}`, '_blank');
      } else {
        toast.error(res.data.message || 'Failed to print KOT');
      }
    } catch (error) {
      console.error('Error printing KOT:', error);
      toast.error('Error printing KOT');
    }
  };

  const getKotStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'default';
      case 'preparing': return 'warning';
      case 'ready': return 'info';
      case 'served': return 'success';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Kitchen Order Tickets (KOT)</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openCreateKot}
        >
          Create New KOT
        </Button>
      </Box>

      {kots.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" paragraph>
            No KOTs created for this order yet.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openCreateKot}
          >
            Create First KOT
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {kots.map((kot) => (
            <Grid item xs={12} md={6} key={kot._id}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    KOT #{kot.kotTokenNum}
                  </Typography>
                  <Box>
                    <Chip
                      label={kot.kotStatus.charAt(0).toUpperCase() + kot.kotStatus.slice(1)}
                      color={getKotStatusColor(kot.kotStatus)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {kot.printed ? (
                      <Chip 
                        label="Printed" 
                        color="success" 
                        size="small" 
                        icon={<CheckIcon />} 
                      />
                    ) : (
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => printKot(kot)}
                      >
                        <PrintIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                
                <Typography variant="caption" color="text.secondary" display="block">
                  Created: {new Date(kot.createdAt).toLocaleString()}
                </Typography>
                
                <TableContainer sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kot.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {item.dishName}
                            {item.variantName && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Variant: {item.variantName}
                              </Typography>
                            )}
                            {item.notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                Note: {item.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => openUpdateStatus(kot)}
                  >
                    Update Status
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create KOT Dialog */}
      <Dialog
        open={openKotDialog}
        onClose={closeCreateKot}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New KOT</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="kot-status-label">KOT Status</InputLabel>
                <Select
                  labelId="kot-status-label"
                  value={kotStatus}
                  onChange={(e) => setKotStatus(e.target.value)}
                  label="KOT Status"
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="preparing">Preparing</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Printer ID (Optional)"
                value={printerId}
                onChange={(e) => setPrinterId(e.target.value)}
                placeholder="e.g., kitchen-printer-1"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Select Items for KOT
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Quantity for KOT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* We'd typically get these from the order */}
                    {kots.length > 0 && kots[0]?.items?.map((item, index) => {
                      const isSelected = selectedItems.some(
                        selected => selected.dish === item.dish && selected.variant === item.variant
                      );
                      const selectedIndex = selectedItems.findIndex(
                        selected => selected.dish === item.dish && selected.variant === item.variant
                      );
                      
                      return (
                        <TableRow key={index}>
                          <TableCell padding="checkbox">
                            <Chip
                              label={isSelected ? 'Selected' : 'Select'}
                              color={isSelected ? 'primary' : 'default'}
                              variant={isSelected ? 'filled' : 'outlined'}
                              onClick={() => handleItemToggle(item)}
                            />
                          </TableCell>
                          <TableCell>
                            {item.dishName}
                            {item.variantName && (
                              <Typography variant="caption" display="block">
                                Variant: {item.variantName}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {isSelected && (
                              <TextField
                                type="number"
                                size="small"
                                value={selectedItems[selectedIndex].kotQuantity}
                                onChange={(e) => handleKotQuantityChange(selectedIndex, e.target.value)}
                                InputProps={{ inputProps: { min: 1, max: item.quantity } }}
                                sx={{ width: 80 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateKot}>Cancel</Button>
          <Button onClick={createKot} variant="contained" color="primary">
            Create KOT
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={openStatusDialog} onClose={closeUpdateStatus}>
        <DialogTitle>Update KOT Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="kot-status-update-label">Status</InputLabel>
            <Select
              labelId="kot-status-update-label"
              value={newKotStatus}
              onChange={(e) => setNewKotStatus(e.target.value)}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="ready">Ready</MenuItem>
              <MenuItem value="served">Served</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUpdateStatus}>Cancel</Button>
          <Button onClick={updateKotStatus} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KotList;