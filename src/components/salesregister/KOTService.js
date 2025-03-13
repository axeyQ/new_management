// src/components/salesregister/KOTService.js
'use client';
import axiosWithAuth from '@/lib/axiosWithAuth';

/**
* Service class for managing KOT (Kitchen Order Ticket) operations
*/
export default class KOTService {
  /**
  * Generate a KOT from the current order state
  * If order doesn't exist yet, it creates the order first
  *
  * @param {Object} orderData - The current order data
  * @param {Boolean} isNewOrder - Whether this is a new order or adding to existing
  * @returns {Promise<Object>} The created KOT data
  */
  static async generateKOT(orderData, isNewOrder = true) {
    let orderId;
    let orderStatus = 'pending';
    
    // Log for debug purposes
    console.log(`Generating KOT: isNewOrder=${isNewOrder}, existingID=${orderData._id || 'none'}, tableId=${orderData.table || 'none'}`);
    
    // IMPORTANT: Clean the orderData by removing custom _id fields from itemsSold
    // This prevents the MongoDB ObjectId casting error
    const cleanedOrderData = { ...orderData };
    
    if (cleanedOrderData.itemsSold && Array.isArray(cleanedOrderData.itemsSold)) {
      cleanedOrderData.itemsSold = cleanedOrderData.itemsSold.map(item => {
        // Create a new item object without the _id field
        const { _id, ...itemWithoutId } = item;
        
        // Save any other identification info we need
        const cleanItem = {
          ...itemWithoutId,
          clientItemId: _id // Store the client ID in a different field if needed
        };
        
        return cleanItem;
      });
    }
    
    // If this is a new order, create it first
    if (isNewOrder && !cleanedOrderData._id) {
      // Set order status to pending
      const orderToCreate = {
        ...cleanedOrderData,
        orderStatus: orderStatus
      };
      
      // Create the order in database
      try {
        console.log("Creating new order with data:", orderToCreate);
        const orderRes = await axiosWithAuth.post('/api/orders', orderToCreate);
        if (!orderRes.data.success) {
          throw new Error(orderRes.data.message || 'Failed to create order');
        }
        orderId = orderRes.data.data._id;
        console.log(`New order created, ID: ${orderId}`);
      } catch (error) {
        console.error('Error creating order:', error);
        // Include specific error details
        const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
        throw new Error(`Failed to create order: ${errorDetails}`);
      }
    } else if (cleanedOrderData._id) {
      // Use existing order ID and ensure its status is at least 'pending'
      orderId = cleanedOrderData._id;
      console.log(`Using existing order ID: ${orderId}`);
      try {
        // First fetch the current order to make sure it exists and get its current items
        console.log(`Fetching order details for ID: ${orderId}`);
        const orderRes = await axiosWithAuth.get(`/api/orders/${orderId}`);
        if (!orderRes.data.success) {
          throw new Error('Failed to fetch order details');
        }
        const currentOrder = orderRes.data.data;
        if (!currentOrder) {
          throw new Error(`Order not found with ID: ${orderId}`);
        }
        
        // Get current status and all existing items
        const currentStatus = currentOrder.orderStatus || 'pending';
        console.log(`Current order status: ${currentStatus}`);
        
        // CRITICAL FIX: Merge existing items with new KOT items to ensure all items are preserved
        const existingItems = currentOrder.itemsSold || [];
        const newKotItems = cleanedOrderData.itemsSold || [];
        
        // Create a full order update with ALL items (existing plus new)
        const updatedOrderData = {
          ...cleanedOrderData,
          _id: orderId,
          orderStatus: currentStatus, // Preserve the current status
          itemsSold: [
            ...existingItems, // All existing items
            ...newKotItems // Plus the new items to be sent to the kitchen
          ]
        };
        
        // Remove any duplicate items (same dish, variant, and notes)
        updatedOrderData.itemsSold = this.removeDuplicateItems(updatedOrderData.itemsSold);
        console.log(`Updating order with total of ${updatedOrderData.itemsSold.length} items`);
        
        // Update the order with the complete set of items
        await axiosWithAuth.put(`/api/orders/${orderId}`, updatedOrderData);
        
        // Preserve orderStatus from the current status
        orderStatus = currentStatus;
      } catch (error) {
        console.error('Error checking/updating order status:', error);
        // Instead of silently continuing, throw an error for better debugging
        // but only if the error seems serious (like order not found)
        if (error.message?.includes('not found') || error.response?.status === 404) {
          throw error;
        }
        // For other errors, continue with KOT creation
        console.warn('Continuing with KOT creation despite order update error');
      }
    } else {
      throw new Error('No order ID provided and not creating a new order');
    }
    
    // Create KOT items from order items
    const kotItems = cleanedOrderData.itemsSold.map(item => ({
      dish: item.dish,
      dishName: item.dishName,
      variant: item.variant || null,
      variantName: item.variantName || '',
      quantity: item.quantity,
      addOns: item.addOns || [],
      notes: item.notes || ''
    }));
    
    // Generate temporary identifiers
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-6);
    const randomToken = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    
    // Create KOT data
    const kotData = {
      salesOrder: orderId,
      items: kotItems,
      orderMode: cleanedOrderData.orderMode,
      table: cleanedOrderData.table,
      customer: {
        name: cleanedOrderData.customer.name || 'Guest',
        phone: cleanedOrderData.customer.phone || '0000000000'
      },
      kotStatus: 'pending',
      // Required fields for KOT
      kotTokenNum: randomToken.toString(),
      refNum: cleanedOrderData.refNum || `REF-${dateStr}-${timeStr}`,
      kotFinalId: `KF-${dateStr}-${randomToken}`,
      kotInvoiceId: `KOT-${dateStr}-${randomToken}`
    };
    
