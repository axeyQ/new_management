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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import TableForm from './TableForm';

const TableList = () => {
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);

  useEffect(() => {
    fetchTableTypes();
    fetchTables();
  }, []);

  useEffect(() => {
    fetchTables();
  }, [selectedType]);

  const fetchTableTypes = async () => {
    try {
      const res = await axiosWithAuth.get('/api/tables/types');
      if (res.data.success) {
        setTableTypes(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching table types:', error);
      toast.error('Failed to load table types');
    }
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const url = selectedType 
        ? `/api/tables?type=${selectedType}` 
        : '/api/tables';
      
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setTables(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch tables');
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error('Error loading tables');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (table = null) => {
    setSelectedTable(table);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTable(null);
  };

  const handleFormSuccess = () => {
    fetchTables();
    handleCloseForm();
  };

  const handleDeleteClick = (table) => {
    setTableToDelete(table);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTableToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/tables/${tableToDelete._id}`);
      if (res.data.success) {
        toast.success('Table deleted successfully');
        fetchTables();
      } else {
        toast.error(res.data.message || 'Failed to delete table');
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error(error.response?.data?.message || 'Error deleting table');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleTypeFilterChange = (event) => {
    setSelectedType(event.target.value);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Tables</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Table
        </Button>
      </Box>

      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="type-filter-label">Filter by Type</InputLabel>
          <Select
            labelId="type-filter-label"
            value={selectedType}
            onChange={handleTypeFilterChange}
            label="Filter by Type"
          >
            <MenuItem value="">
              <em>All Types</em>
            </MenuItem>
            {tableTypes.map((type) => (
              <MenuItem key={type._id} value={type._id}>
                {type.tableTypeName}
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
              <TableCell>Description</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width="150">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : tables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No tables found</TableCell>
              </TableRow>
            ) : (
              tables.map((table) => (
                <TableRow key={table._id}>
                  <TableCell>{table.tableName}</TableCell>
                  <TableCell>{table.tableDescription || '-'}</TableCell>
                  <TableCell>{table.capacity}</TableCell>
                  <TableCell>{table.tableType?.tableTypeName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={table.status ? <CheckIcon /> : <CloseIcon />}
                      label={table.status ? 'Available' : 'Unavailable'}
                      color={table.status ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenForm(table)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(table)}
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

      {/* Table Form Dialog */}
      <Dialog 
        open={openForm} 
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableForm
            table={selectedTable}
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
            Are you sure you want to delete the table &quot;{tableToDelete?.tableName}&quot;? This action cannot be undone.
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

export default TableList;