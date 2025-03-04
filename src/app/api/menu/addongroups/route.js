import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOnGroup from '@/models/AddOnGroup';
import AddOn from '@/models/AddOn'; 
import { authMiddleware, roleMiddleware } from '@/lib/auth';
import { getStatusIdFromBoolean } from '@/utils/statusHelper';

// Get all addon groups
export const GET = async (request) => {
  try {
    await connectDB();
    const addonGroups = await AddOnGroup.find({})
      .sort({ name: 1 })
      .populate('addOns')
      .populate('availabilityStatus');
    return NextResponse.json({
      success: true,
      count: addonGroups.length,
      data: addonGroups
    });
  } catch (error) {
    console.error('Error fetching addon groups:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new addon group
const createHandler = async (request) => {
  try {
    const { 
      name, 
      availabilityStatus, // This will be a boolean from the form
      isCompulsory, 
      minSelection, 
      maxSelection,
      allowMultiple,
      maxQuantityPerItem 
    } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Addon group name is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if addon group already exists
    const existingGroup = await AddOnGroup.findOne({ name });
    if (existingGroup) {
      return NextResponse.json(
        { success: false, message: 'Addon group already exists' },
        { status: 400 }
      );
    }
    
    // Convert boolean to Status ObjectId
    const statusId = await getStatusIdFromBoolean(availabilityStatus !== false);
    
    // Create new addon group with the new fields
    const addonGroup = await AddOnGroup.create({
      name,
      availabilityStatus: statusId, // Use the ObjectId
      isCompulsory: isCompulsory !== undefined ? isCompulsory : false,
      minSelection: minSelection !== undefined ? minSelection : 0,
      maxSelection: maxSelection !== undefined ? maxSelection : 0,
      allowMultiple: allowMultiple !== undefined ? allowMultiple : false,
      maxQuantityPerItem: maxQuantityPerItem !== undefined ? maxQuantityPerItem : 1,
      createdBy: request.user._id,
      updatedBy: request.user._id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Addon group created successfully',
      data: addonGroup
    });
  } catch (error) {
    console.error('Error creating addon group:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only admins and billers can create addon groups
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);