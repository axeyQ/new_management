// src/components/common/RecoveryPanel.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { ErrorRecoveryUI } from '@/lib/errorRecoverySystem';

const RecoveryPanel = ({ entityType, onRecoveryComplete }) => {
  const [open, setOpen] = useState(false);
  const [recoveryPlans, setRecoveryPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadRecoveryPlans();
  }, []);
  
  const loadRecoveryPlans = async () => {
    const plans = await ErrorRecoveryUI.getRecoveryPlans();
    
    // Filter plans specific to this entity type
    const filteredPlans = Object.values(plans).filter(
      plan => plan.originalOperation.type.includes(entityType.toUpperCase())
    );
    
    setRecoveryPlans(filteredPlans);
    
    // Auto-open if we have plans
    if (filteredPlans.length > 0 && !open) {
      setOpen(true);
    }
  };
  
  const handleRetryAll = async () => {
    setLoading(true);
    
    try {
      // Process each plan
      for (const plan of recoveryPlans) {
        await ErrorRecoveryUI.executeRecovery(plan.operationId);
      }
      
      // Reload plans
      await loadRecoveryPlans();
      
      // Notify parent
      if (onRecoveryComplete) {
        onRecoveryComplete();
      }
    } catch (error) {
      console.error('Error recovering operations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearAll = async () => {
    setLoading(true);
    
    try {
      // Clear each plan
      for (const plan of recoveryPlans) {
        await ErrorRecoveryUI.clearRecoveryPlan(plan.operationId);
      }
      
      // Reload plans
      await loadRecoveryPlans();
    } catch (error) {
      console.error('Error clearing recovery plans:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (recoveryPlans.length === 0) {
    return null;
  }
  
  return (
    <Box sx={{ mb: 3 }}>
      <Button
        onClick={() => setOpen(!open)}
        startIcon={<ErrorIcon color="error" />}
        endIcon={<ExpandMoreIcon />}
        variant="outlined"
        color="error"
        fullWidth
      >
        {recoveryPlans.length} Failed {entityType} Operations
      </Button>
      
      <Collapse in={open}>
        <Box sx={{ mt: 2, p: 2, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            These operations failed to synchronize and require attention
          </Alert>
          
          <List>
            {recoveryPlans.map((plan) => (
              <ListItem 
                key={plan.operationId} 
                divider
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={() => {
                      ErrorRecoveryUI.clearRecoveryPlan(plan.operationId)
                        .then(loadRecoveryPlans);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${plan.originalOperation.type}: ${plan.error.message}`}
                  secondary={`Created: ${new Date(plan.created).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleClearAll}
              disabled={loading}
            >
              Discard All
            </Button>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleRetryAll}
              variant="contained"
              color="primary"
              disabled={loading}
            >
              Retry All
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default RecoveryPanel;