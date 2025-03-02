// src/app/api/kds/metrics/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import SalesOrder from '@/models/SalesOrder';
import { authMiddleware } from '@/lib/auth';

export const GET = authMiddleware(async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || 'today';
    
    // Calculate date range based on timeRange
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Count active orders
    const activeOrders = await KOT.countDocuments({
      kotStatus: { $in: ['pending', 'preparing'] }
    });
    
    const pendingOrders = await KOT.countDocuments({
      kotStatus: 'pending'
    });
    
    const completedOrders = await KOT.countDocuments({
      kotStatus: { $in: ['ready', 'completed', 'served'] },
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Query for KOTs within date range with preparation times
    const kots = await KOT.find({
      createdAt: { $gte: startDate, $lte: endDate },
      preparationStartTime: { $exists: true }
    });
    
    // Calculate average preparation time
    let totalPrepTime = 0;
    let prepOrderCount = 0;
    
    kots.forEach(kot => {
      // Only count KOTs that have started preparation
      if (kot.preparationStartTime) {
        const endTime = kot.completionTime || new Date(); // Use current time if not completed
        const prepTimeMinutes = Math.round(
          (new Date(endTime) - new Date(kot.preparationStartTime)) / (60 * 1000)
        );
        totalPrepTime += prepTimeMinutes;
        prepOrderCount++;
      }
    });
    
    const avgPrepTime = prepOrderCount > 0 ? Math.round(totalPrepTime / prepOrderCount) : 0;
    
    // Station metrics - assign items to stations and calculate metrics
    const stationData = {
      'grill': { count: 0, totalTime: 0, completedCount: 0 },
      'fry': { count: 0, totalTime: 0, completedCount: 0 },
      'salad': { count: 0, totalTime: 0, completedCount: 0 },
      'dessert': { count: 0, totalTime: 0, completedCount: 0 },
      'bar': { count: 0, totalTime: 0, completedCount: 0 }
    };
    
    // Process KOTs to get station data
    kots.forEach(kot => {
      // For each item, assign to a station based on dish name or type
      kot.items.forEach(item => {
        let station = 'grill'; // Default
        const itemName = (item.dishName || '').toLowerCase();
        
        // Simple station assignment logic
        if (itemName.includes('salad') || itemName.includes('veg')) {
          station = 'salad';
        } else if (itemName.includes('dessert') || itemName.includes('sweet')) {
          station = 'dessert'; 
        } else if (itemName.includes('fry') || itemName.includes('fried')) {
          station = 'fry';
        } else if (itemName.includes('drink') || itemName.includes('beverage')) {
          station = 'bar';
        }
        
        // Count items by station
        stationData[station].count += item.quantity || 1;
        
        // Calculate prep time if KOT is completed
        if (kot.preparationStartTime && kot.completionTime) {
          const prepTimeMinutes = Math.round(
            (new Date(kot.completionTime) - new Date(kot.preparationStartTime)) / (60 * 1000)
          );
          stationData[station].totalTime += prepTimeMinutes;
          stationData[station].completedCount++;
        }
      });
    });
    
    // Calculate final station metrics
    const stationMetrics = {};
    Object.entries(stationData).forEach(([station, data]) => {
      stationMetrics[station] = {
        count: data.count,
        avgTime: data.completedCount > 0 ? Math.round(data.totalTime / data.completedCount) : 0
      };
    });
    
    // Get order mode metrics
    const orderModes = ['Dine-in', 'Takeaway', 'Delivery', 'Direct Order-TableQR', 'Zomato'];
    const orderModeData = {};
    
    // Initialize order mode data
    orderModes.forEach(mode => {
      orderModeData[mode] = { count: 0, totalTime: 0, completedCount: 0 };
    });
    
    // Get all KOTs with populated sales order
    const kotsWithOrders = await KOT.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('salesOrder', 'orderMode');
    
    // Process order mode data
    kotsWithOrders.forEach(kot => {
      if (kot.salesOrder && kot.salesOrder.orderMode) {
        const mode = kot.salesOrder.orderMode;
        
        // Only process if it's a known order mode
        if (orderModeData[mode]) {
          orderModeData[mode].count += 1;
          
          // Calculate prep time if KOT is completed
          if (kot.preparationStartTime && kot.completionTime) {
            const prepTimeMinutes = Math.round(
              (new Date(kot.completionTime) - new Date(kot.preparationStartTime)) / (60 * 1000)
            );
            orderModeData[mode].totalTime += prepTimeMinutes;
            orderModeData[mode].completedCount++;
          }
        }
      }
    });
    
    // Calculate final order mode metrics
    const orderModeMetrics = {};
    Object.entries(orderModeData).forEach(([mode, data]) => {
      orderModeMetrics[mode] = {
        count: data.count,
        avgTime: data.completedCount > 0 ? Math.round(data.totalTime / data.completedCount) : 0
      };
    });
    
    // Prepare metrics response
    const metrics = {
      activeOrders,
      pendingOrders,
      completedOrders,
      avgPrepTime,
      stationMetrics,
      orderModeMetrics
    };
    
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching kitchen metrics:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
});