// src/components/menu/MenuList.js
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
  MenuBook as MenuIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  RestaurantMenu as DishesIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import toast from 'react-hot-toast';
import MenuForm from './MenuForm';

const MenuList = () => {
  const router = useRouter();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);
  const [filterMode, setFilterMode] = useState('');

  const orderModes = [
    'Dine-in', 
    'Takeaway', 
    'Delivery', 
    'Direct Order-TableQR', 
    'Direct Order-Takeaway', 
    'Direct Order-Delivery', 
    'Zomato'
  ];

  useEffect(() => {
    fetchMenus();
  }, [filterMode]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const url = filterMode ? `/api/menu/menus?mode=${filterMode}` : '/api/menu/menus';
      const res = await axiosWithAuth.get(url);
      if (res.data.success) {
        setMenus(res.data.data);
      } else {
        toast.error(res.data.message || 'Failed to fetch menus');
      }
    } catch (error) {
      console.error('Error fetching menus:', error);
      toast.error('Error loading menus');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (menu = null) => {
    setSelectedMenu(menu);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedMenu(null);
  };

  const handleFormSuccess = () => {
    fetchMenus();
    handleCloseForm();
  };

  const handleDeleteClick = (menu) => {
    setMenuToDelete(menu);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setMenuToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await axiosWithAuth.delete(`/api/menu/menus/${menuToDelete._id}`);
      if (res.data.success) {
        toast.success('Menu deleted successfully');
        fetchMenus();
      } else {
        toast.error(res.data.message || 'Failed to delete menu');
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.error(error.response?.data?.message || 'Error deleting menu');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleViewDishes = (menuId) => {
    router.push(`/dashboard/menu/menus/${menuId}`);
  };

  const handleFilterChange = (event) => {
    setFilterMode(event.target.value);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Menus</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Create New Menu
        </Button>
      </Box>

      <Box mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="mode-filter-label">Filter by Mode</InputLabel>
          <Select
            labelId="mode-filter-label"
            value={filterMode}
            onChange={handleFilterChange}
            label="Filter by Mode"
          >
            <MenuItem value="">All Modes</MenuItem>
            {orderModes.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Menu Name</TableCell>
              <TableCell>Order Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Default</TableCell>
              <TableCell>Dishes</TableCell>
              <TableCell width="180">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No menus found</TableCell>
              </TableRow>
            ) : (
              menus.map((menu) => (
                <TableRow key={menu._id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <MenuIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body1">{menu.name}</Typography>
                    </Box>
                    {menu.description && (
                      <Typography variant="caption" color="text.secondary">
                        {menu.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{menu.orderMode}</TableCell>
                  <TableCell>
                    <Chip
                      icon={menu.isActive ? <CheckIcon /> : <CloseIcon />}
                      label={menu.isActive ? 'Active' : 'Inactive'}
                      color={menu.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {menu.isDefault ? (
                      <Chip 
                        label="Default" 
                        color="primary" 
                        size="small" 
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {menu.dishPricing ? menu.dishPricing.length : 0} items
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="info"
                      onClick={() => handleViewDishes(menu._id)}
                      title="View Menu Items"
                      size="small"
                    >
                      <DishesIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenForm(menu)}
                      title="Edit Menu"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(menu)}
                      title="Delete Menu"
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

      {/* Menu Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <MenuForm
            menu={selectedMenu}
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
            Are you sure you want to delete the menu &quot;{menuToDelete?.name}&quot;? 
            This will also remove all price associations for dishes in this menu.
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

export default MenuList;