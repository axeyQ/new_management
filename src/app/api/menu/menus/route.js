// src/app/api/menu/menus/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import { authMiddleware, roleMiddleware } from '@/lib/auth';

// Get all menus with optional filtering by order mode
export const GET = authMiddleware(async (request) => {
  console.log("Menu API endpoint called");
  try {
      console.log("Connecting to database...");
      await connectDB();
      console.log("Connected to database successfully");
      
      // Log the request URL and query parameters
      const url = new URL(request.url);
      console.log("Request URL:", request.url);
      console.log("All query parameters:", Object.fromEntries(url.searchParams));
      
      const mode = url.searchParams.get('mode');
      const strictMode = url.searchParams.get('strictMode') === 'true';
      
      console.log("Mode parameter:", mode);
      console.log("StrictMode parameter:", strictMode);
      
      // Build query
      let query = { isActive: true };
      
      // Filter by order mode if specified
      if (mode && strictMode) {
          console.log(`Applying strict filtering for order mode: ${mode}`);
          query.orderMode = mode;
      } else if (mode) {
          console.log(`Applying standard filtering for order mode: ${mode}`);
          query.orderMode = mode;
      }
      
      console.log("MongoDB query:", JSON.stringify(query));
      
      // First, log all menus to see what exists
      const allMenus = await Menu.find({ isActive: true });
      console.log(`Total active menus in database: ${allMenus.length}`);
      console.log("All menu order modes:", allMenus.map(m => ({
          id: m._id,
          name: m.name,
          orderMode: m.orderMode
      })));
      
      // Now run the actual query
      const menus = await Menu.find(query)
          .sort({ name: 1 })
          .populate('createdBy', 'username')
          .populate('updatedBy', 'username');
      
      console.log(`Filtered menus found: ${menus.length}`);
      console.log("Filtered menu details:", menus.map(m => ({
          id: m._id,
          name: m.name,
          orderMode: m.orderMode
      })));
      
      return NextResponse.json({
          success: true,
          count: menus.length,
          data: menus
      });
  } catch (error) {
      console.error('Error fetching menus:', error);
      return NextResponse.json(
          { success: false, message: 'Server error: ' + error.message },
          { status: 500 }
      );
  }
});

// Create a new menu
const createHandler = async (request) => {
    try {
        const {
            name,
            description,
            orderMode,
            isDefault,
            availableFrom,
            availableTo
        } = await request.json();
        
        if (!name || !orderMode) {
            return NextResponse.json(
                { success: false, message: 'Menu name and order mode are required' },
                { status: 400 }
            );
        }
        
        await connectDB();
        
        // If this menu is default, unset default flag for other menus with the same order mode
        if (isDefault) {
            await Menu.updateMany(
                { orderMode, isDefault: true },
                { isDefault: false }
            );
        }
        
        // Create new menu
        const menu = await Menu.create({
            name,
            description: description || '',
            orderMode,
            isDefault: isDefault || false,
            availableFrom: availableFrom || null,
            availableTo: availableTo || null,
            createdBy: request.user._id,
            updatedBy: request.user._id
        });
        
        return NextResponse.json({
            success: true,
            message: 'Menu created successfully',
            data: menu
        });
    } catch (error) {
        console.error('Error creating menu:', error);
        return NextResponse.json(
            { success: false, message: 'Server error: ' + error.message },
            { status: 500 }
        );
    }
};

// Only admins and billers can create menus
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);