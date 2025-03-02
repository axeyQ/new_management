// src/lib/kdsUtils.js

import { formatDistanceToNow } from 'date-fns';

// Order modes
export const ORDER_MODES = [
  { id: 'all', label: 'All Orders' },
  { id: 'Dine-in', label: 'Dine-in' },
  { id: 'Takeaway', label: 'Takeaway' },
  { id: 'Delivery', label: 'Delivery' },
  { id: 'Direct Order-TableQR', label: 'QR Order' },
  { id: 'Zomato', label: 'Zomato' }
];

// Kitchen stations
export const KITCHEN_STATIONS = [
  { id: 'grill', label: 'Grill Station', color: '#e53935' },
  { id: 'fry', label: 'Fry Station', color: '#ff9800' },
  { id: 'salad', label: 'Salad Station', color: '#4caf50' },
  { id: 'dessert', label: 'Dessert Station', color: '#9c27b0' },
  { id: 'bar', label: 'Bar', color: '#2196f3' }
];

/**
 * Get color for a kitchen station
 * @param {string} stationId - Station identifier
 * @returns {string} - Color code
 */
export function getStationColor(stationId) {
  const station = KITCHEN_STATIONS.find(s => s.id === stationId);
  return station ? station.color : '#757575';
}

/**
 * Get human-readable name for a station
 * @param {string} stationId - Station identifier
 * @returns {string} - Station label
 */
export function getStationLabel(stationId) {
  const station = KITCHEN_STATIONS.find(s => s.id === stationId);
  return station ? station.label : 'Unknown Station';
}

/**
 * Get appropriate order mode label
 * @param {string} modeId - Order mode identifier
 * @returns {string} - Display label
 */
export function getOrderModeLabel(modeId) {
  const mode = ORDER_MODES.find(m => m.id === modeId);
  return mode ? mode.label : modeId;
}

/**
 * Assign a dish to a kitchen station based on its properties
 * @param {object} dish - Dish object
 * @returns {string} - Station identifier
 */
export function assignDishToStation(dish) {
  if (!dish) return 'grill'; // Default
  
  const dishName = (dish.dishName || '').toLowerCase();
  const dishTag = (dish.dieteryTag || '').toLowerCase();
  
  if (dishName.includes('salad') || dishTag === 'veg') {
    return 'salad';
  } else if (dishName.includes('dessert') || dishName.includes('sweet')) {
    return 'dessert';
  } else if (dishName.includes('fry') || dishName.includes('fried')) {
    return 'fry';
  } else if (dishName.includes('drink') || dishName.includes('beverage')) {
    return 'bar';
  }
  
  return 'grill'; // Default
}

/**
 * Get color for order status
 * @param {string} status - Order status
 * @returns {string} - Color identifier for MUI components
 */
export function getStatusColor(status) {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'preparing':
      return 'info';
    case 'ready':
      return 'success';
    case 'served':
      return 'primary';
    case 'completed':
      return 'default';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Format elapsed time in a human-readable format
 * @param {string|Date} date - Date to calculate elapsed time from
 * @returns {string} - Formatted time string
 */
export function formatElapsedTime(date) {
  if (!date) return 'N/A';
  
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown';
  }
}

/**
 * Get next status in the order workflow
 * @param {string} currentStatus - Current order status
 * @returns {string|null} - Next status or null if at end of workflow
 */
export function getNextStatus(currentStatus) {
  switch (currentStatus) {
    case 'pending':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'served';
    case 'served':
      return 'completed';
    default:
      return null;
  }
}

/**
 * Get button text based on current status
 * @param {string} status - Current order status
 * @returns {string} - Button text
 */
export function getStatusActionText(status) {
  switch (status) {
    case 'pending':
      return 'Start Cooking';
    case 'preparing':
      return 'Mark as Ready';
    case 'ready':
      return 'Serve Order';
    case 'served':
      return 'Complete';
    default:
      return 'Update Status';
  }
}

/**
 * Get time-based urgency for an order
 * @param {string|Date} date - Order date
 * @param {object} thresholds - Time thresholds in minutes
 * @returns {string} - Urgency level (normal, warning, urgent)
 */
export function getOrderUrgency(date, thresholds = { warning: 10, urgent: 20 }) {
  if (!date) return 'normal';
  
  const elapsedMinutes = Math.floor((new Date() - new Date(date)) / (1000 * 60));
  
  if (elapsedMinutes >= thresholds.urgent) {
    return 'urgent';
  } else if (elapsedMinutes >= thresholds.warning) {
    return 'warning';
  }
  
  return 'normal';
}

/**
 * Get color based on order urgency
 * @param {string} urgency - Urgency level
 * @returns {string} - Color identifier for MUI components
 */
export function getUrgencyColor(urgency) {
  switch (urgency) {
    case 'urgent':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'success';
  }
}