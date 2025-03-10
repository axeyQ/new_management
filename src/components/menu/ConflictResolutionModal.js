'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  TextField,
  CircularProgress,
  RadioGroup,
  Radio,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { 
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';
import * as idb from '@/lib/indexedDBService';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import toast from 'react-hot-toast';

/**
 * Component for resolving sync conflicts manually
 */
const ConflictResolutionModal = ({ open, onClose, conflict, onResolved }) => {
  const [resolution, setResolution] = useState('server');
  const [mergeFields, setMergeFields] = useState({});
  const [customData, setCustomData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize merge fields from conflict data
  useEffect(() => {
    if (conflict) {
      const serverData = conflict.serverData || {};
      const localData = conflict.localData || {};
      
      // Combine all field names from both objects
      const allFields = [...new Set([
        ...Object.keys(serverData),
        ...Object.keys(localData)
      ])];
      
      // Initialize merge selection (default to server)
      const initialMergeFields = {};
      
      allFields.forEach(field => {
        // Skip technical fields and IDs
        if (['_id', 'createdAt', 'updatedAt', 'isTemp', '__v'].includes(field)) {
          return;
        }
        
        const serverValue = serverData[field];
        const localValue = localData[field];
        
        // Only include fields with differences
        if (JSON.stringify(serverValue) !== JSON.stringify(localValue)) {
          initialMergeFields[field] = 'server';
        }
      });
      
      setMergeFields(initialMergeFields);
      
      // Initialize custom data with server data JSON
      try {
        setCustomData(JSON.stringify(serverData, null, 2));
      } catch (e) {
        setCustomData('{}');
      }
    }
  }, [conflict]);
  
  // Handle field source selection for merge
  const handleFieldSourceChange = (field, value) => {
    setMergeFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Create merged object based on selections
  const getMergedData = () => {
    if (!conflict) return {};
    
    const serverData = conflict.serverData || {};
    const localData = conflict.localData || {};
    const result = { ...serverData }; // Start with server data
    
    // Apply selected field sources
    Object.entries(mergeFields).forEach(([field, source]) => {
      if (source === 'local') {
        result[field] = localData[field];
      }
      // server is already the default
    });
    
    return result;
  };
  
  // Handle resolution submission
  const handleResolve = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!conflict) {
        setError('No conflict data available');
        return;
      }
      
      let resolvedData;
      
      // Determine which data to use based on resolution strategy
      if (resolution === 'server') {
        resolvedData = conflict.serverData;
      } else if (resolution === 'local') {
        resolvedData = conflict.localData;
      } else if (resolution === 'merge') {
        resolvedData = getMergedData();
      } else if (resolution === 'custom') {
        try {
          resolvedData = JSON.parse(customData);
        } catch (e) {
          setError('Invalid JSON in custom data');
          return;
        }
      }
      
      // Remove temp flags if any
      if (resolvedData.isTemp) {
        delete resolvedData.isTemp;
      }
      
      // Apply the resolution based on conflict type
      if (conflict.type === 'CREATE') {
        // For creation conflicts, we need to create a new item
        const response = await enhancedAxiosWithAuth.post(
          conflict.endpoint,
          resolvedData
        );
        
        if (response.data.success) {
          toast.success('Conflict resolved successfully');
          
          // If there was a temp item, delete it
          if (conflict.localData && conflict.localData._id && conflict.localData.isTemp) {
            if (conflict.endpoint.includes('categories')) {
              await idb.deleteCategory(conflict.localData._id);
            } else if (conflict.endpoint.includes('subcategories')) {
              await idb.deleteSubcategory(conflict.localData._id);
            }
          }
          
          // Clear the operation if available
          if (conflict.operationId) {
            await idb.clearOperation(conflict.operationId);
          }
          
          onResolved(response.data.data);
        } else {
          setError(response.data.message || 'Failed to resolve conflict');
        }
      } else if (conflict.type === 'UPDATE') {
        // For update conflicts, use PUT
        const response = await enhancedAxiosWithAuth.put(
          `${conflict.endpoint}/${resolvedData._id}`,
          resolvedData
        );
        
        if (response.data.success) {
          toast.success('Conflict resolved successfully');
          
          // Update the local data
          if (conflict.endpoint.includes('categories')) {
            await idb.updateCategory(response.data.data);
          } else if (conflict.endpoint.includes('subcategories')) {
            await idb.updateSubcategory(response.data.data);
          }
          
          // Clear the operation if available
          if (conflict.operationId) {
            await idb.clearOperation(conflict.operationId);
          }
          
          onResolved(response.data.data);
        } else {
          setError(response.data.message || 'Failed to resolve conflict');
        }
      }
    } catch (err) {
      console.error('Error resolving conflict:', err);
      setError(err.message || 'Failed to resolve conflict');
    } finally {
      setLoading(false);
    }
  };
  
  // If no conflict data, don't render
  if (!conflict) {
    return null;
  }
  
  return (
    <Dialog open={open} onClose={loading ? null : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Resolve Sync Conflict
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          There is a conflict between your local changes and the server data.
          Please choose how to resolve this conflict.
        </Alert>
        
        <Typography variant="subtitle1" gutterBottom>
          Conflict Type: {conflict.type} {conflict.itemName ? `- ${conflict.itemName}` : ''}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Resolution Strategy:
          </Typography>
          
          <RadioGroup 
            value={resolution} 
            onChange={(e) => setResolution(e.target.value)}
          >
            <FormControlLabel
              value="server"
              control={<Radio />}
              label="Use server version (discard local changes)"
            />
            <FormControlLabel
              value="local"
              control={<Radio />}
              label="Use local version (override server)"
            />
            <FormControlLabel
              value="merge"
              control={<Radio />}
              label="Merge (choose fields from each version)"
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label="Custom (edit JSON directly)"
            />
          </RadioGroup>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {resolution === 'merge' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select field sources:
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Server Value</TableCell>
                    <TableCell>Local Value</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(mergeFields).map(([field, source]) => (
                    <TableRow key={field}>
                      <TableCell>{field}</TableCell>
                      <TableCell>
                        {typeof conflict.serverData[field] === 'object'
                          ? JSON.stringify(conflict.serverData[field])
                          : String(conflict.serverData[field] || '')}
                      </TableCell>
                      <TableCell>
                        {typeof conflict.localData[field] === 'object'
                          ? JSON.stringify(conflict.localData[field])
                          : String(conflict.localData[field] || '')}
                      </TableCell>
                      <TableCell>
                        <RadioGroup
                          row
                          value={source}
                          onChange={(e) => handleFieldSourceChange(field, e.target.value)}
                        >
                          <FormControlLabel
                            value="server"
                            control={<Radio size="small" />}
                            label="Server"
                          />
                          <FormControlLabel
                            value="local"
                            control={<Radio size="small" />}
                            label="Local"
                          />
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {resolution === 'custom' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Edit JSON directly:
            </Typography>
            
            <TextField
              multiline
              fullWidth
              rows={10}
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              error={(() => {
                try {
                  JSON.parse(customData);
                  return false;
                } catch (e) {
                  return true;
                }
              })()}
              helperText={(() => {
                try {
                  JSON.parse(customData);
                  return null;
                } catch (e) {
                  return 'Invalid JSON: ' + e.message;
                }
              })()}
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2">Server Version:</Typography>
            <pre style={{ 
              maxHeight: '200px', 
              overflow: 'auto', 
              backgroundColor: '#f5f5f5', 
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {JSON.stringify(conflict.serverData, null, 2)}
            </pre>
          </Box>
          
          <Box>
            <Typography variant="subtitle2">Local Version:</Typography>
            <pre style={{ 
              maxHeight: '200px', 
              overflow: 'auto', 
              backgroundColor: '#f5f5f5', 
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              {JSON.stringify(conflict.localData, null, 2)}
            </pre>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleResolve}
          disabled={loading || (resolution === 'custom' && (() => {
            try {
              JSON.parse(customData);
              return false;
            } catch (e) {
              return true;
            }
          })())}
          startIcon={loading ? <CircularProgress size={16} /> : <MergeIcon />}
        >
          {loading ? 'Resolving...' : 'Resolve Conflict'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionModal;