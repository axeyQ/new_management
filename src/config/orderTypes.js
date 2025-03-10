// src/config/orderTypes.js
// Text-based approach with no external icon dependencies

// Define all order types with their labels, colors, and emoji
export const ORDER_TYPES = [
    { id: 'all', label: 'All Orders', emoji: '📋', color: 'default' },
    { id: 'Dine-in', label: 'Dine-in', emoji: '🍽️', color: 'primary' },
    { id: 'Takeaway', label: 'Takeaway', emoji: '🥡', color: 'secondary' },
    { id: 'Delivery', label: 'Delivery', emoji: '🚚', color: 'info' },
    { id: 'Direct Order-TableQR', label: 'QR Orders', emoji: '📱', color: 'success' },
    { id: 'Direct Order-Takeaway', label: 'Direct Takeaway', emoji: '🛍️', color: 'warning' },
    { id: 'Direct Order-Delivery', label: 'Direct Delivery', emoji: '🏍️', color: 'error' },
    { id: 'Zomato', label: 'Zomato', emoji: '🍲', color: 'default' }
  ];
  
  // Helper function to get order type details by id
  export const getOrderTypeDetails = (orderTypeId) => {
    return ORDER_TYPES.find(type => type.id === orderTypeId) || 
           { id: orderTypeId, label: orderTypeId, emoji: '❓', color: 'default' };
  };
  
  // Helper function to get status color for consistent styling
  export const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'preparing': return 'info';
      case 'ready': return 'success';
      case 'served': return 'primary';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };
  
  // Get emoji for a specific order type
  export const getOrderTypeEmoji = (orderTypeId) => {
    const orderType = ORDER_TYPES.find(type => type.id === orderTypeId);
    return orderType ? orderType.emoji : '❓';
  };
  
  // Helper function for mapping KOT status to human-readable labels
  export const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'served': 'Served',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    
    return statusMap[status] || status;
  };
  
  // Map status to emoji
  export const getStatusEmoji = (status) => {
    const statusEmojiMap = {
      'pending': '⏳',
      'preparing': '👨‍🍳',
      'ready': '✅',
      'served': '🍽️',
      'completed': '🎉',
      'cancelled': '❌'
    };
    
    return statusEmojiMap[status] || '❓';
  };