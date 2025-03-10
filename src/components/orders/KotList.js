// src/components/orders/KotList.js
'use client';
import { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';

const KotList = ({ orderId, kots = [], onKotCreated }) => {
  const [openKotDialog, setOpenKotDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [kotStatus, setKotStatus] = useState('pending');
  const [printerId, setPrinterId] = useState('');
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedKot, setSelectedKot] = useState(null);
  const [newKotStatus, setNewKotStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle refreshing KOTs list
  const handleRefresh = async () => {
    setRefreshing(true);
    if (onKotCreated) {
      await onKotCreated();
    }
    setRefreshing(false);
    toast.success('KOT list refreshed');
  };

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
    setLoading(true);
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
    } finally {
      setLoading(false);
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
      setLoading(true);
      const res = await axiosWithAuth.put(`/api/orders/kot/${kot._id}`, {
        printed: true,
        printerId: 'kitchen-printer' // Use default or get from settings
      });
      if (res.data.success) {
        toast.success('KOT sent to printer');
        onKotCreated();
        
        // In a real app, this would trigger the printing process
        const printWindow = window.open('', '_blank', 'width=500,height=600');
        if (!printWindow) {
          toast.error('Pop-up blocked! Please allow pop-ups for this site.');
          setLoading(false);
          return;
        }
        
        // Generate KOT print content
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>KOT #${kot.kotTokenNum}</title>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: monospace;
                margin: 0;
                padding: 0;
                width: 80mm;
                font-size: 12px;
              }
              .container {
                padding: 10px;
              }
              h1, h2 {
                text-align: center;
                margin: 5px 0;
              }
              h1 {
                font-size: 18px;
              }
              h2 {
                font-size: 16px;
              }
              .info {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                border-bottom: 1px dashed #000;
                padding-bottom: 5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                text-align: left;
                padding: 5px 3px;
              }
              th {
                border-bottom: 1px solid #000;
              }
              .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 10px;
              }
              .print-button {
                display: block;
                margin: 20px auto;
                padding: 10px 15px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
              }
              @media print {
                .print-button {
                  display: none;
                }
                body {
                  width: 80mm;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>KITCHEN ORDER TICKET</h1>
              <h2>KOT #${kot.kotTokenNum}</h2>
              <div class="info">
                <div>
                  <p>Order Type: ${kot.orderMode} ${kot.table ? `(${kot.table.tableName || 'Table ID: ' + kot.table})` : ''}</p>
                  <p>Customer: ${kot.customer.name}</p>
                  <p>Date Time: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Variant</th>
                    <th style="text-align: center;">Qty</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${kot.items.map((item, index) => `
                    <tr>
                      <td>${item.dishName}</td>
                      <td>${item.variantName || '-'}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td>${item.notes || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
            

              <button class="print-button" onclick="window.print()">Print KOT</button>
            </div>
            <script>
              // Auto-print when loaded
              window.onload = function() {
                setTimeout(function() { window.print(); }, 500);
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        toast.error(res.data.message || 'Failed to print KOT');
      }
    } catch (error) {
      console.error('Error printing KOT:', error);
      toast.error('Error printing KOT');
    } finally {
      setLoading(false);
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
        <Typography variant="h6">
          Kitchen Order Tickets {kots.length > 0 && `(${kots.length})`}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 1 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openCreateKot}
          >
            Create New KOT
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      {!loading && kots.length === 0 ? (
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
                      <Chip
                        label="Not Printed"
                        variant="outlined"
                        size="small"
                        color="warning"
                      />
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
                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PrintIcon />}
                    onClick={() => printKot(kot)}
                    disabled={loading}
                  >
                    Print KOT
                  </Button>
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
              {kots.length > 0 && kots[0]?.items?.length > 0 ? (
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
                      {kots[0]?.items?.map((item, index) => {
                        const isSelected = selectedItems.some(
                          selected => selected.dish === item.dish &&
                            selected.variant === item.variant
                        );
                        const selectedIndex = selectedItems.findIndex(
                          selected => selected.dish === item.dish &&
                            selected.variant === item.variant
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
                                  onChange={(e) =>
                                    handleKotQuantityChange(selectedIndex, e.target.value)}
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
              ) : (
                <Alert severity="info">
                  No items available. Please create an order with items first.
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateKot}>Cancel</Button>
          <Button 
            onClick={createKot} 
            variant="contained" 
            color="primary"
            disabled={loading || selectedItems.length === 0}
          >
            {loading ? 'Creating...' : 'Create KOT'}
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