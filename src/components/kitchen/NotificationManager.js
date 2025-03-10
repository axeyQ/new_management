'use client';
import { useEffect, useState } from 'react';
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Badge, 
  Menu, 
  MenuItem, 
  Switch, 
  Typography,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { useSocket } from '@/lib/socketClient';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Handle notification menu open/close
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Toggle sound notifications
  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('kds_sound_enabled', newState ? 'true' : 'false');
  };
  
  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
    handleMenuClose();
  };
  
  // Load sound preference from localStorage
  useEffect(() => {
    const savedSoundPreference = localStorage.getItem('kds_sound_enabled');
    if (savedSoundPreference !== null) {
      setSoundEnabled(savedSoundPreference === 'true');
    }
  }, []);
  
  // Simple version without actual socket functionality for now
  // This prevents build errors while you implement the full socket system
  return (
    <>
      <Box>
        <Tooltip title="Notifications">
          <IconButton color="primary" onClick={handleMenuOpen}>
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        <Tooltip title={soundEnabled ? "Sound On" : "Sound Off"}>
          <IconButton color={soundEnabled ? "primary" : "default"} onClick={handleToggleSound}>
            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 }
        }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">Notifications</Typography>
          <Box>
            <Switch
              size="small"
              checked={soundEnabled}
              onChange={handleToggleSound}
              inputProps={{ 'aria-label': 'Toggle sound' }}
            />
            <Typography variant="caption" sx={{ ml: 1 }}>
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Typography>
          </Box>
        </Box>
        
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No notifications" />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <ListItem key={notification.id} divider>
                <ListItemText
                  primary={notification.message}
                  secondary={notification.timestamp.toLocaleTimeString()}
                />
              </ListItem>
            ))
          )}
        </List>
        
        {notifications.length > 0 && (
          <MenuItem onClick={handleClearAll}>
            <Typography variant="body2" color="primary" sx={{ width: '100%', textAlign: 'center' }}>
              Clear All
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default NotificationManager;