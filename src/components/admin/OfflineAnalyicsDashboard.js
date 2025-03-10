import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Stack,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CloudOff as OfflineIcon,
  Check as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { format, parseISO, subDays } from 'date-fns';
import * as idb from '@/lib/indexedDBService';
import { syncStatus, syncEvents, SYNC_EVENTS } from '@/lib/syncTracker';
import { useNetwork } from '@/context/NetworkContext';

// Color constants
const COLORS = {
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  primary: '#3f51b5',
  secondary: '#9c27b0',
  offline: '#795548',
  online: '#4caf50'
};

const OfflineAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [syncData, setSyncData] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [operationLogs, setOperationLogs] = useState([]);
  const [conflictHistory, setConflictHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offlineStats, setOfflineStats] = useState({
    totalOfflineActions: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    pendingOperations: 0,
    avgSyncDuration: 0,
    totalOfflineTime: 0
  });
  const { isOnline } = useNetwork();
  
  // Load data on mount and when tab changes
  useEffect(() => {
    fetchData();
    
    // Subscribe to sync events
    const startedUnsubscribe = syncEvents.on(
      SYNC_EVENTS.SYNC_STARTED,
      handleSyncStarted
    );
    
    const completedUnsubscribe = syncEvents.on(
      SYNC_EVENTS.SYNC_COMPLETED,
      handleSyncCompleted
    );
    
    const failedUnsubscribe = syncEvents.on(
      SYNC_EVENTS.SYNC_FAILED,
      handleSyncFailed
    );
    
    const progressUnsubscribe = syncEvents.on(
      SYNC_EVENTS.SYNC_PROGRESS,
      handleSyncProgress
    );
    
    // Subscribe to sync status changes
    const subscription = syncStatus.subscribe(status => {
      setSyncData(status);
    });
    
    return () => {
      // Clean up subscriptions
      startedUnsubscribe();
      completedUnsubscribe();
      failedUnsubscribe();
      progressUnsubscribe();
      subscription.unsubscribe();
    };
  }, [activeTab]);
  
  // Event handlers
  const handleSyncStarted = (data) => {
    // Refetch data on sync start
    fetchData();
  };
  
  const handleSyncCompleted = (data) => {
    // Refetch data on sync completion
    fetchData();
  };
  
  const handleSyncFailed = (data) => {
    // Refetch data on sync failure
    fetchData();
  };
  
  const handleSyncProgress = (data) => {
    // No need to refetch data on progress, the subscription will update
  };
  
  // Fetch all the data needed for the dashboard
  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current sync status from the observable
      const currentSyncStatus = syncStatus.getValue();
      setSyncData(currentSyncStatus);
      
      // Get sync history
      const history = await idb.getMetadata('syncHistory') || [];
      setSyncHistory(history);
      
      // Get operation logs
      const logs = await idb.getMetadata('syncOperationLogs') || [];
      setOperationLogs(logs);
      
      // Get conflict history
      const conflicts = await idb.getMetadata('conflictHistory') || [];
      setConflictHistory(conflicts);
      
      // Calculate offline stats
      await calculateOfflineStats(history, logs);
      
    } catch (error) {
      console.error('Error fetching offline analytics data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate offline statistics
  const calculateOfflineStats = async (history, logs) => {
    // Get pending operations count
    const pendingOps = await idb.getPendingOperations();
    
    // Calculate stats
    const stats = {
      totalOfflineActions: logs.length,
      successfulSyncs: history.filter(h => h.failed === 0).length,
      failedSyncs: history.filter(h => h.failed > 0).length,
      pendingOperations: pendingOps.length,
      // Calculate average sync duration in seconds
      avgSyncDuration: history.length > 0 
        ? history.reduce((acc, h) => acc + (h.duration || 0), 0) / history.length / 1000 
        : 0,
      // Calculate total offline time (if available)
      totalOfflineTime: await idb.getMetadata('totalOfflineTime') || 0
    };
    
    setOfflineStats(stats);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Clear all sync history
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all sync history?')) {
      await idb.setMetadata('syncHistory', []);
      await idb.setMetadata('syncOperationLogs', []);
      await idb.setMetadata('conflictHistory', []);
      await fetchData();
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  // Format duration in milliseconds to readable format
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} sec`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };
  
  // Prepare chart data for sync history
  const prepareSyncHistoryChart = () => {
    // Get last 7 days of history
    const last7Days = syncHistory.slice(0, 7).reverse();
    
    return last7Days.map(sync => ({
      date: sync.endTime ? formatDate(sync.endTime).split(',')[0] : 'Unknown',
      successful: sync.completed - sync.failed,
      failed: sync.failed,
      total: sync.total
    }));
  };
  
  // Prepare chart data for operation types
  const prepareOperationTypeChart = () => {
    const typeCounts = {};
    
    operationLogs.forEach(log => {
      const type = log.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return Object.keys(typeCounts).map(type => ({
      name: type,
      value: typeCounts[type]
    }));
  };
  
  // Prepare chart data for offline vs online operations
  const prepareOnlineOfflineChart = () => {
    const offlineCount = operationLogs.filter(log => log.isOffline).length;
    const onlineCount = operationLogs.length - offlineCount;
    
    return [
      { name: 'Offline', value: offlineCount },
      { name: 'Online', value: onlineCount }
    ];
  };
  
  // Export all analytics data as JSON
  const handleExportData = () => {
    const data = {
      syncStatus: syncData,
      syncHistory,
      operationLogs,
      conflictHistory,
      offlineStats,
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `offline-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Refresh data
  const handleRefresh = () => {
    fetchData();
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Offline Analytics Dashboard</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={handleExportData}
            disabled={loading}
          >
            Export Data
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            variant="outlined"
            color="error"
            onClick={handleClearHistory}
            disabled={loading}
          >
            Clear History
          </Button>
        </Stack>
      </Box>
      
      {/* Status Indicators */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Box sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: isOnline ? COLORS.online : COLORS.offline,
              mr: 2
            }} />
            <Typography>
              Status: {isOnline ? 'Online' : 'Offline'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography>
              Pending Operations: {offlineStats.pendingOperations}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography>
              Last Sync: {syncData?.lastSync ? formatDate(syncData.lastSync) : 'Never'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {syncData?.inProgress ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography>Sync in Progress: {Math.round(syncData.progress)}%</Typography>
              </Box>
            ) : (
              <Typography>No Sync in Progress</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Main Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Offline Actions</Typography>
              <Typography variant="h4">{offlineStats.totalOfflineActions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Successful Syncs</Typography>
              <Typography variant="h4">{offlineStats.successfulSyncs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Failed Syncs</Typography>
              <Typography variant="h4">{offlineStats.failedSyncs}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Avg Sync Duration</Typography>
              <Typography variant="h4">{offlineStats.avgSyncDuration.toFixed(2)}s</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Active Sync Progress */}
      {syncData?.inProgress && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Active Sync Progress</Typography>
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={syncData.progress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {syncData.completed} of {syncData.total} operations completed
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {Math.round(syncData.progress)}%
              </Typography>
            </Box>
          </Box>
          
          {syncData.startTime && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Started: {formatDate(syncData.startTime)}
            </Typography>
          )}
          
          {syncData.failed > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {syncData.failed} operations failed during this sync
            </Alert>
          )}
        </Paper>
      )}
      
      {/* Tabs for Different Views */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="analytics tabs">
            <Tab label="Overview" />
            <Tab label="Sync History" />
            <Tab label="Operations" />
            <Tab label="Conflicts" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Sync History Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" gutterBottom>Sync History (Last 7 Days)</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={prepareSyncHistoryChart()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="successful" stackId="a" fill={COLORS.success} name="Successful" />
                      <Bar dataKey="failed" stackId="a" fill={COLORS.error} name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              {/* Operation Types Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" gutterBottom>Operation Types</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={prepareOperationTypeChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareOperationTypeChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[COLORS.primary, COLORS.secondary, COLORS.info, COLORS.warning, COLORS.error][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} operations`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              {/* Online vs Offline Chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" gutterBottom>Online vs Offline Operations</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={prepareOnlineOfflineChart()}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS.offline} />
                        <Cell fill={COLORS.online} />
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [`${value} operations`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              {/* Sync Time Trend */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" gutterBottom>Sync Duration Trend</Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart
                      data={syncHistory.slice(0, 10).map(sync => ({
                        date: sync.endTime ? formatDate(sync.endTime).split(',')[0] : 'Unknown',
                        duration: sync.duration ? sync.duration / 1000 : 0 // Convert to seconds
                      })).reverse()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => [`${value.toFixed(2)} seconds`, 'Duration']} />
                      <Legend />
                      <Line type="monotone" dataKey="duration" stroke={COLORS.primary} name="Sync Duration" />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Sync History Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Sync History</Typography>
            
            {syncHistory.length === 0 ? (
              <Alert severity="info">No sync history available.</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Total Operations</TableCell>
                      <TableCell>Completed</TableCell>
                      <TableCell>Failed</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {syncHistory.map((sync, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(sync.endTime || sync.startTime)}</TableCell>
                        <TableCell>{sync.total}</TableCell>
                        <TableCell>{sync.completed}</TableCell>
                        <TableCell>{sync.failed}</TableCell>
                        <TableCell>{formatDuration(sync.duration)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={sync.failed > 0 ? 'Failed' : 'Success'} 
                            color={sync.failed > 0 ? 'error' : 'success'} 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
        
        {/* Operations Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Operation Logs</Typography>
            
            {operationLogs.length === 0 ? (
              <Alert severity="info">No operation logs available.</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Operation Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operationLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>{log.type || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.success ? 'Success' : 'Failed'} 
                            color={log.success ? 'success' : 'error'} 
                            size="small"
                            icon={log.success ? <SuccessIcon /> : <ErrorIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          {log.error ? (
                            <Tooltip title={log.error.message || 'Unknown error'}>
                              <InfoIcon color="error" fontSize="small" />
                            </Tooltip>
                          ) : log.url ? (
                            <Tooltip title={log.url}>
                              <InfoIcon color="info" fontSize="small" />
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
        
        {/* Conflicts Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Conflict History</Typography>
            
            {conflictHistory.length === 0 ? (
              <Alert severity="info">No conflict history available.</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Resolution</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conflictHistory.map((conflict, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(conflict.timestamp)}</TableCell>
                        <TableCell>{conflict.type}</TableCell>
                        <TableCell>{conflict.itemName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={conflict.resolution} 
                            color={
                              conflict.resolution === 'server' ? 'primary' :
                              conflict.resolution === 'local' ? 'secondary' :
                              conflict.resolution === 'merge' ? 'info' : 'default'
                            } 
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default OfflineAnalyticsDashboard;