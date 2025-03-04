import { useState, useEffect } from 'react';
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
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  AttachMoney as PriceIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import MenuAddonPricingForm from './MenuAddonPricingForm';

const MenuAddonsList = ({ menuId, menuName }) => {
  const [addonPricings, setAddonPricings] = useState([]);
  const [addonGroups, setAddonGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedPricing, setSelectedPricing] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [pricingToDelete, setPricingToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [menu, setMenu] = useState(null);
  const [isZomatoMenu, setIsZomatoMenu] = useState(false);

  useEffect(() => {
    fetchMenuDetails();
    fetchAddonGroups();
    fetchAddonPricings();
  }, [menuId]);

  useEffect(() => {
    fetchAddonPricings();
  }, [selectedGroup]);

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

  const fetchAddonPricings = async () => {
    setLoading(true);
    try {
      const url = `/api/menu/addon-pricing?menu=${menuId}${selectedGroup ? `&group=${selectedGroup}` : ''}`;
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setAddonPricings(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch add-on pricings');
      }
    } catch (error) {
      console.error('Error fetching add-on pricings:', error);
      toast.error('Error loading add-on pricings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (pricing = null) => {
    setSelectedPricing(pricing);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedPricing(null);
  };

  const handleFormSuccess = () => {
    fetchAddonPricings();
    handleCloseForm();
  };

  const handleDeleteClick = (pricing) => {
    setPricingToDelete(pricing);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setPricingToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/addon-pricing/${pricingToDelete._id}`);
      if (res.data.success) {
        toast.success('Add-on pricing removed successfully');
        fetchAddonPricings();
      } else {
        toast.error(res.data.message || 'Failed to remove add-on pricing');
      }
    } catch (error) {
      console.error('Error removing add-on pricing:', error);
      toast.error(error.response?.data?.message || 'Error removing add-on pricing');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleGroupFilterChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Find group name for an addon
  const findAddonGroup = (addonId) => {
    for (const group of addonGroups) {
      if (group.addOns && group.addOns.some(id =>
        String(id) === String(addonId) ||
        (id._id && String(id._id) === String(addonId))
      )) {
        return group.name;
      }
    }
    return '-';
  };

  // Filter addons by search term
  const filteredPricings = addonPricings.filter(pricing =>
    pricing.addon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If not a Zomato menu, display a message and return
  if (!isZomatoMenu) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Add-ons are only available for Zomato ordering mode. This menu is configured for {menu?.orderMode || 'another'} mode.
        </Alert>
        <Typography variant="body1">
          To use add-ons, please create a Zomato menu or switch to an existing Zomato menu.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Add-ons for Menu: {menuName}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Add-on to Menu
        </Button>
      </Box>
      <Box mb={3} display="flex" gap={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="group-filter-label">Filter by Group</InputLabel>
          <Select
            labelId="group-filter-label"
            value={selectedGroup}
            onChange={handleGroupFilterChange}
            label="Filter by Group"
          >
            <MenuItem value="">
              <em>All Groups</em>
            </MenuItem>
            {addonGroups.map((group) => (
              <MenuItem key={group._id} value={group._id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          placeholder="Search add-ons..."
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Add-on Name</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Related To</TableCell>
              <TableCell>Base Price</TableCell>
              <TableCell>Tax</TableCell>
              <TableCell>Final Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            ) : filteredPricings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No add-on pricings found for this menu
                </TableCell>
              </TableRow>
            ) : filteredPricings.map((pricing) => (
              <TableRow key={pricing._id}>
                <TableCell>{pricing.addon.name}</TableCell>
                <TableCell>{findAddonGroup(pricing.addon._id)}</TableCell>
                <TableCell>
                  {pricing.addon.dishReference ? (
                    <Box>
                      <Typography variant="body2">
                        {pricing.addon.dishReference.dishName || 'Unknown Dish'}
                      </Typography>
                      {pricing.addon.variantReference && (
                        <Chip
                          label={`Variant: ${pricing.addon.variantReference.variantName || 'Unknown'}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  ) : '-'}
                </TableCell>
                <TableCell>₹{pricing.price.toFixed(2)}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {pricing.taxSlab} (₹{pricing.taxAmount.toFixed(2)})
                  </Typography>
                </TableCell>
                <TableCell>₹{pricing.finalPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={pricing.isAvailable ? "Available" : "Unavailable"}
                    color={pricing.isAvailable ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenForm(pricing)}
                    size="small"
                    title="Edit Pricing"
                  >
                    <PriceIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(pricing)}
                    size="small"
                    title="Remove from Menu"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <MenuAddonPricingForm
            menuId={menuId}
            pricingItem={selectedPricing}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
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
            Are you sure you want to remove &quot;{pricingToDelete?.addon?.name}&quot; from this menu?
            This will not delete the add-on itself, only remove its pricing from this menu.
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

export default MenuAddonsList;