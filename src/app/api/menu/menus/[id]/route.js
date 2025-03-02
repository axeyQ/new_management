// src/app/api/menu/menus/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import MenuPricing from '@/models/MenuPricing';
import { roleMiddleware } from '@/lib/auth';

// Get a specific menu
export const GET = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const menu = await Menu.findById(id)
      .populate({
        path: 'dishPricing',
        populate: {
          path: 'dish',
          select: 'dishName image dieteryTag'
        }
      })
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Update a menu
const updateHandler = async (request, { params }) => {
  try {
    const { id } = params;
    const { name, description, orderMode, isActive, isDefault } = await request.json();
    
    await connectDB();
    
    // Find menu
    let menu = await Menu.findById(id);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Check if name is being changed and if it already exists
    if (name && name !== menu.name) {
      const existingMenu = await Menu.findOne({ name });
      if (existingMenu) {
        return NextResponse.json(
          { success: false, message: 'A menu with this name already exists' },
          { status: 400 }
        );
      }
    }
    
    // Check if order mode is being changed and if it's a direct order mode
    const directOrderModes = ['Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'];
    if (orderMode && orderMode !== menu.orderMode && directOrderModes.includes(orderMode)) {
      const existingDirectMenu = await Menu.findOne({ orderMode });
      if (existingDirectMenu) {
        return NextResponse.json(
          { success: false, message: `Only one menu can be created for ${orderMode} mode` },
          { status: 400 }
        );
      }
    }
    
    // Update fields
    if (name) menu.name = name;
    if (description !== undefined) menu.description = description;
    if (orderMode) menu.orderMode = orderMode;
    if (isActive !== undefined) menu.isActive = isActive;
    
    // Handle default status
    if (isDefault !== undefined) {
      menu.isDefault = isDefault;
      
      // If setting as default, remove default from other menus of same mode
      if (isDefault) {
        await Menu.updateMany(
          { orderMode: menu.orderMode, _id: { $ne: menu._id } },
          { isDefault: false }
        );
      }
    }
    
    menu.updatedBy = request.user._id;
    menu.updatedAt = Date.now();
    
    // Save updated menu
    await menu.save();
    
    return NextResponse.json({
      success: true,
      message: 'Menu updated successfully',
      data: menu
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Delete a menu
const deleteHandler = async (request, { params }) => {
  try {
    const { id } = params;
    await connectDB();
    
    const menu = await Menu.findById(id);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Check if the menu is a direct order mode's only menu
    const directOrderModes = ['Direct Order-TableQR', 'Direct Order-Takeaway', 'Direct Order-Delivery', 'Zomato'];
    if (directOrderModes.includes(menu.orderMode)) {
      return NextResponse.json(
        { success: false, message: `Cannot delete the only menu for ${menu.orderMode} mode. Create another menu for this mode first.` },
        { status: 400 }
      );
    }
    
    // Delete related menu pricing items
    await MenuPricing.deleteMany({ _id: { $in: menu.dishPricing } });
    
    // Delete the menu
    await Menu.findByIdAndDelete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can update or delete menus
export const PUT = roleMiddleware(['admin', 'biller'])(updateHandler);
export const DELETE = roleMiddleware(['admin'])(deleteHandler);