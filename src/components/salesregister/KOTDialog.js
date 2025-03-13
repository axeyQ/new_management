'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  ReceiptLong as ReceiptIcon,
  RefreshOutlined as RefreshIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import KOTService from './KOTService';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`kot-tabpanel-${index}`}
      aria-labelledby={`kot-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const KOTDialog = ({ open, onClose, order, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [kots, setKots] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [selectedKot, setSelectedKot] = useState(null);
  const [kotViewMode, setKotViewMode] = useState('list');

  useEffect(() => {
    // Load KOTs when dialog opens
    if (open && (order?._id || (order?.orderMode === 'Dine-in' && order?.table))) {
      loadKOTs();
    }
  }, [open, order, refreshKey]);

  const loadKOTs = async () => {
    setLoading(true);
    try {
      let kotData = [];
      
      if (order?._id) {
        // If we have an order ID, fetch KOTs for this order
        kotData = await KOTService.fetchKOTs(order._id);
      } else if (order?.orderMode === 'Dine-in' && order?.table) {
        // If no order ID but we have a table, fetch KOTs for this table
        kotData = await KOTService.fetchKOTs(null, order.table);
      }
      
      setKots(kotData);
    } catch (error) {
      console.error('Error loading KOTs:', error);
      toast.error('Failed to load KOTs');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKOT = async () => {
    // Basic validation
    if (!order) {
      toast.error('No order data available');
      return;
    }

    if (!order.itemsSold || order.itemsSold.length === 0) {
      toast.error('Please add items to the order first');
      return;
    }

    if (order.orderMode === 'Dine-in' && !order.table) {
      toast.error('Please select a table for dine-in orders');
      return;
    }

    setLoading(true);
    try {
      const result = await KOTService.generateKOT(order);
      if (result.success) {
        toast.success('KOT generated successfully');
        // Force refresh of KOT list
        setRefreshKey(oldKey => oldKey + 1);
        // Switch to latest KOT
        setSelectedKot(result.data);
        setTabValue(1);
        if (onSuccess) onSuccess(result.data);
      } else {
        toast.error(result.message || 'Failed to generate KOT');
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
      toast.error('Error generating KOT: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintKOT = async (kot) => {
    try {
      const result = await KOTService.printKOT(kot);
      if (result.success) {
        toast.success('KOT sent to printer');
        // Refresh KOT list
        setRefreshKey(oldKey => oldKey + 1);
      } else {
        toast.error(result.message || 'Failed to print KOT');
      }
    } catch (error) {
      console.error('Error printing KOT:', error);
      toast.error('Error printing KOT');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleViewKOT = (kot) => {
    setSelectedKot(kot);
    setTabValue(1);
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Kitchen Order Tickets
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="KOT List" />
            <Tab label="KOT Details" disabled={!selectedKot} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              All KOTs for Order {order?.invoiceNumber || ''}
            </Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={() => setRefreshKey(oldKey => oldKey + 1)}
                sx={{ mr: 1 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<ReceiptIcon />}
                onClick={handleGenerateKOT}
                disabled={loading || !order?.itemsSold?.length}
              >
                Generate New KOT
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
              <CircularProgress />
            </Box>
          ) : kots.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" paragraph>
                No KOTs have been created for this order yet.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ReceiptIcon />}
                onClick={handleGenerateKOT}
                disabled={!order?.itemsSold?.length}
              >
                Generate First KOT
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>KOT #</TableCell>
                    <TableCell>Generated</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kots.map((kot) => (
                    <TableRow key={kot._id}>
                      <TableCell>{kot.kotTokenNum}</TableCell>
                      <TableCell>{formatDate(kot.createdAt)}</TableCell>
                      <TableCell>
                        <Chip
                          label={kot.kotStatus.charAt(0).toUpperCase() + kot.kotStatus.slice(1)}
                          color={getKotStatusColor(kot.kotStatus)}
                          size="small"
                        />
                        {kot.printed && (
                          <Chip
                            label="Printed"
                            color="success"
                            size="small"
                            icon={<CheckCircleIcon />}
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{kot.items ? kot.items.length : 0} items</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleViewKOT(kot)}
                          sx={{ mr: 1 }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          startIcon={<PrintIcon />}
                          color="primary"
                          onClick={() => handlePrintKOT(kot)}
                          disabled={kot.printed}
                        >
                          {kot.printed ? 'Printed' : 'Print'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {selectedKot ? (
            <Box>
              <Box sx={{ border: '1px dashed #ccc', p: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">KOT: {selectedKot.kotFinalId}</Typography>
                  <Chip
                    label={selectedKot.kotStatus.charAt(0).toUpperCase() + selectedKot.kotStatus.slice(1)}
                    color={getKotStatusColor(selectedKot.kotStatus)}
                    size="small"
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Box>
                    <Typography variant="body2">
                      Order Mode: {selectedKot.orderMode}
                    </Typography>
                    {selectedKot.table && (
                      <Typography variant="body2">
                        Table: {selectedKot.table.tableName || 'Table ID: ' + selectedKot.table}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      Customer: {selectedKot.customer.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">
                      Generated: {formatDate(selectedKot.createdAt)}
                    </Typography>
                    <Typography variant="body2">
                      KOT #: {selectedKot.kotTokenNum}
                    </Typography>
                    {selectedKot.printed && (
                      <Typography variant="body2">
                        Printed: {formatDate(selectedKot.printedAt)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Variant</TableCell>
                        <TableCell align="center">Qty</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedKot.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.dishName}</TableCell>
                          <TableCell>{item.variantName || '-'}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell>{item.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box mt={3} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={() => handlePrintKOT(selectedKot)}
                    disabled={selectedKot.printed}
                  >
                    {selectedKot.printed ? 'Already Printed' : 'Print KOT'}
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>No KOT selected. Please select a KOT from the list.</Typography>
            </Box>
          )}
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default KOTDialog;