    // Send KOT to server
    try {
      console.log("Sending KOT to server:", kotData);
      const response = await axiosWithAuth.post('/api/orders/kot', kotData);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create KOT');
      }
      console.log("KOT created successfully:", response.data);
      
      // After successful KOT generation, ensure order is up to date
      try {
        // Fetch the complete order to make sure we have the latest state
        const refreshedOrderRes = await axiosWithAuth.get(`/api/orders/${orderId}`);
        if (refreshedOrderRes.data.success) {
          // No further action needed - order should now contain all items
          console.log("Order refresh successful after KOT generation");
        }
      } catch (error) {
        console.warn("Could not refresh order after KOT generation:", error);
      }
      return response.data;
    } catch (error) {
      console.error('Error creating KOT:', error);
      // Include specific error details
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to create KOT: ${errorDetails}`);
    }
  }
  
  /**
  * Helper function to remove duplicate items
  *
  * @param {Array} items - Array of order items
  * @returns {Array} Deduplicated items array
  */
  static removeDuplicateItems(items) {
    const uniqueItems = [];
    const seen = new Set();
    items.forEach(item => {
      // Create a unique key for each item based on dish, variant and notes
      const itemKey = `${item.dish}-${item.variant || 'novariant'}-${item.notes || ''}`;
      
      // If we haven't seen this exact item before, add it to the results
      if (!seen.has(itemKey)) {
        seen.add(itemKey);
        uniqueItems.push(item);
      } else {
        // If we've seen this item before, find it and increase the quantity
        const existingItem = uniqueItems.find(ui => {
          const uiKey = `${ui.dish}-${ui.variant || 'novariant'}-${ui.notes || ''}`;
          return uiKey === itemKey;
        });
        if (existingItem) {
          existingItem.quantity += item.quantity;
        }
      }
    });
    return uniqueItems;
  }
  
  /**
  * Print a KOT
  * @param {Object} kot - The KOT to print
  * @returns {Promise<Object>} The updated KOT
  */
  static async printKOT(kot) {
    try {
      // Update KOT as printed
      const response = await axiosWithAuth.put(`/api/orders/kot/${kot._id}`, {
        printed: true,
        printerId: 'main-kitchen'
      });
      
      // Open print view
      window.open(`/print/kot/${kot._id}`, '_blank');
      return response.data;
    } catch (error) {
      console.error('Error printing KOT:', error);
      // Include specific error details
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to print KOT: ${errorDetails}`);
    }
  }
  
  /**
  * Fetch KOTs for a specific order or table
  * @param {string} orderId - The order ID (optional)
  * @param {string} tableId - The table ID (optional)
  * @returns {Promise<Array>} The KOTs for the order/table
  */
  static async fetchKOTs(orderId = null, tableId = null) {
    try {
      let url = '/api/orders/kot?';
      if (orderId) {
        url += `orderId=${orderId}`;
      } else if (tableId) {
        url += `tableId=${tableId}`;
      } else {
        return [];
      }
      const response = await axiosWithAuth.get(url);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching KOTs:', error);
      // Include specific error details
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to fetch KOTs: ${errorDetails}`);
    }
  }
  
  /**
  * Update KOT status
  * @param {string} kotId - The KOT ID
  * @param {string} status - The new status
  * @returns {Promise<Object>} The updated KOT
  */
  static async updateKOTStatus(kotId, status) {
    try {
      const response = await axiosWithAuth.put(`/api/orders/kot/${kotId}`, {
        kotStatus: status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating KOT status:', error);
      // Include specific error details
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to update KOT status: ${errorDetails}`);
    }
  }
  
  /**
  * Find existing order by table ID
  * @param {string} tableId - The table ID
  * @returns {Promise<Object|null>} The existing order or null
  */
  static async findOrderByTable(tableId) {
    if (!tableId) return null;
    try {
      console.log(`Looking for existing orders for table: ${tableId}`);
      // Changed to search for all active statuses, not just "pending"
      const response = await axiosWithAuth.get(`/api/orders?table=${tableId}&status=pending,preparing,ready,served`);
      if (response.data.success && response.data.data.length > 0) {
        // Sort orders to get the most recent
        const sortedOrders = response.data.data.sort((a, b) =>
          new Date(b.createdAt || b.orderDateTime) - new Date(a.createdAt || a.orderDateTime)
        );
        console.log(`Found ${sortedOrders.length} orders, using most recent`);
        // Return the most recent order for this table
        return sortedOrders[0];
      }
      console.log('No existing orders found for this table');
      return null;
    } catch (error) {
      console.error('Error finding order by table:', error);
      // Include specific error details in the log but don't throw
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Error details: ${errorDetails}`);
      return null;
    }
  }
  
  /**
  * Synchronize an order with all its KOT items
  * @param {string} orderId - The order ID
  * @returns {Promise<Object>} The updated order
  */
  static async syncOrderWithKOTs(orderId) {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    try {
      // Call the sync API endpoint
      const response = await axiosWithAuth.post(`/api/orders/${orderId}/sync-kots`);
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to sync order with KOTs');
      }
      return response.data;
    } catch (error) {
      console.error('Error synchronizing order with KOTs:', error);
      const errorDetails = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`Failed to sync KOTs: ${errorDetails}`);
    }
  }
}