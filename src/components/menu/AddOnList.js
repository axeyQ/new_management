'use client';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
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
        setAddons(res.data.data);
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

  const handleFormSuccess = () => {
    fetchAddons();
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
      <Box mb={3}>
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
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Reference Dish</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : addons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No add-ons found</TableCell>
              </TableRow>
            ) : addons.map((addon) => (
  <TableRow key={addon._id}>
    <TableCell>
      {addon.name}
      {addon.dishReference && (
        <Typography variant="caption" color="text.secondary" display="block">
          From: {addon.dishReference.dishName || 'Unknown Dish'}
        </Typography>
      )}
    </TableCell>
    <TableCell>₹{addon.price?.toFixed(2) || '0.00'}</TableCell>
    <TableCell>
      {addonGroups.find(g => g.addOns?.includes(addon._id))?.name || '-'}
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