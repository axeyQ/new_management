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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const VariantFormSection = ({ variants, onChange, dishId }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [currentVariant, setCurrentVariant] = useState(null);
  const [variantData, setVariantData] = useState({
    variantName: '',
    description: '',
    isAvailable: true
  });

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
      return; // Validate required fields
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
  };

  const handleDeleteVariant = (variantId) => {
    const updatedVariants = variants.filter(v => v._id !== variantId);
    onChange(updatedVariants);
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
                <TableRow key={variant._id}>
                  <TableCell>{variant.variantName}</TableCell>
                  <TableCell>{variant.description || '-'}</TableCell>
                  <TableCell>
                    {variant.isAvailable !== false ? 'Available' : 'Unavailable'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleOpenDialog(variant)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteVariant(variant._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
    </Box>
  );
};

export default VariantFormSection;