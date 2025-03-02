// src/app/api/menu/pricing/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import MenuPricing from '@/models/MenuPricing';
import Dish from '@/models/Dish';
import { roleMiddleware } from '@/lib/auth';

// Get menu pricing
export const GET = async (request) => {
  try {
    await connectDB();
    
    const url = new URL(request.url);
    const menuId = url.searchParams.get('menu');
    const dishId = url.searchParams.get('dish');
    
    if (!menuId && !dishId) {
      return NextResponse.json(
        { success: false, message: 'Either menu ID or dish ID is required' },
        { status: 400 }
      );
    }
    
    let query = {};
    
    if (menuId) {
      const menu = await Menu.findById(menuId);
      if (!menu) {
        return NextResponse.json(
          { success: false, message: 'Menu not found' },
          { status: 404 }
        );
      }
      query = { _id: { $in: menu.dishPricing } };
    }
    
    if (dishId) {
      query.dish = dishId;
    }
    
    const pricingItems = await MenuPricing.find(query)
      .populate('dish', 'dishName image dieteryTag')
      .sort({ 'dish.dishName': 1 });
    
    return NextResponse.json({
      success: true,
      count: pricingItems.length,
      data: pricingItems
    });
  } catch (error) {
    console.error('Error fetching menu pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Add or update menu pricing
const createHandler = async (request) => {
  try {
    const { menuId, dishId, price, taxSlab, taxRate, isAvailable } = await request.json();
    
    if (!menuId || !dishId || price === undefined) {
      return NextResponse.json(
        { success: false, message: 'Menu ID, dish ID, and price are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    pricingItem = await MenuPricing.create({
        dish: dishId,
        variant: variantId || null, // Add variant if provided
        price,
        taxSlab,
        taxAmount,
        finalPrice,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        createdBy: request.user._id,
        updatedBy: request.user._id
      });

    // Find menu and dish
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    const dish = await Dish.findById(dishId);
    if (!dish) {
      return NextResponse.json(
        { success: false, message: 'Dish not found' },
        { status: 404 }
      );
    }
    
    // Calculate tax and final price
    const taxAmount = (price * taxRate) / 100;
    const finalPrice = price + taxAmount;
    
    // Check if pricing already exists for this dish in this menu
    let pricingExists = false;
    let existingPricing = null;
    
    if (menu.dishPricing && menu.dishPricing.length > 0) {
      existingPricing = await MenuPricing.findOne({
        _id: { $in: menu.dishPricing },
        dish: dishId
      });
      
      if (existingPricing) {
        pricingExists = true;
      }
    }
    
    let pricingItem;
    
    if (pricingExists) {
      // Update existing pricing
      existingPricing.price = price;
      existingPricing.taxSlab = taxSlab;
      existingPricing.taxAmount = taxAmount;
      existingPricing.finalPrice = finalPrice;
      existingPricing.isAvailable = isAvailable !== undefined ? isAvailable : true;
      existingPricing.updatedBy = request.user._id;
      existingPricing.updatedAt = Date.now();
      
      pricingItem = await existingPricing.save();
    } else {
      // Create new pricing
      pricingItem = await MenuPricing.create({
        dish: dishId,
        price,
        taxSlab,
        taxAmount,
        finalPrice,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        createdBy: request.user._id,
        updatedBy: request.user._id
      });
      
      // Add to menu if not already there
      if (!menu.dishPricing.includes(pricingItem._id)) {
        menu.dishPricing.push(pricingItem._id);
        await menu.save();
      }
    }
    
    // Return populated pricing item
    const populatedPricing = await MenuPricing.findById(pricingItem._id)
      .populate('dish', 'dishName image dieteryTag');
    
    return NextResponse.json({
      success: true,
      message: pricingExists ? 'Menu pricing updated successfully' : 'Menu pricing added successfully',
      data: populatedPricing
    });
  } catch (error) {
    console.error('Error managing menu pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

// Only admins and billers can manage menu pricing
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);