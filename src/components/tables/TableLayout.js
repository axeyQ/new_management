'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  TableRestaurant as TableIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import TableForm from './TableForm';
import axiosWithAuth from '@/lib/axiosWithAuth';
const TableLayout = () => {
  const [tables, setTables] = useState([]);
  const [tableTypes, setTableTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTable, setDraggedTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [openForm, setOpenForm] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [layoutChanged, setLayoutChanged] = useState(false);

  const layoutRef = useRef(null);

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

  const handleMouseDown = (e, table) => {
    if (!layoutRef.current) return;
    
    const layoutRect = layoutRef.current.getBoundingClientRect();
    const offsetX = e.clientX - layoutRect.left - table.positionX;
    const offsetY = e.clientY - layoutRect.top - table.positionY;
    
    setIsDragging(true);
    setDraggedTable(table);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !draggedTable || !layoutRef.current) return;
    
    const layoutRect = layoutRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(layoutRect.width - 100, e.clientX - layoutRect.left - dragOffset.x));
    const newY = Math.max(0, Math.min(layoutRect.height - 100, e.clientY - layoutRect.top - dragOffset.y));
    
    setTables(prevTables => 
      prevTables.map(t => 
        t._id === draggedTable._id
          ? { ...t, positionX: newX, positionY: newY }
          : t
      )
    );
    setLayoutChanged(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedTable(null);
  };

  const saveTablePositions = async () => {
    try {
      const updates = tables.map(async (table) => {
        return axiosWithAuth.put(`/api/tables/${table._id}`, {
          positionX: table.positionX,
          positionY: table.positionY
        });
      });
      
      await Promise.all(updates);
      toast.success('Table layout saved successfully');
      setLayoutChanged(false);
    } catch (error) {
      console.error('Error saving table positions:', error);
      toast.error('Failed to save table layout');
    }
  };

  const handleOpenForm = () => {
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  const handleFormSuccess = () => {
    fetchTables();
    handleCloseForm();
  };

  const handleTypeFilterChange = (event) => {
    setSelectedType(event.target.value);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Table Layout</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={fetchTables}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<SaveIcon />}
            onClick={saveTablePositions}
            disabled={!layoutChanged}
          >
            Save Layout
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenForm}
          >
            Add Table
          </Button>
        </Box>
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

      <Paper
        ref={layoutRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: 600,
          backgroundColor: '#f5f5f5',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : (
          tables.map((table) => (
            <Tooltip
              key={table._id}
              title={`${table.tableName} - Capacity: ${table.capacity} - Type: ${table.tableType?.tableTypeName || 'None'}`}
              arrow
            >
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  width: table.capacity > 4 ? 120 : 80,
                  height: table.capacity > 4 ? 120 : 80,
                  borderRadius: table.capacity > 4 ? '50%' : '8px',
                  left: table.positionX,
                  top: table.positionY,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: table.status ? '#ffffff' : '#f0f0f0',
                  border: `2px solid ${table.status ? '#4caf50' : '#f44336'}`,
                  cursor: 'grab',
                  userSelect: 'none',
                  zIndex: draggedTable?._id === table._id ? 10 : 1,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
              >
                <TableIcon color={table.status ? 'primary' : 'disabled'} />
                <Typography
                  variant="caption"
                  align="center"
                  sx={{
                    fontWeight: 'bold',
                    marginTop: 0.5,
                    fontSize: table.capacity > 4 ? '1rem' : '0.8rem',
                  }}
                >
                  {table.tableName}
                </Typography>
                <Typography variant="caption" align="center">
                  Cap: {table.capacity}
                </Typography>
              </Paper>
            </Tooltip>
          ))
        )}
      </Paper>

      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
        Drag tables to position them. Click &quot;Save Layout&quot; to save the positions.
      </Typography>

      {/* Table Form Dialog */}
      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <TableForm
            onSuccess={handleFormSuccess}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TableLayout;