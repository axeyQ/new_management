// src/app/api/menu/addons/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
import AddOnGroup from '@/models/AddOnGroup';
import { roleMiddleware } from '@/lib/auth';
import Dish from '@/models/Dish';

// Get all addons
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const groupId = url.searchParams.get('group');
    
    let addons = [];
    
    if (groupId) {
      // Find the group and get its addons
      const group = await AddOnGroup.findById(groupId).populate('addOns');
      if (group && group.addOns) {
        addons = group.addOns;
      }
    } else {
      // Get all addons
      addons = await AddOn.find({})
        .sort({ name: 1 })
        .populate('availabilityStatus')
        .populate('dishReference');
    }
    
    return NextResponse.json({
      success: true,
      count: addons.length,
      data: addons
    });
  } catch (error) {
    console.error('Error fetching addons:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new addon
const createHandler = async (request) => {
  try {
    const { name, price, addonGroupId, availabilityStatus, dishReference } = await request.json();
    
    if (!dishReference || !addonGroupId) {
      return NextResponse.json(
        { success: false, message: 'Dish reference and add-on group are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if addon group exists
    const addonGroup = await AddOnGroup.findById(addonGroupId);
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Add-on group not found' },
        { status: 404 }
      );
    }
    
    // Check if the dish exists
    const dish = await Dish.findById(dishReference);
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Referenced dish not found' },
        { status: 404 }
      );
    }
    
    // Create new addon
    const addon = await AddOn.create({
      name: name || dish.dishName,
      price: price || 0,
      // Pass as Boolean, not ObjectId
      availabilityStatus: availabilityStatus === true || availabilityStatus === 'true', 
      dishReference
    });
    
    // Add addon to group
    addonGroup.addOns.push(addon._id);
    await addonGroup.save();
    
    return NextResponse.json({
      success: true,
      message: 'Add-on created successfully',
      data: addon
    });
  } catch (error) {
    console.error('Error creating addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only admins and billers can create addons
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);