import { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Grid,
  Divider,
  Alert,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Switch,
  FormControlLabel,
  InputAdornment,
  TableContainer
} from '@mui/material';
import toast from 'react-hot-toast';
import axiosWithAuth from '@/lib/axiosWithAuth';

const MenuAddonPricingForm = ({ menuId, pricingItem, onSuccess, onCancel }) => {
  const [addonGroups, setAddonGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [addonsWithPricing, setAddonsWithPricing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [menu, setMenu] = useState(null);
  const [isZomatoMenu, setIsZomatoMenu] = useState(false);

  useEffect(() => {
    fetchMenuDetails();
    fetchAddonGroups();
  }, [menuId]);

  useEffect(() => {
    if (selectedGroup && menuId) {
      fetchGroupAddonsWithPricing();
    } else {
      setAddonsWithPricing([]);
    }
  }, [selectedGroup, menuId]);

  const fetchMenuDetails = async () => {
    try {
      const res = await axiosWithAuth.get(`/api/menu/menus/${menuId}`);
      if (res.data.success) {
        setMenu(res.data.data);
        setIsZomatoMenu(res.data.data.orderMode === 'Zomato');
      }
    } catch (error) {
      console.error('Error fetching menu details:', error);
    }
  };

  const fetchAddonGroups = async () => {
    try {
      const res = await axiosWithAuth.get('/api/menu/addongroups');
      if (res.data.success) {
        setAddonGroups(res.data.data);
      } else {
        toast.error('Failed to load add-on groups');
      }
    } catch (error) {
      console.error('Error fetching add-on groups:', error);
      toast.error('Error loading add-on groups');
    }
  };

  const fetchGroupAddonsWithPricing = async () => {
    setLoadingAddons(true);
    try {
      const res = await axiosWithAuth.get(
        `/api/menu/addon-pricing/group?groupId=${selectedGroup}&menuId=${menuId}`
      );
      if (res.data.success) {
        // Update add-ons with proper pricing from menu
        const addonsWithMenuPricing = await Promise.all(
          res.data.data.map(async (item) => {
            // For dish-based add-ons, get the price from menu pricing
            if (item.addon.dishReference && !item.isPriced) {
              try {
                const url = `/api/menu/pricing?menu=${menuId}&dish=${item.addon.dishReference._id}${
                  item.addon.variantReference ? `&variant=${item.addon.variantReference._id}` : ''
                }`;
                const pricingRes = await axiosWithAuth.get(url);
                if (pricingRes.data.success && pricingRes.data.data.length > 0) {
                  const menuPricing = pricingRes.data.data[0];
                  return {
                    ...item,
                    price: menuPricing.price,
                    taxRate: menuPricing.taxRate,
                    taxSlab: menuPricing.taxSlab
                  };
                }
              } catch (error) {
                console.error('Error fetching dish price:', error);
              }
            }
            return item;
          })
        );
        
        setAddonsWithPricing(addonsWithMenuPricing);
      } else {
        toast.error(res.data.message || 'Failed to fetch add-ons');
      }
    } catch (error) {
      console.error('Error fetching add-ons with pricing:', error);
      toast.error('Error loading add-ons');
    } finally {
      setLoadingAddons(false);
    }
  };

  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  const handleToggleAvailability = (index, currentValue) => {
    const updatedAddons = [...addonsWithPricing];
    updatedAddons[index].isAvailable = !currentValue;
    setAddonsWithPricing(updatedAddons);
  };

  const handlePriceChange = (index, value) => {
    const updatedAddons = [...addonsWithPricing];
    const price = parseFloat(value) || 0;
    updatedAddons[index].price = price;
    
    // Recalculate tax amount based on the new price
    const taxRate = updatedAddons[index].taxRate || 5;
    const taxAmount = (price * taxRate) / 100;
    updatedAddons[index].taxAmount = taxAmount;
    
    setAddonsWithPricing(updatedAddons);
  };

  const calculateTax = (price, taxRate) => {
    return (price * taxRate) / 100;
  };

  const calculateFinalPrice = (price, taxRate) => {
    return price + calculateTax(price, taxRate);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      // Filter only the addons that need to be saved or updated
      const addonsToSave = addonsWithPricing.filter(item =>
        !item.isPriced || 
        item.pricing?.isAvailable !== item.isAvailable ||
        item.pricing?.price !== item.price
      );
      
      if (addonsToSave.length === 0) {
        toast.success('No changes to save');
        setLoading(false);
        return;
      }
      
      // Create promises for all add-ons to save
      const savePromises = addonsToSave.map(item => {
        if (item.isPriced) {
          // Update existing pricing
          return axiosWithAuth.put(`/api/menu/addon-pricing/${item.pricing._id}`, {
            isAvailable: item.isAvailable,
            price: item.price
          });
        } else {
          // Create new pricing - use findOneAndUpdate with upsert on the backend
          return axiosWithAuth.post('/api/menu/addon-pricing', {
            menuId,
            addonId: item.addon._id,
            price: item.price,
            taxSlab: item.taxSlab,
            taxRate: item.taxRate,
            isAvailable: item.isAvailable
          });
        }
      });
      
      await Promise.all(savePromises);
      toast.success('Add-ons saved to menu successfully');
      onSuccess();
    } catch (error) {
      console.error('Error saving add-ons to menu:', error);
      toast.error('Error saving add-ons to menu');
    } finally {
      setLoading(false);
    }
  };

  // If not a Zomato menu, display a message and return
  if (!isZomatoMenu) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Add-ons are only available for Zomato ordering mode. This menu is configured for {menu?.orderMode || 'another'} mode.
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h6" mb={3}>
        Add Add-ons to Menu
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="group-select-label">Select Add-on Group</InputLabel>
        <Select
          labelId="group-select-label"
          value={selectedGroup}
          onChange={handleGroupChange}
          label="Select Add-on Group"
        >
          <MenuItem value="">
            <em>Select a group</em>
          </MenuItem>
          {addonGroups.map((group) => (
            <MenuItem key={group._id} value={group._id}>
              {group.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {selectedGroup ? (
        loadingAddons ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : addonsWithPricing.length === 0 ? (
          <Alert severity="info">
            No add-ons found in this group
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Add-ons from selected group
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Prices are automatically mapped from menu configuration. You can adjust prices and toggle availability.
            </Alert>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Add-on</TableCell>
                    <TableCell>Related To</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Final Price</TableCell>
                    <TableCell align="center">Available</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {addonsWithPricing.map((item, index) => (
                    <TableRow key={item.addon._id}>
                      <TableCell>{item.addon.name}</TableCell>
                      <TableCell>
                        {item.addon.dishReference ? (
                          <Box>
                            {item.addon.dishReference.dishName}
                            {item.addon.variantReference && (
                              <Chip
                                label={item.addon.variantReference.variantName}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.price}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          size="small"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            inputProps: { 
                              min: 0, 
                              step: 0.5,
                              style: { textAlign: 'right' }
                            }
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {item.taxSlab} (₹{calculateTax(item.price, item.taxRate).toFixed(2)})
                      </TableCell>
                      <TableCell align="right">
                        ₹{calculateFinalPrice(item.price, item.taxRate).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={item.isAvailable}
                              onChange={() => handleToggleAvailability(index, item.isAvailable)}
                              color="primary"
                            />
                          }
                          label=""
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      ) : (
        <Alert severity="info">
          Please select an add-on group to view its add-ons
        </Alert>
      )}
      
      <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveAll}
          disabled={loading || !selectedGroup || addonsWithPricing.length === 0}
        >
          {loading ? 'Saving...' : 'Save All Add-ons'}
        </Button>
      </Box>
    </Paper>
  );
};

export default MenuAddonPricingForm;