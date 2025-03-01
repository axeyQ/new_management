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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import TableTypeForm from './TableTypeForm';

const TableTypeList = () => {
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedTableType, setSelectedTableType] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);

  useEffect(() => {
    fetchTableTypes();
  }, []);

  const fetchTableTypes = async () => {
    setLoading(true);
    try {
      const res = await axiosWithAuth.get('/api/tables/types');
      if (res.data.success) {
        setTableTypes(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch table types');
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      toast.error('Error loading table types');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (tableType = null) => {
    setSelectedTableType(tableType);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTableType(null);
  };

  const handleFormSuccess = () => {
    fetchTableTypes();
    handleCloseForm();
  };

  const handleDeleteClick = (tableType) => {
    setTypeToDelete(tableType);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTypeToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/tables/types/${typeToDelete._id}`);
      if (res.data.success) {
        toast.success('Table type deleted successfully');
        fetchTableTypes();
      } else {
        toast.error(res.data.message || 'Failed to delete table type');
      }
    } catch (error) {
      console.error('Error deleting table type:', error);
      toast.error(error.response?.data?.message || 'Error deleting table type');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Table Types</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Table Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center">Loading...</TableCell>
              </TableRow>
            ) : tableTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">No table types found</TableCell>
              </TableRow>
            ) : (
              tableTypes.map((type) => (
                <TableRow key={type._id}>
                  <TableCell>{type.tableTypeName}</TableCell>
                  <TableCell>{type.tableTypeDescription || '-'}</TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenForm(type)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(type)}
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

      {/* Table Type Form Dialog */}
      <Dialog 
        open={openForm} 
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableTypeForm
            tableType={selectedTableType}
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
            Are you sure you want to delete the table type &quot;{typeToDelete?.tableTypeName}&quot;? This action cannot be undone.
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
}
export default TableTypeList;