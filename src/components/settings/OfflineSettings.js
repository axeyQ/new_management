import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Divider,
  Alert,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox
} from '@mui/material';
import {
  Storage as StorageIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  CloudDownload as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CloudOff as OfflineIcon,
  DataSaverOn as DataSaverIcon,
  SettingsBackupRestore as RestoreIcon,
  DeleteSweep as ClearIcon,
  Assignment as CategoriesIcon,
  MenuBook as SubcategoriesIcon,
  RadioButtonChecked as DotIcon,
  Restaurant as MenuIcon,
  SyncProblem as SyncProblemIcon
} from '@mui/icons-material';
import * as idb from '@/lib/indexedDBService';
import enhancedAxiosWithAuth from '@/lib/enhancedAxiosWithAuth';
import { useNetwork } from '@/context/NetworkContext';
import toast from 'react-hot-toast';
import { RefreshCwIcon } from 'lucide-react';

const OfflineSettings = () => {
  const [offlineEnabled, setOfflineEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(true);
  const [storageLimitMB, setStorageLimitMB] = useState(50);
  const [currentStorageUsage, setCurrentStorageUsage] = useState({ total: 0, breakdown: {} });
  const [syncPriorities, setSyncPriorities] = useState({
    categories: 10,
    subcategories: 8,
    menus: 6,
    dishes: 5,
    orders: 3
  });
  const [dataRetentionDays, setDataRetentionDays] = useState(30);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { isOnline } = useNetwork();
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
    fetchAvailableCategories();
  }, []);
  
  // Load settings from IndexedDB
  const loadSettings = async () => {
    try {
      // Load offline settings
      const settings = await idb.getMetadata('offlineSettings') || {};
      
      // Apply settings with defaults
      setOfflineEnabled(settings.offlineEnabled !== false); // Default true
      setAutoSyncEnabled(settings.autoSyncEnabled !== false); // Default true
      setBackgroundSyncEnabled(settings.backgroundSyncEnabled !== false); // Default true
      setStorageLimitMB(settings.storageLimitMB || 50);
      setSyncPriorities(settings.syncPriorities || {
        categories: 10,
        subcategories: 8,
        menus: 6,
        dishes: 5,
        orders: 3
      });
      setDataRetentionDays(settings.dataRetentionDays || 30);
      setSelectedCategories(settings.selectedCategories || []);
      
    } catch (error) {
      console.error('Error loading offline settings:', error);
      toast.error('Failed to load offline settings');
    }
  };
  
  // Save settings
  const saveSettings = async () => {
    try {
      // Prepare settings object
      const settings = {
        offlineEnabled,
        autoSyncEnabled,
        backgroundSyncEnabled,
        storageLimitMB,
        syncPriorities,
        dataRetentionDays,
        selectedCategories,
        lastUpdated: new Date().toISOString()
      };
      
      // Save to IndexedDB
      await idb.setMetadata('offlineSettings', settings);
      
      // Apply settings to service worker if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'update_offline_settings',
          settings
        });
      }
      
      toast.success('Offline settings saved successfully');
      
      // If offline is disabled, clear unnecessary data
      if (!offlineEnabled) {
        // Wait a bit to let the toast be visible
        setTimeout(() => {
          handleClearUnnecessaryData();
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving offline settings:', error);
      toast.error('Failed to save offline settings');
    }
  };
  
  // Calculate current storage usage
  const calculateStorageUsage = async () => {
    setLoadingStorage(true);
    try {
      // Calculate size of each store
      const categoriesSize = await getStoreSize(idb.STORES.CATEGORIES);
      const subcategoriesSize = await getStoreSize(idb.STORES.SUBCATEGORIES);
      const pendingOperationsSize = await getStoreSize(idb.STORES.PENDING_OPERATIONS);
      const metaSize = await getStoreSize(idb.STORES.META);
      
      // Calculate total
      const total = categoriesSize + subcategoriesSize + pendingOperationsSize + metaSize;
      
      // Set usage data
      setCurrentStorageUsage({
        total,
        breakdown: {
          categories: categoriesSize,
          subcategories: subcategoriesSize,
          pendingOperations: pendingOperationsSize,
          meta: metaSize
        }
      });
    } catch (error) {
      console.error('Error calculating storage usage:', error);
    } finally {
      setLoadingStorage(false);
    }
  };
  
  // Get size of a specific store in bytes
  const getStoreSize = async (storeName) => {
    try {
      let size = 0;
      
      // Get all items in the store
      const items = await idb.dbOperation(storeName, 'readonly', (transaction, store, resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result);
        };
      });
      
      // Calculate size
      if (items && items.length > 0) {
        // Convert to string and measure
        const jsonString = JSON.stringify(items);
        size = new Blob([jsonString]).size;
      }
      
      return size;
    } catch (error) {
      console.error(`Error getting size for ${storeName}:`, error);
      return 0;
    }
  };
  
  // Format bytes to human-readable size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Fetch available categories
  const fetchAvailableCategories = async () => {
    setLoadingCategories(true);
    try {
      if (isOnline) {
        // Fetch from server if online
        const res = await enhancedAxiosWithAuth.get('/api/menu/categories');
        if (res.data.success) {
          setAvailableCategories(res.data.data);
        }
      } else {
        // Get from IndexedDB if offline
        const categories = await idb.getCategories();
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };
  
  // Handle category selection
  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };
  
  // Reset settings to defaults
  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all offline settings to defaults?')) {
      setOfflineEnabled(true);
      setAutoSyncEnabled(true);
      setBackgroundSyncEnabled(true);
      setStorageLimitMB(50);
      setSyncPriorities({
        categories: 10,
        subcategories: 8,
        menus: 6,
        dishes: 5,
        orders: 3
      });
      setDataRetentionDays(30);
      setSelectedCategories([]);
      
      // Save defaults
      setTimeout(() => {
        saveSettings();
      }, 500);
    }
  };
  
  // Clear unnecessary offline data
  const handleClearUnnecessaryData = async () => {
    try {
      // If offline is disabled, clear everything except pending operations
      if (!offlineEnabled) {
        // Keep pending operations to sync later
        const pendingOps = await idb.getPendingOperations();
        
        // Clear stores
        await idb.dbOperation(idb.STORES.CATEGORIES, 'readwrite', (transaction, store) => {
          store.clear();
        });
        
        await idb.dbOperation(idb.STORES.SUBCATEGORIES, 'readwrite', (transaction, store) => {
          store.clear();
        });
        
        toast.success('Unnecessary offline data cleared');
      } else {
        // If offline is enabled but we have selected categories
        if (selectedCategories.length > 0) {
          // Keep only selected categories
          const allCategories = await idb.getCategories();
          const categoriesToKeep = allCategories.filter(cat => 
            selectedCategories.includes(cat._id)
          );
          
          // Clear and restore only selected
          await idb.dbOperation(idb.STORES.CATEGORIES, 'readwrite', (transaction, store) => {
            store.clear();
            
            // Add back the selected ones
            categoriesToKeep.forEach(category => {
              store.add(category);
            });
          });
          
          // Keep only subcategories of selected categories
          const allSubcategories = await idb.getSubcategories();
          const subcategoriesToKeep = allSubcategories.filter(subcat => {
            const categoryId = typeof subcat.category === 'object' 
              ? subcat.category._id 
              : subcat.category;
            
            return selectedCategories.includes(categoryId);
          });
          
          // Clear and restore only related
          await idb.dbOperation(idb.STORES.SUBCATEGORIES, 'readwrite', (transaction, store) => {
            store.clear();
            
            // Add back the related ones
            subcategoriesToKeep.forEach(subcategory => {
              store.add(subcategory);
            });
          });
          
          toast.success('Cleared data for unselected categories');
        }
      }
      
      // Recalculate storage usage
      calculateStorageUsage();
      
    } catch (error) {
      console.error('Error clearing unnecessary data:', error);
      toast.error('Failed to clear unnecessary data');
    }
  };
  
  // Clear all offline data
  const handleClearAllData = async () => {
    try {
      // Close the dialog
      setClearDataDialogOpen(false);
      
      // First check if there are pending operations
      const pendingOps = await idb.getPendingOperations();
      
      if (pendingOps.length > 0) {
        // Ask for confirmation if there are pending operations
        if (!window.confirm(`There are ${pendingOps.length} pending operations that will be lost. Continue?`)) {
          return;
        }
      }
      
      // Clear all stores
      await idb.dbOperation(idb.STORES.CATEGORIES, 'readwrite', (transaction, store) => {
        store.clear();
      });
      
      await idb.dbOperation(idb.STORES.SUBCATEGORIES, 'readwrite', (transaction, store) => {
        store.clear();
      });
      
      await idb.dbOperation(idb.STORES.PENDING_OPERATIONS, 'readwrite', (transaction, store) => {
        store.clear();
      });
      
      // Keep settings in meta store
      await idb.dbOperation(idb.STORES.META, 'readwrite', (transaction, store) => {
        // Only keep specific settings
        store.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            // Delete everything except settings
            if (cursor.key !== 'offlineSettings') {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      });
      
      toast.success('All offline data cleared successfully');
      
      // Recalculate storage usage
      calculateStorageUsage();
      
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Failed to clear all offline data');
    }
  };
  
  // Selective sync of specific data
  const handleSelectiveSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category to sync');
      return;
    }
    
    try {
      toast.loading('Syncing selected categories...');
      
      // Fetch selected categories
      const categoryPromises = selectedCategories.map(catId => 
        enhancedAxiosWithAuth.get(`/api/menu/categories/${catId}`)
      );
      
      const categoryResponses = await Promise.all(categoryPromises);
      const categoryData = categoryResponses
        .filter(res => res.data.success)
        .map(res => res.data.data);
      
      // Save categories to IndexedDB
      await idb.saveCategories(categoryData);
      
      // Fetch subcategories for selected categories
      const subcategoryPromises = selectedCategories.map(catId =>
        enhancedAxiosWithAuth.get(`/api/menu/subcategories?category=${catId}`)
      );
      
      const subcategoryResponses = await Promise.all(subcategoryPromises);
      let allSubcategories = [];
      
      subcategoryResponses
        .filter(res => res.data.success)
        .forEach(res => {
          allSubcategories = [...allSubcategories, ...res.data.data];
        });
      
      // Save subcategories to IndexedDB
      await idb.saveSubcategories(allSubcategories);
      
      toast.dismiss();
      toast.success(`Synced ${categoryData.length} categories and ${allSubcategories.length} subcategories`);
      
      // Recalculate storage usage
      calculateStorageUsage();
      
    } catch (error) {
      console.error('Error during selective sync:', error);
      toast.dismiss();
      toast.error('Failed to sync selected data');
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Offline Settings</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={handleResetToDefaults}
            sx={{ mr: 2 }}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SyncIcon />}
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </Box>
      </Box>
      
      {/* Main Settings */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>General Offline Settings</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={offlineEnabled}
                  onChange={(e) => setOfflineEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Offline Capabilities"
              sx={{ display: 'block', mb: 2 }}
            />
            
            <Alert severity={offlineEnabled ? 'info' : 'warning'} sx={{ mb: 2 }}>
              {offlineEnabled 
                ? 'Offline capabilities are enabled. The app will work without an internet connection.' 
                : 'Offline capabilities are disabled. The app will require an internet connection to function.'}
            </Alert>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>Synchronization Options</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  color="primary"
                  disabled={!offlineEnabled}
                />
              }
              label="Auto-sync when going back online"
              sx={{ display: 'block', mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={backgroundSyncEnabled}
                  onChange={(e) => setBackgroundSyncEnabled(e.target.checked)}
                  color="primary"
                  disabled={!offlineEnabled}
                />
              }
              label="Enable background synchronization"
              sx={{ display: 'block', mb: 2 }}
            />
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>Data Retention Settings</Typography>
            
            <Typography id="retention-days-slider" gutterBottom>
              Retain offline data for {dataRetentionDays} days
            </Typography>
            <Slider
              value={dataRetentionDays}
              onChange={(e, newValue) => setDataRetentionDays(newValue)}
              aria-labelledby="retention-days-slider"
              valueLabelDisplay="auto"
              step={1}
              marks
              min={1}
              max={90}
              disabled={!offlineEnabled}
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Offline data older than this will be automatically cleared
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Storage Management</Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Current Storage Usage
              </Typography>
              
              {loadingStorage ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 2 }} />
                  <Typography>Calculating storage usage...</Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {formatBytes(currentStorageUsage.total)}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    Breakdown:
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <DotIcon style={{ color: '#3f51b5' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`Categories: ${formatBytes(currentStorageUsage.breakdown.categories || 0)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DotIcon style={{ color: '#f50057' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`Subcategories: ${formatBytes(currentStorageUsage.breakdown.subcategories || 0)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DotIcon style={{ color: '#ff9800' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`Pending Operations: ${formatBytes(currentStorageUsage.breakdown.pendingOperations || 0)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DotIcon style={{ color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`Metadata: ${formatBytes(currentStorageUsage.breakdown.meta || 0)}`}
                      />
                    </ListItem>
                  </List>
                  
                  <Button
                    variant="outlined"
                    startIcon={<RefreshCwIcon />}
                    onClick={calculateStorageUsage}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Refresh
                  </Button>
                </>
              )}
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>Storage Limit</Typography>
            
            <Typography id="storage-limit-slider" gutterBottom>
              Max offline storage: {storageLimitMB} MB
            </Typography>
            <Slider
              value={storageLimitMB}
              onChange={(e, newValue) => setStorageLimitMB(newValue)}
              aria-labelledby="storage-limit-slider"
              valueLabelDisplay="auto"
              step={5}
              marks
              min={10}
              max={200}
              disabled={!offlineEnabled}
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              The app will try to stay under this limit by prioritizing data
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DeleteIcon />}
                onClick={() => handleClearUnnecessaryData()}
                disabled={!offlineEnabled}
              >
                Clear Unnecessary Data
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={() => setClearDataDialogOpen(true)}
              >
                Clear All Offline Data
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Sync Priorities */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Data Sync Priorities</Typography>
            
            <Typography variant="body2" gutterBottom>
              Set the priority for each data type (higher number = higher priority)
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Categories
                    </Typography>
                    <Slider
                      value={syncPriorities.categories}
                      onChange={(e, newValue) => setSyncPriorities({...syncPriorities, categories: newValue})}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!offlineEnabled}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Subcategories
                    </Typography>
                    <Slider
                      value={syncPriorities.subcategories}
                      onChange={(e, newValue) => setSyncPriorities({...syncPriorities, subcategories: newValue})}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!offlineEnabled}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Menus
                    </Typography>
                    <Slider
                      value={syncPriorities.menus}
                      onChange={(e, newValue) => setSyncPriorities({...syncPriorities, menus: newValue})}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!offlineEnabled}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Dishes
                    </Typography>
                    <Slider
                      value={syncPriorities.dishes}
                      onChange={(e, newValue) => setSyncPriorities({...syncPriorities, dishes: newValue})}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!offlineEnabled}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Orders
                    </Typography>
                    <Slider
                      value={syncPriorities.orders}
                      onChange={(e, newValue) => setSyncPriorities({...syncPriorities, orders: newValue})}
                      min={1}
                      max={10}
                      step={1}
                      marks
                      valueLabelDisplay="auto"
                      disabled={!offlineEnabled}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Selective Sync */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Selective Category Sync</Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<SyncIcon />}
                onClick={handleSelectiveSync}
                disabled={!isOnline || selectedCategories.length === 0}
              >
                Sync Selected Now
              </Button>
            </Box>
            
            <Typography variant="body2" gutterBottom>
              Select which categories to keep available offline. Unselected categories will not be stored offline.
            </Typography>
            
            {loadingCategories ? (
              <Box sx={{ display: 'flex', alignItems: 'center', py: 3 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography>Loading categories...</Typography>
              </Box>
            ) : availableCategories.length === 0 ? (
              <Alert severity="info" sx={{ my: 2 }}>
                No categories available. {!isOnline && 'Connect to the internet to fetch categories.'}
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Food Categories ({availableCategories.filter(cat => cat.parentCategory === 'food').length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {availableCategories
                        .filter(cat => cat.parentCategory === 'food')
                        .map(category => (
                          <ListItem key={category._id}>
                            <ListItemIcon>
                              <CategoriesIcon />
                            </ListItemIcon>
                            <ListItemText primary={category.categoryName} />
                            <ListItemSecondaryAction>
                              <Checkbox
                                edge="end"
                                checked={selectedCategories.includes(category._id)}
                                onChange={() => handleCategoryToggle(category._id)}
                                disabled={!offlineEnabled}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
                
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      Beverage Categories ({availableCategories.filter(cat => cat.parentCategory === 'beverage').length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {availableCategories
                        .filter(cat => cat.parentCategory === 'beverage')
                        .map(category => (
                          <ListItem key={category._id}>
                            <ListItemIcon>
                              <CategoriesIcon />
                            </ListItemIcon>
                            <ListItemText primary={category.categoryName} />
                            <ListItemSecondaryAction>
                              <Checkbox
                                edge="end"
                                checked={selectedCategories.includes(category._id)}
                                onChange={() => handleCategoryToggle(category._id)}
                                disabled={!offlineEnabled}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedCategories([])}
                    disabled={selectedCategories.length === 0 || !offlineEnabled}
                  >
                    Unselect All
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={() => setSelectedCategories(availableCategories.map(cat => cat._id))}
                    disabled={selectedCategories.length === availableCategories.length || !offlineEnabled}
                  >
                    Select All
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Clear Data Dialog */}
      <Dialog
        open={clearDataDialogOpen}
        onClose={() => setClearDataDialogOpen(false)}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ClearIcon color="error" sx={{ mr: 1 }} />
            Clear All Offline Data
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear ALL offline data? This includes:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CategoriesIcon />
              </ListItemIcon>
              <ListItemText primary="All cached categories" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SubcategoriesIcon />
              </ListItemIcon>
              <ListItemText primary="All cached subcategories" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SyncProblemIcon />
              </ListItemIcon>
              <ListItemText primary="All pending sync operations" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StorageIcon />
              </ListItemIcon>
              <ListItemText primary="Sync history and logs" />
            </ListItem>
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Your settings will be preserved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDataDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearAllData} color="error" variant="contained">
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfflineSettings;