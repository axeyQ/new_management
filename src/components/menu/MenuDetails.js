// src/components/menu/MenuDetails.js - Updated to display variant information
import React, { useState, useEffect } from 'react';
import {
  Paper,
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ArrowBack as BackIcon,
  Restaurant as DishIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import MenuPricingForm from './MenuPricingForm';

const MenuDetails = ({ menuId }) => {
  const router = useRouter();
  const [menu, setMenu] = useState(null);
  const [pricingItems, setPricingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openPricingForm, setOpenPricingForm] = useState(false);
  const [selectedPricingItem, setSelectedPricingItem] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [pricingItemToDelete, setPricingItemToDelete] = useState(null);
  const [expandedDishId, setExpandedDishId] = useState(null);

  useEffect(() => {
    fetchMenuDetails();
  }, [menuId]);

  const fetchMenuDetails = async () => {
    setLoading(true);
    try {
      const menuRes = await axiosWithAuth.get(`/api/menu/menus/${menuId}`);
      if (menuRes.data.success) {
        setMenu(menuRes.data.data);
        // Get pricing items
        const pricingRes = await axiosWithAuth.get(`/api/menu/pricing?menu=${menuId}`);
        if (pricingRes.data.success) {
          // Group pricing items by dish for better display
          const items = pricingRes.data.data;
          setPricingItems(items);
        }
      } else {
        toast.error(menuRes.data.message || 'Failed to fetch menu details');
        router.push('/dashboard/menu/menus');
      }
    } catch (error) {
      console.error('Error fetching menu details:', error);
      toast.error('Error loading menu details');
      router.push('/dashboard/menu/menus');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPricingForm = (pricingItem = null) => {
    setSelectedPricingItem(pricingItem);
    setOpenPricingForm(true);
  };

  const handleClosePricingForm = () => {
    setOpenPricingForm(false);
    setSelectedPricingItem(null);
  };

  const handlePricingFormSuccess = () => {
    fetchMenuDetails();
    handleClosePricingForm();
  };

  const handleDeleteClick = (pricingItem) => {
    setPricingItemToDelete(pricingItem);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setPricingItemToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/pricing/${pricingItemToDelete._id}`);
      if (res.data.success) {
        toast.success('Menu item removed successfully');
        fetchMenuDetails();
      } else {
        toast.error(res.data.message || 'Failed to remove menu item');
      }
    } catch (error) {
      console.error('Error removing menu item:', error);
      toast.error(error.response?.data?.message || 'Error removing menu item');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const goBack = () => {
    router.push('/dashboard/menu/menus');
  };

  const toggleExpandDish = (dishId) => {
    if (expandedDishId === dishId) {
      setExpandedDishId(null);
    } else {
      setExpandedDishId(dishId);
    }
  };

  // Group pricing items by dish
  const groupedPricingItems = pricingItems.reduce((acc, item) => {
    const dishId = item.dish._id;
    if (!acc[dishId]) {
      acc[dishId] = [];
    }
    acc[dishId].push(item);
    return acc;
  }, {});

  // Now convert to array of { dish, items } for easier rendering
  const groupedPricingArray = Object.keys(groupedPricingItems).map(dishId => {
    const items = groupedPricingItems[dishId];
    return {
      dish: items[0].dish, // Take the dish from the first item
      items: items,
      // Sort items to show base dish first, then variants
      sortedItems: items.sort((a, b) => {
        if (!a.variant && b.variant) return -1;
        if (a.variant && !b.variant) return 1;
        return 0;
      })
    };
  });

  // Filter by search term
  const filteredPricingGroups = groupedPricingArray.filter(group => 
    group.dish.dishName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!menu) {
    return (
      <Alert severity="error">
        Menu not found or was deleted.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={1}>
        <IconButton onClick={goBack} sx={{ mr: 1 }}>
          <BackIcon />
        </IconButton>
        <Typography variant="h5">
          Menu: {menu.name}
        </Typography>
      </Box>
      <Box mb={3}>
        <Typography variant="body1" color="text.secondary">
          Order Mode: {menu.orderMode}
          {menu.isDefault && <Chip label="Default" color="primary" size="small" sx={{ ml: 1 }} />}
          <Chip
            label={menu.isActive ? 'Active' : 'Inactive'}
            color={menu.isActive ? 'success' : 'default'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Typography>
        {menu.description && (
          <Typography variant="body2" color="text.secondary">
            {menu.description}
          </Typography>
        )}
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <TextField
          placeholder="Search dishes..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenPricingForm()}
        >
          Add Dish to Menu
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Dish</TableCell>
              <TableCell>Base Price</TableCell>
              <TableCell>Tax ({pricingItems.length > 0 ? pricingItems[0].taxSlab : ''})</TableCell>
              <TableCell>Final Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="120">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPricingGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {searchTerm ? 'No matching dishes found' : 'No dishes added to this menu yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPricingGroups.map((group) => (
                <React.Fragment key={group.dish._id}>
                  {/* Main dish row */}
                  <TableRow 
                    sx={{ 
                      '& > *': { 
                        borderBottom: group.items.length > 1 ? 'unset' : undefined 
                      },
                      bgcolor: expandedDishId === group.dish._id ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {group.items.length > 1 && (
                          <IconButton 
                            size="small" 
                            onClick={() => toggleExpandDish(group.dish._id)}
                            sx={{ mr: 1 }}
                          >
                            {expandedDishId === group.dish._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                        {group.dish.image ? (
                          <Box
                            component="img"
                            src={group.dish.image}
                            alt={group.dish.dishName}
                            sx={{ width: 40, height: 40, mr: 1, borderRadius: 1, objectFit: 'cover' }}
                          />
                        ) : (
                          <DishIcon sx={{ mr: 1, color: 'primary.main' }} />
                        )}
                        <Typography variant="body1">
                          {group.dish.dishName}
                          {group.items.length > 1 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {group.items.length} {group.items.length === 1 ? 'price option' : 'price options'}
                            </Typography>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    {/* Check if this dish has any variants */}
                    {(() => {
                      const hasVariants = group.items.some(item => item.variant);
                      
                      // If the dish has variants, don't show base pricing
                      if (hasVariants) {
                        return (
                          <>
                            <TableCell colSpan={3}>
                              <Typography variant="body2" color="text.secondary" align="center">
                                Multiple variants available - click to expand
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Variants Available"
                                color="primary"
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                color="primary"
                                onClick={() => toggleExpandDish(group.dish._id)}
                                title="View Variants"
                                size="small"
                              >
                                {expandedDishId === group.dish._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </TableCell>
                          </>
                        );
                      } else {
                        // No variants - show the base item details
                        const baseItem = group.items[0];
                        return (
                          <>
                            <TableCell>₹{baseItem.price.toFixed(2)}</TableCell>
                            <TableCell>₹{baseItem.taxAmount.toFixed(2)}</TableCell>
                            <TableCell>₹{baseItem.finalPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                icon={baseItem.isAvailable ? <CheckIcon /> : <CloseIcon />}
                                label={baseItem.isAvailable ? 'Available' : 'Unavailable'}
                                color={baseItem.isAvailable ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenPricingForm(baseItem)}
                                title="Edit Pricing"
                                size="small"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                onClick={() => handleDeleteClick(baseItem)}
                                title="Remove from Menu"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </>
                        );
                      }
                    })()}
                  </TableRow>
                  
                  {/* Variant rows (if dish has variants and is expanded) */}
                  {expandedDishId === group.dish._id && group.items.length > 1 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedDishId === group.dish._id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1, py: 2 }}>
                            <Typography variant="subtitle2" gutterBottom component="div">
                              Variants
                            </Typography>
                            <Table size="small" sx={{ ml: 4 }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Variant</TableCell>
                                  <TableCell>Price</TableCell>
                                  <TableCell>Tax</TableCell>
                                  <TableCell>Final</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {group.sortedItems.map((item) => {
                                  // Display all items that have variants
                                  // OR display the base item only if there are no items with variants
                                  const hasVariants = group.items.some(i => i.variant);
                                  
                                  if ((item.variant) || (!hasVariants && !item.variant)) {
                                    return (
                                      <TableRow key={item._id}>
                                        <TableCell>
                                          {item.variant ? item.variant.variantName : 'Base Dish'}
                                        </TableCell>
                                        <TableCell>₹{item.price.toFixed(2)}</TableCell>
                                        <TableCell>₹{item.taxAmount.toFixed(2)}</TableCell>
                                        <TableCell>₹{item.finalPrice.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <Chip
                                            label={item.isAvailable ? 'Available' : 'Unavailable'}
                                            color={item.isAvailable ? 'success' : 'default'}
                                            size="small"
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <IconButton
                                            color="primary"
                                            onClick={() => handleOpenPricingForm(item)}
                                            size="small"
                                          >
                                            <EditIcon />
                                          </IconButton>
                                          <IconButton
                                            color="error"
                                            onClick={() => handleDeleteClick(item)}
                                            size="small"
                                          >
                                            <DeleteIcon />
                                          </IconButton>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                  return null;
                                })}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Menu Pricing Form Dialog */}
      <Dialog
        open={openPricingForm}
        onClose={handleClosePricingForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <MenuPricingForm
            menuId={menuId}
            pricingItem={selectedPricingItem}
            onSuccess={handlePricingFormSuccess}
            onCancel={handleClosePricingForm}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Remove</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove&nbsp;
            {pricingItemToDelete?.variant 
              ? `"${pricingItemToDelete?.dish?.dishName} - ${pricingItemToDelete?.variant?.variantName}"` 
              : `"${pricingItemToDelete?.dish?.dishName}"`
            } from this menu?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuDetails;