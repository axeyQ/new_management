// src/components/outlets/OfflineReasonList.js
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
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import OfflineReasonForm from './OfflineReasonForm';

const OfflineReasonList = () => {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [reasonToDelete, setReasonToDelete] = useState(null);

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/offline-reasons');
      if (res.data.success) {
        setReasons(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch offline reasons');
      }
    } catch (error) {
      console.error('Error fetching offline reasons:', error);
      toast.error('Error loading offline reasons');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (reason = null) => {
    setSelectedReason(reason);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedReason(null);
  };

  const handleFormSuccess = () => {
    fetchReasons();
    handleCloseForm();
  };

  const handleDeleteClick = (reason) => {
    setReasonToDelete(reason);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setReasonToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/offline-reasons/${reasonToDelete._id}`);
      if (res.data.success) {
        toast.success('Reason deleted successfully');
        fetchReasons();
      } else {
        toast.error(res.data.message || 'Failed to delete reason');
      }
    } catch (error) {
      console.error('Error deleting reason:', error);
      toast.error(error.response?.data?.message || 'Error deleting reason');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Offline Reasons</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Reason
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Reason</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">Loading...</TableCell>
              </TableRow>
            ) : reasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">No offline reasons found</TableCell>
              </TableRow>
            ) : (
              reasons.map((reason) => (
                <TableRow key={reason._id}>
                  <TableCell>{reason.reason}</TableCell>
                  <TableCell>{reason.description || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={reason.isActive ? "Active" : "Inactive"}
                      color={reason.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenForm(reason)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(reason)}
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
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <OfflineReasonForm
            reason={selectedReason}
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
            Are you sure you want to delete the reason &quot;{reasonToDelete?.reason}&quot;?
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

export default OfflineReasonList;