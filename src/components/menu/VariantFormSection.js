// src/components/menu/VariantFormSection.js
'use client';
import { useState } from 'react';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';
import StockToggleButton from './StockToggleButton';

const VariantFormSection = ({ variants, onChange, dishId }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [variantData, setVariantData] = useState({
    variantName: '',
    description: '',
    isAvailable: true
  });
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [variantToView, setVariantToView] = useState(null);

  const handleOpenDialog = (variant = null) => {
    if (variant) {
      setVariantData({
        variantName: variant.variantName,
        description: variant.description || '',
        isAvailable: variant.isAvailable !== false
      });
      setCurrentVariant(variant);
    } else {
      setVariantData({
        variantName: '',
        description: '',
        isAvailable: true
      });
      setCurrentVariant(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentVariant(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVariantData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setVariantData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleVariantSave = () => {
    if (!variantData.variantName) {
      toast.error('Variant name is required');
      return;
    }
    
    let updatedVariants;
    if (currentVariant) {
      // Update existing variant
      updatedVariants = variants.map(v =>
        v._id === currentVariant._id ? { ...v, ...variantData } : v
      );
    } else {
      // Add new variant
      const newVariant = {
        ...variantData,
        _id: `temp-${Date.now()}`, // Temporary ID until server assigns a real one
        dishReference: dishId
      };
      updatedVariants = [...variants, newVariant];
    }
    
    onChange(updatedVariants);
    handleCloseDialog();
    toast.success(currentVariant ? 'Variant updated' : 'Variant added');
  };

  const handleOpenDeleteDialog = (variant) => {
    setVariantToDelete(variant);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setVariantToDelete(null);
  };

  const handleDeleteVariant = () => {
    const updatedVariants = variants.filter(v => v._id !== variantToDelete._id);
    onChange(updatedVariants);
    handleCloseDeleteDialog();
    toast.success('Variant removed');
  };

  const handleOpenViewDialog = (variant) => {
    setVariantToView(variant);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setVariantToView(null);
  };

  // Handler for stock status changes
  const handleStockSuccess = (updatedVariant) => {
    // Update the variant in the variants array
    const updatedVariants = variants.map(variant =>
      variant._id === updatedVariant._id ? updatedVariant : variant
    );
    onChange(updatedVariants);
    toast.success(`Variant stock status updated`);
  };

  return (
    <Box mt={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Variants</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          onClick={() => handleOpenDialog()}
        >
          Add Variant
        </Button>
      </Box>
      {variants.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Variant Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant._id} sx={{
                  opacity: variant.stockStatus?.isOutOfStock ? 0.7 : 1
                }}>
                  <TableCell>
                    {variant.variantName}
                    {variant.stockStatus && variant.stockStatus.isOutOfStock && (
                      <Chip
                        label="Out of Stock"
                        color="error"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{variant.description || '-'}</TableCell>
                  <TableCell>
                    {variant.stockStatus && variant.stockStatus.isOutOfStock ? (
                      <Chip
                        label="Out of Stock"
                        color="error"
                        size="small"
                      />
                    ) : (
                      variant.isAvailable !== false ? (
                        <Chip
                          label="Available"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Unavailable"
                          color="default"
                          size="small"
                        />
                      )
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleOpenViewDialog(variant)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(variant)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Stock Toggle Button - only show for real variants, not temporary ones */}
                    {variant._id && !variant._id.toString().startsWith('temp-') && (
                      <StockToggleButton 
                        item={variant} 
                        itemType="variant" 
                        onSuccess={handleStockSuccess} 
                      />
                    )}
                    
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(variant)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No variants added yet. Add variants to provide different options for this dish.
        </Typography>
      )}
      
      {/* Variant Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentVariant ? 'Edit Variant' : 'Add Variant'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Variant Name"
            name="variantName"
            value={variantData.variantName}
            onChange={handleInputChange}
            required
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            name="description"
            value={variantData.description}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={variantData.isAvailable}
                onChange={handleSwitchChange}
                name="isAvailable"
                color="primary"
              />
            }
            label="Available"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleVariantSave} variant="contained" color="primary">
            {currentVariant ? 'Update' : 'Add'} Variant
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the variant &quot;{variantToDelete?.variantName}&quot;?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteVariant} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Variant Dialog */}
      {variantToView && (
        <Dialog
          open={openViewDialog}
          onClose={handleCloseViewDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{variantToView.variantName}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Description</Typography>
              <Typography variant="body2" paragraph>
                {variantToView.description || 'No description available'}
              </Typography>
              
              <Typography variant="subtitle1" gutterBottom>Availability</Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Chip
                  label={variantToView.stockStatus?.isOutOfStock ? "Out of Stock" : "In Stock"}
                  color={variantToView.stockStatus?.isOutOfStock ? "error" : "success"}
                  sx={{ mr: 1 }}
                />
                {variantToView.isAvailable === false && (
                  <Chip
                    label="Unavailable"
                    color="default"
                  />
                )}
              </Box>
              
              {variantToView._id && !variantToView._id.toString().startsWith('temp-') && (
                <>
                  <Typography variant="subtitle1" gutterBottom>ID</Typography>
                  <Typography variant="body2" paragraph>
                    {variantToView._id}
                  </Typography>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Close</Button>
            <Button 
              onClick={() => {
                handleCloseViewDialog();
                handleOpenDialog(variantToView);
              }} 
              color="primary"
            >
              Edit
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default VariantFormSection;