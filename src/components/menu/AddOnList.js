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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Restaurant as DishIcon,
  Create as CreateIcon,
  CheckCircle as VegIcon,
  BakeryDining as EggIcon,
  LocalDining as NonVegIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import AddOnForm from './AddOnForm';

const AddOnList = () => {
  const [addons, setAddons] = useState([]);
  const [addonGroups, setAddonGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [addonToDelete, setAddonToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAddonGroups();
    fetchAddons();
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [selectedGroup]);

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

  const fetchAddons = async () => {
    setLoading(true);
    try {
      const url = selectedGroup
        ? `/api/menu/addons?group=${selectedGroup}`
        : '/api/menu/addons';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        // Process addons to add group information directly
        const processedAddons = res.data.data.map(addon => {
          // Find which group this addon belongs to and add it to the addon object
          for (const group of addonGroups) {
            if (group.addOns && group.addOns.some(id =>
              String(id) === String(addon._id) ||
              (id._id && String(id._id) === String(addon._id))
            )) {
              return {
                ...addon,
                groupName: group.name, // Add group name directly to addon object
                groupId: group._id // Add group ID directly to addon object
              };
            }
          }
          return addon;
        });
        setAddons(processedAddons);
      } else {
        toast.error(res.data.message || 'Failed to fetch add-ons');
      }
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      toast.error('Error loading add-ons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (addon = null) => {
    setSelectedAddon(addon);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedAddon(null);
  };

  const handleFormSuccess = async (newAddon) => {
    // First fetch the addon groups to make sure we have the latest data
    await fetchAddonGroups();
    // Then fetch the add-ons
    await fetchAddons();
    handleCloseForm();
  };

  const handleDeleteClick = (addon) => {
    setAddonToDelete(addon);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setAddonToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/addons/${addonToDelete._id}`);
      if (res.data.success) {
        toast.success('Add-on deleted successfully');
        fetchAddons();
      } else {
        toast.error(res.data.message || 'Failed to delete add-on');
      }
    } catch (error) {
      console.error('Error deleting add-on:', error);
      toast.error(error.response?.data?.message || 'Error deleting add-on');
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

  // Filter addons by search term
  const filteredAddons = addons.filter(addon =>
    addon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find group name for an addon - improved with better checking
  const findAddonGroup = (addonId) => {
    if (!addonGroups || addonGroups.length === 0) return '-';
    for (const group of addonGroups) {
      if (!group.addOns) continue;
      // Handle both array of strings and array of objects
      const addOnIds = group.addOns.map(addon =>
        typeof addon === 'string' ? addon : addon._id ? String(addon._id) : null
      ).filter(id => id !== null);
      if (addOnIds.includes(String(addonId))) {
        return group.name;
      }
    }
    return '-';
  };

  // Get dietary tag icon based on the tag value
  const getDietaryTagIcon = (tag) => {
    switch (tag) {
      case 'veg':
        return <VegIcon fontSize="small" style={{ color: 'green' }} />;
      case 'non veg':
        return <NonVegIcon fontSize="small" style={{ color: 'red' }} />;
      case 'egg':
        return <EggIcon fontSize="small" style={{ color: 'orange' }} />;
      default:
        return <VegIcon fontSize="small" style={{ color: 'green' }} />;
    }
  };

  // Format dietary tag for display
  const formatDietaryTag = (tag) => {
    switch (tag) {
      case 'veg':
        return 'Vegetarian';
      case 'non veg':
        return 'Non-Vegetarian';
      case 'egg':
        return 'Contains Egg';
      default:
        return 'Vegetarian';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Add-ons</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add New Add-on
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
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Dietary</TableCell>
              <TableCell>Related To</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Loading...</TableCell>
              </TableRow>
            ) : filteredAddons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No add-ons found</TableCell>
              </TableRow>
            ) : filteredAddons.map((addon) => (
              <TableRow key={addon._id}>
                <TableCell>{addon.name}</TableCell>
                <TableCell>
                  {addon.dishReference ? 
                    <Typography variant="body2" color="text.secondary">
                      Mapped from dish
                    </Typography> : 
                    `₹${addon.price?.toFixed(2) || '0.00'}`
                  }
                </TableCell>
                <TableCell>
                  {addon.groupName || findAddonGroup(addon._id) || '-'}
                </TableCell>
                <TableCell>
                  {addon.dishReference ? (
                    <Tooltip title="Based on a dish">
                      <Chip
                        icon={<DishIcon fontSize="small" />}
                        label="Dish-based"
                        size="small"
                        color="info"
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Custom add-on">
                      <Chip
                        icon={<CreateIcon fontSize="small" />}
                        label="Custom"
                        size="small"
                        color="secondary"
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title={formatDietaryTag(addon.dieteryTag || addon.dishReference?.dieteryTag || 'veg')}>
                    <Chip
                      icon={getDietaryTagIcon(addon.dieteryTag || addon.dishReference?.dieteryTag || 'veg')}
                      label={addon.dieteryTag || addon.dishReference?.dieteryTag || 'veg'}
                      size="small"
                      color={
                        (addon.dieteryTag || addon.dishReference?.dieteryTag) === 'veg' ? 'success' :
                        (addon.dieteryTag || addon.dishReference?.dieteryTag) === 'egg' ? 'warning' : 'error'
                      }
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {addon.dishReference ? (
                    <Box>
                      <Typography variant="body2">
                        {addon.dishReference.dishName || 'Unknown Dish'}
                      </Typography>
                      {addon.variantReference && (
                        <Chip
                          label={`Variant: ${addon.variantReference.variantName || 'Unknown'}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={addon.availabilityStatus ? "Available" : "Unavailable"}
                    color={addon.availabilityStatus ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenForm(addon)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(addon)}
                    size="small"
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
          <AddOnForm
            addon={selectedAddon}
            addonGroups={addonGroups}
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
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the add-on &quot;{addonToDelete?.name}&quot;?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AddOnList;