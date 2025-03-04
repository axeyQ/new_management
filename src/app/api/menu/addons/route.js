// src/app/api/menu/addons/route.js - Updated to support custom add-ons
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOn from '@/models/AddOn';
import AddOnGroup from '@/models/AddOnGroup';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import { roleMiddleware } from '@/lib/auth';

// Get all addons
export const GET = async (request) => {
  try {
    await connectDB();
    // Get query parameters
    const url = new URL(request.url);
    const groupId = url.searchParams.get('group');
    const dishId = url.searchParams.get('dish');
    const variantId = url.searchParams.get('variant');
    const includeVariants = url.searchParams.get('includeVariants') === 'true';
    
    let query = {};
    let groupAddonIds = [];
    
    // Filter by group if specified
    if (groupId) {
      // Find the group and get its addons
      const group = await AddOnGroup.findById(groupId).populate('addOns');
      if (group && group.addOns) {
        groupAddonIds = group.addOns.map(addon =>
          typeof addon === 'string' ? addon : addon._id
        );
        query._id = { $in: groupAddonIds };
      } else {
        // Return empty if group not found or has no addons
        return NextResponse.json({
          success: true,
          count: 0,
          data: []
        });
      }
    }
    
    // Filter by dish if specified
    if (dishId) {
      query.dishReference = dishId;
    }
    
    // Filter by variant if specified
    if (variantId) {
      query.variantReference = variantId;
    } else if (dishId && variantId === '') {
      // Special case: if dish specified but variant explicitly empty,
      // get only the base addons (no variant reference)
      query.variantReference = { $exists: false };
    }
    
    // Get base addons
    const addons = await AddOn.find(query)
      .sort({ name: 1 })
      .populate('dishReference', 'dishName image dieteryTag')
      .populate('variantReference', 'variantName');
    
    // If variants should be included but aren't already in the results
    if (includeVariants && !variantId) {
      // Get dishes with variants
      const dishes = await Dish.find({})
        .populate({
          path: 'variations',
          select: 'variantName _id'
        });
        
      // For each dish with variants
      for (const dish of dishes) {
        if (dish.variations && dish.variations.length > 0) {
          // Check if we need to filter by group
          let includeThisDish = true;
          if (groupId) {
            // Check if this dish has any addons in the selected group
            const dishAddonsInGroup = await AddOn.exists({
              dishReference: dish._id,
              _id: { $in: groupAddonIds }
            });
            includeThisDish = !!dishAddonsInGroup;
          }
          
          if (includeThisDish) {
            // For each variant, find existing addons
            for (const variant of dish.variations) {
              // Look for existing addon for this variant
              const existingVariantAddon = await AddOn.findOne({
                dishReference: dish._id,
                variantReference: variant._id
              }).populate('dishReference', 'dishName image dieteryTag')
                .populate('variantReference', 'variantName');
                
              if (existingVariantAddon) {
                // Add to results if not already included
                if (!addons.some(a => a._id.toString() === existingVariantAddon._id.toString())) {
                  addons.push(existingVariantAddon);
                }
              }
            }
          }
        }
      }
      
      // Sort the combined results
      addons.sort((a, b) => a.name.localeCompare(b.name));
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
    const { name, price, addonGroupId, availabilityStatus, dishReference, variantReference } = await request.json();
    
    if (!name || !addonGroupId) {
      return NextResponse.json(
        { success: false, message: 'Add-on name and group ID are required' },
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
    
    // Check if dish exists if referenced
    if (dishReference) {
      const dish = await Dish.findById(dishReference);
      if (!dish) {
        return NextResponse.json(
          { success: false, message: 'Referenced dish not found' },
          { status: 404 }
        );
      }
      
      // If variant is specified, verify it exists and belongs to this dish
      if (variantReference) {
        const variant = await Variant.findById(variantReference);
        if (!variant) {
          return NextResponse.json(
            { success: false, message: 'Referenced variant not found' },
            { status: 404 }
          );
        }
        
        // Verify the variant belongs to the dish
        const variantBelongsToDish = dish.variations && dish.variations.some(
          v => v.toString() === variantReference.toString()
        );
        
        if (!variantBelongsToDish) {
          return NextResponse.json(
            { success: false, message: 'Variant does not belong to the selected dish' },
            { status: 400 }
          );
        }
      }
    }
    
    // For dish-based add-ons, get price from the referenced dish if available
    let addonPrice = price;
    
    // If this is a dish-based add-on, we could get the price from the menu in the future
    // For now, we'll use the provided price or default to 0
    
    // Create new addon
    const addon = await AddOn.create({
      name,
      price: addonPrice || 0,
      availabilityStatus: availabilityStatus === true || availabilityStatus === 'true',
      dishReference: dishReference || null,
      variantReference: variantReference || null
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