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
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import AddOnGroupForm from './AddOnGroupForm';

const AddOnGroupList = () => {
  const [addonGroups, setAddonGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedAddonGroup, setSelectedAddonGroup] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  useEffect(() => {
    fetchAddonGroups();
  }, []);

  const fetchAddonGroups = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/menu/addongroups');
      if (res.data.success) {
        setAddonGroups(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch add-on groups');
      }
    } catch (error) {
      console.error('Error fetching add-on groups:', error);
      toast.error('Error loading add-on groups');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (addonGroup = null) => {
    setSelectedAddonGroup(addonGroup);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedAddonGroup(null);
  };

  const handleFormSuccess = () => {
    fetchAddonGroups();
    handleCloseForm();
  };

  const handleDeleteClick = (addonGroup) => {
    setGroupToDelete(addonGroup);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setGroupToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/addongroups/${groupToDelete._id}`);
      if (res.data.success) {
        toast.success('Add-on group deleted successfully');
        fetchAddonGroups();
      } else {
        toast.error(res.data.message || 'Failed to delete add-on group');
      }
    } catch (error) {
      console.error('Error deleting add-on group:', error);
      toast.error(error.response?.data?.message || 'Error deleting add-on group');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Add-on Groups</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add New Group
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Add-ons Count</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">Loading...</TableCell>
              </TableRow>
            ) : addonGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No add-on groups found</TableCell>
              </TableRow>
            ) : (
              addonGroups.map((group) => (
                <TableRow key={group._id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.addOns?.length || 0} add-ons</TableCell>
                  <TableCell>
                    <Chip
                      label={group.availabilityStatus ? "Available" : "Unavailable"}
                      color={group.availabilityStatus ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenForm(group)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(group)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
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
          <AddOnGroupForm
            addonGroup={selectedAddonGroup}
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
            Are you sure you want to delete the add-on group &quot;{groupToDelete?.name}&quot;?
            This action cannot be undone and will also remove all associations.
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

export default AddOnGroupList;