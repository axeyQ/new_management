import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuAddonPricing from '@/models/MenuAddonPricing';
import AddOn from '@/models/AddOn';
import Menu from '@/models/Menu';
import MenuPricing from '@/models/MenuPricing';
import { roleMiddleware } from '@/lib/auth';

// Get all add-on pricings
export const GET = async (request) => {
  try {
    await connectDB();
    const url = new URL(request.url);
    const menuId = url.searchParams.get('menu');
    const groupId = url.searchParams.get('group');
    const addonId = url.searchParams.get('addon');

    if (!menuId) {
      return NextResponse.json(
        { success: false, message: 'Menu ID is required' },
        { status: 400 }
      );
    }

    // Build query based on parameters
    let query = { menu: menuId };
    
    if (addonId) {
      query.addon = addonId;
    }
    
    // If group specified, we need to find all add-ons in that group
    if (groupId) {
      const addons = await AddOn.find({ 
        addonGroup: groupId 
      });
      
      if (addons.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          data: []
        });
      }
      
      query.addon = { $in: addons.map(a => a._id) };
    }

    // Get pricing entries
    const pricingItems = await MenuAddonPricing.find(query)
      .populate({
        path: 'addon',
        populate: [
          { path: 'dishReference', select: 'dishName image dieteryTag' },
          { path: 'variantReference', select: 'variantName' }
        ]
      })
      .populate('menu', 'name orderMode');

    return NextResponse.json({
      success: true,
      count: pricingItems.length,
      data: pricingItems
    });
  } catch (error) {
    console.error('Error fetching add-on pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create new add-on pricing
const createHandler = async (request) => {
  try {
    const { menuId, addonId, price, taxSlab, taxRate, isAvailable = true } = await request.json();
    
    if (!menuId || !addonId || price === undefined) {
      return NextResponse.json(
        { success: false, message: 'Menu ID, add-on ID, and price are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if menu exists
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Verify it's a Zomato menu
    if (menu.orderMode !== 'Zomato') {
      return NextResponse.json(
        { success: false, message: 'Add-ons are only available for Zomato ordering mode' },
        { status: 400 }
      );
    }
    
    // Check if add-on exists
    const addon = await AddOn.findById(addonId)
      .populate('dishReference')
      .populate('variantReference');
      
    if (!addon) {
      return NextResponse.json(
        { success: false, message: 'Add-on not found' },
        { status: 404 }
      );
    }
    
    // If dish-based add-on and no price/tax provided, get from menu pricing
    let finalPrice = price;
    let finalTaxSlab = taxSlab || 'GST 5%';
    let finalTaxRate = taxRate || 5;
    
    if (addon.dishReference && (!price || !taxSlab || !taxRate)) {
      try {
        // Find menu pricing for this dish/variant
        const query = {
          menu: menuId,
          dish: addon.dishReference._id
        };
        
        if (addon.variantReference) {
          query.variant = addon.variantReference._id;
        } else {
          query.variant = { $exists: false };
        }
        
        const menuPricing = await MenuPricing.findOne(query);
        
        if (menuPricing) {
          finalPrice = price || menuPricing.price;
          finalTaxSlab = taxSlab || menuPricing.taxSlab;
          finalTaxRate = taxRate || menuPricing.taxRate;
        }
      } catch (error) {
        console.error('Error getting menu pricing:', error);
      }
    }
    
    // Calculate tax and final price
    const taxAmount = (finalPrice * finalTaxRate) / 100;
    const finalPriceWithTax = finalPrice + taxAmount;
    
    // Check if pricing already exists - use findOneAndUpdate with upsert to avoid duplicates
    const query = {
      menu: menuId,
      addon: addonId
    };
    
    const update = {
      price: finalPrice,
      taxSlab: finalTaxSlab,
      taxRate: finalTaxRate,
      taxAmount,
      finalPrice: finalPriceWithTax,
      isAvailable,
      updatedBy: request.user?._id,
      updatedAt: Date.now()
    };
    
    const setOnInsert = {
      createdBy: request.user?._id,
      createdAt: Date.now()
    };
    
    // Use findOneAndUpdate with upsert to handle both creation and updates
    const addonPricing = await MenuAddonPricing.findOneAndUpdate(
      query,
      {
        $set: update,
        $setOnInsert: setOnInsert
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    // Return populated pricing
    const populatedPricing = await MenuAddonPricing.findById(addonPricing._id)
      .populate({
        path: 'addon',
        populate: [
          { path: 'dishReference', select: 'dishName' },
          { path: 'variantReference', select: 'variantName' }
        ]
      })
      .populate('menu', 'name');
    
    // Check if this was a new document or an update
    const isNew = addonPricing.createdAt.getTime() === addonPricing.updatedAt.getTime();
    
    return NextResponse.json({
      success: true,
      message: isNew ? 'Add-on pricing created successfully' : 'Add-on pricing updated successfully',
      data: populatedPricing
    });
  } catch (error) {
    console.error('Error creating add-on pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only admins and billers can create add-on pricing
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);