import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
import AddOnGroup from '@/models/AddOnGroup';
import { roleMiddleware } from '@/lib/auth';

// Get all addons
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const groupId = url.searchParams.get('group');
    
    let query = {};
    if (groupId) {
      // Need to find addons that belong to this group
      const group = await AddOnGroup.findById(groupId);
      if (group && group.addOns && group.addOns.length > 0) {
        query = { _id: { $in: group.addOns } };
      } else {
        // No addons in this group
        return NextResponse.json({
          success: true,
          count: 0,
          data: []
        });
      }
    }
    
    const addons = await AddOn.find(query)
      .sort({ name: 1 })
      .populate('availabilityStatus')
      .populate('dishReference');
    
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
    const addonData = await request.json();
    const { name, price, addonGroupId, dishReference } = addonData;
    
    if (!name || !addonGroupId) {
      return NextResponse.json(
        { success: false, message: 'Addon name and group ID are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if addon group exists
    const addonGroup = await AddOnGroup.findById(addonGroupId);
    
    if (!addonGroup) {
      return NextResponse.json(
        { success: false, message: 'Addon group not found' },
        { status: 404 }
      );
    }
    
    // Create addon data without addonGroupId which is not part of the schema
    const { addonGroupId: _, ...addonToCreate } = addonData;
    
    // Create new addon
    const addon = await AddOn.create(addonToCreate);
    
    // Add addon to group
    await AddOnGroup.findByIdAndUpdate(
      addonGroupId,
      { $push: { addOns: addon._id } }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Addon created successfully',
      data: addon
    });
  } catch (error) {
    console.error('Error creating addon:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create addons
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);