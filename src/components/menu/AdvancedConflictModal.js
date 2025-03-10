import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Grid,
  Paper,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Check as CheckIcon,
  Merge as MergeIcon,
  History as HistoryIcon,
  Storage as StorageIcon,
  CloudSync as CloudIcon
} from '@mui/icons-material';
import ReactDiffViewer from 'react-diff-viewer';
import { format } from 'date-fns';
import * as idb from '@/lib/indexedDBService';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import toast from 'react-hot-toast';

const AdvancedConflictModal = ({ 
  open, 
  onClose, 
  conflicts = [], 
  onResolved 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [resolution, setResolution] = useState('server');
  const [mergeFields, setMergeFields] = useState({});
  const [customData, setCustomData] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolvedConflicts, setResolvedConflicts] = useState([]);
  const [currentConflict, setCurrentConflict] = useState(null);
  
  // Set the current conflict based on active step
  useEffect(() => {
    if (conflicts.length > 0 && activeStep < conflicts.length) {
      setCurrentConflict(conflicts[activeStep]);
      
      // Reset resolution for new conflict
      setResolution('server');
      
      // Generate merge fields
      if (conflicts[activeStep]) {
        const serverData = conflicts[activeStep].serverData || {};
        const localData = conflicts[activeStep].localData || {};
        
        // Initialize merge fields
        const initialMergeFields = {};
        const allFields = [...new Set([
          ...Object.keys(serverData),
          ...Object.keys(localData)
        ])];
        
        allFields.forEach(field => {
          // Skip technical fields and IDs
          if (['_id', 'createdAt', 'updatedAt', 'isTemp', '__v'].includes(field)) {
            return;
          }
          
          // Only include fields with differences
          if (JSON.stringify(serverData[field]) !== JSON.stringify(localData[field])) {
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
    }
  }, [conflicts, activeStep]);
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle field source selection for merge
  const handleFieldSourceChange = (field, value) => {
    setMergeFields(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Create merged object based on selections
  const getMergedData = () => {
    if (!currentConflict) return {};
    
    const serverData = currentConflict.serverData || {};
    const localData = currentConflict.localData || {};
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
  
  // Handle resolution submission for current conflict
  const handleResolve = async () => {
    if (!currentConflict) return;
    
    try {
      setLoading(true);
      
      let resolvedData;
      
      // Determine which data to use based on resolution strategy
      if (resolution === 'server') {
        resolvedData = currentConflict.serverData;
      } else if (resolution === 'local') {
        resolvedData = currentConflict.localData;
      } else if (resolution === 'merge') {
        resolvedData = getMergedData();
      } else if (resolution === 'custom') {
        try {
          resolvedData = JSON.parse(customData);
        } catch (e) {
          toast.error('Invalid JSON in custom data');
          setLoading(false);
          return;
        }
      }
      
      // Remove temp flags if any
      if (resolvedData.isTemp) {
        delete resolvedData.isTemp;
      }
      
      // Apply the resolution based on conflict type
      let result;
      
      if (currentConflict.type.includes('CREATE')) {
        // For creation conflicts, we need to create a new item
        const response = await enhancedAxiosWithAuth.post(
          currentConflict.endpoint,
          resolvedData
        );
        
        if (response.data.success) {
          // If there was a temp item, delete it
          if (currentConflict.localData && currentConflict.localData._id && currentConflict.localData.isTemp) {
            if (currentConflict.type.includes('CATEGORY')) {
              await idb.deleteCategory(currentConflict.localData._id);
            } else if (currentConflict.type.includes('SUBCATEGORY')) {
              await idb.deleteSubcategory(currentConflict.localData._id);
            }
          }
          
          // Clear the operation if available
          if (currentConflict.operationId) {
            await idb.clearOperation(currentConflict.operationId);
          }
          
          result = response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to resolve conflict');
        }
      } else if (currentConflict.type.includes('UPDATE')) {
        // For update conflicts, use PUT
        const response = await enhancedAxiosWithAuth.put(
          `${currentConflict.endpoint}/${resolvedData._id}`,
          resolvedData
        );
        
        if (response.data.success) {
          // Update the local data
          if (currentConflict.type.includes('CATEGORY')) {
            await idb.updateCategory(response.data.data);
          } else if (currentConflict.type.includes('SUBCATEGORY')) {
            await idb.updateSubcategory(response.data.data);
          }
          
          // Clear the operation if available
          if (currentConflict.operationId) {
            await idb.clearOperation(currentConflict.operationId);
          }
          
          result = response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to resolve conflict');
        }
      }
      
      // Add to resolved conflicts
      setResolvedConflicts(prev => [...prev, {
        conflict: currentConflict,
        resolution: {
          strategy: resolution,
          result: result,
          timestamp: new Date().toISOString()
        }
      }]);
      
      toast.success('Conflict resolved successfully');
      
      // Move to next conflict or finish
      if (activeStep < conflicts.length - 1) {
        handleNext();
      } else {
        // All conflicts resolved
        onResolved(resolvedConflicts);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error(error.message || 'Failed to resolve conflict');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle resolving all remaining conflicts with server data
  const handleResolveAllWithServer = async () => {
    try {
      setLoading(true);
      
      // Start from current conflict and resolve all with server data
      for (let i = activeStep; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        
        // Skip if already resolved
        if (resolvedConflicts.some(rc => rc.conflict.id === conflict.id)) {
          continue;
        }
        
        // Apply server resolution
        if (conflict.type.includes('CREATE')) {
          // For creation conflicts with server data
          const response = await enhancedAxiosWithAuth.post(
            conflict.endpoint,
            conflict.serverData
          );
          
          if (response.data.success) {
            // Delete temp item if any
            if (conflict.localData?.isTemp) {
              if (conflict.type.includes('CATEGORY')) {
                await idb.deleteCategory(conflict.localData._id);
              } else if (conflict.type.includes('SUBCATEGORY')) {
                await idb.deleteSubcategory(conflict.localData._id);
              }
            }
            
            // Clear operation
            if (conflict.operationId) {
              await idb.clearOperation(conflict.operationId);
            }
            
            // Add to resolved
            setResolvedConflicts(prev => [...prev, {
              conflict,
              resolution: {
                strategy: 'server',
                result: response.data.data,
                timestamp: new Date().toISOString()
              }
            }]);
          }
        } else if (conflict.type.includes('UPDATE')) {
          // For update conflicts with server data
          const response = await enhancedAxiosWithAuth.put(
            `${conflict.endpoint}/${conflict.serverData._id}`,
            conflict.serverData
          );
          
          if (response.data.success) {
            // Update local data
            if (conflict.type.includes('CATEGORY')) {
              await idb.updateCategory(response.data.data);
            } else if (conflict.type.includes('SUBCATEGORY')) {
              await idb.updateSubcategory(response.data.data);
            }
            
            // Clear operation
            if (conflict.operationId) {
              await idb.clearOperation(conflict.operationId);
            }
            
            // Add to resolved
            setResolvedConflicts(prev => [...prev, {
              conflict,
              resolution: {
                strategy: 'server',
                result: response.data.data,
                timestamp: new Date().toISOString()
              }
            }]);
          }
        }
      }
      
      // All conflicts resolved
      onResolved(resolvedConflicts);
      
    } catch (error) {
      console.error('Error resolving all conflicts:', error);
      toast.error('Failed to resolve all conflicts');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={loading ? null : onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Resolve Sync Conflicts ({activeStep + 1} of {conflicts.length})
      </DialogTitle>
      
      <DialogContent dividers>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {conflicts.map((conflict, index) => (
            <Step key={index} completed={resolvedConflicts.some(rc => rc.conflict.id === conflict.id)}>
              <StepLabel>
                {conflict.type.replace('_', ' ')}
                {resolvedConflicts.some(rc => rc.conflict.id === conflict.id) && (
                  <CheckIcon fontSize="small" color="success" sx={{ ml: 1 }} />
                )}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {currentConflict ? (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Conflict Type: {currentConflict.type.replace('_', ' ')}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Item: {currentConflict.itemName || (currentConflict.localData?.categoryName || currentConflict.localData?.subCategoryName || 'Unknown')}
                    </Typography>
                    {currentConflict.localData?.updatedAt && (
                      <Typography variant="body2" gutterBottom>
                        Local Last Updated: {formatDate(currentConflict.localData.updatedAt)}
                      </Typography>
                    )}
                    {currentConflict.serverData?.updatedAt && (
                      <Typography variant="body2" gutterBottom>
                        Server Last Updated: {formatDate(currentConflict.serverData.updatedAt)}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Resolution Strategy
                    </Typography>
                    <RadioGroup 
                      value={resolution} 
                      onChange={(e) => setResolution(e.target.value)}
                      row
                    >
                      <FormControlLabel
                        value="server"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CloudIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Server
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="local"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <StorageIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Local
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="merge"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <MergeIcon fontSize="small" sx={{ mr: 0.5 }} />
                            Merge
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="custom"
                        control={<Radio />}
                        label="Custom"
                      />
                    </RadioGroup>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange}
                aria-label="conflict resolution tabs"
              >
                <Tab label="Visual Comparison" />
                <Tab label="Advanced Merge" />
                {resolution === 'custom' && <Tab label="Custom JSON" />}
              </Tabs>
            </Box>
            
            {/* Tab Content */}
            <Box sx={{ p: 1 }}>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Visual Comparison
                  </Typography>
                  <ReactDiffViewer
                    oldValue={JSON.stringify(currentConflict.serverData, null, 2)}
                    newValue={JSON.stringify(currentConflict.localData, null, 2)}
                    splitView={true}
                    leftTitle="Server Version"
                    rightTitle="Local Version"
                    useDarkTheme={false}
                  />
                </Box>
              )}
              
              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Field-by-Field Merge
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Choose which version to use for each field with differences
                  </Alert>
                  
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
                              {typeof currentConflict.serverData[field] === 'object'
                                ? JSON.stringify(currentConflict.serverData[field])
                                : String(currentConflict.serverData[field] || '')}
                            </TableCell>
                            <TableCell>
                              {typeof currentConflict.localData[field] === 'object'
                                ? JSON.stringify(currentConflict.localData[field])
                                : String(currentConflict.localData[field] || '')}
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
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <CloudIcon fontSize="small" sx={{ mr: 0.5 }} />
                                      Server
                                    </Box>
                                  }
                                />
                                <FormControlLabel
                                  value="local"
                                  control={<Radio size="small" />}
                                  label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <StorageIcon fontSize="small" sx={{ mr: 0.5 }} />
                                      Local
                                    </Box>
                                  }
                                />
                              </RadioGroup>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {Object.keys(mergeFields).length === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      No field differences detected for merging.
                    </Alert>
                  )}
                </Box>
              )}
              
              {activeTab === 2 && resolution === 'custom' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Custom JSON Editor
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Edit the JSON directly. Be careful to maintain valid JSON format.
                  </Alert>
                  <TextField
                    multiline
                    fullWidth
                    rows={15}
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
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Resolution Preview
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f9f9f9' }}>
                <Typography variant="body2" gutterBottom>
                  Selected strategy: <Chip label={resolution} size="small" color="primary" />
                </Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                  {resolution === 'server' && JSON.stringify(currentConflict.serverData, null, 2)}
                  {resolution === 'local' && JSON.stringify(currentConflict.localData, null, 2)}
                  {resolution === 'merge' && JSON.stringify(getMergedData(), null, 2)}
                  {resolution === 'custom' && (() => {
                    try {
                      return JSON.stringify(JSON.parse(customData), null, 2);
                    } catch (e) {
                      return 'Invalid JSON';
                    }
                  })()}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ) : (
          <Alert severity="info">
            No conflicts to resolve.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button
          startIcon={<HistoryIcon />}
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={loading}
          >
            Back
          </Button>
        )}
        
        {conflicts.length > 0 && (
          <>
            <Button
              variant="outlined"
              onClick={handleResolveAllWithServer}
              disabled={loading || resolvedConflicts.length === conflicts.length}
            >
              Resolve All with Server
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleResolve}
              disabled={loading || (
                resolution === 'custom' && (() => {
                  try {
                    JSON.parse(customData);
                    return false;
                  } catch (e) {
                    return true;
                  }
                })()
              )}
              startIcon={loading ? <CircularProgress size={16} /> : <MergeIcon />}
            >
              {loading ? 'Resolving...' : (
                activeStep === conflicts.length - 1 
                  ? 'Finish Resolution'
                  : 'Resolve & Next'
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedConflictModal;