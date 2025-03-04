// src/app/api/menu/menus/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import { roleMiddleware } from '@/lib/auth';

// Get all menus with optional mode filtering
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode');
    const strictMode = url.searchParams.get('strictMode') === 'true';
    
    // Build query
    let query = {};
    if (mode) {
      if (strictMode) {
        // Only exact matches for this mode
        query.orderMode = mode;
      } else {
        // Also include menus valid for all modes (if you have such a concept)
        query.orderMode = mode;
      }
    }
    
    const menus = await Menu.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    return NextResponse.json({
      success: true,
      count: menus.length,
      data: menus
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new menu
const createHandler = async (request) => {
  try {
    const { name, description, orderMode, isActive, isDefault } = await request.json();
    
    if (!name || !orderMode) {
      return NextResponse.json(
        { success: false, message: 'Menu name and order mode are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if menu with same name already exists
    const existingMenu = await Menu.findOne({ name });
    if (existingMenu) {
      return NextResponse.json(
        { success: false, message: 'A menu with this name already exists' },
        { status: 400 }
      );
    }
    
    // Create new menu
    const menu = await Menu.create({
      name,
      description: description || '',
      orderMode,
      isActive: isActive !== undefined ? isActive : true,
      isDefault: isDefault !== undefined ? isDefault : false,
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    // If this menu is set as default, remove default from other menus of same mode
    if (menu.isDefault) {
      await Menu.updateMany(
        { orderMode: menu.orderMode, _id: { $ne: menu._id } },
        { isDefault: false }
      );
    }
    
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