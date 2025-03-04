import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MenuAddonPricing from '@/models/MenuAddonPricing';
import AddOn from '@/models/AddOn';
import MenuPricing from '@/models/MenuPricing';
import Menu from '@/models/Menu';

export const GET = async (request) => {
  try {
    await connectDB();
    const url = new URL(request.url);
    const menuId = url.searchParams.get('menuId');
    const dishId = url.searchParams.get('dishId');
    const variantId = url.searchParams.get('variantId');
    
    if (!menuId || !dishId) {
      return NextResponse.json(
        { success: false, message: 'Menu ID and Dish ID are required' },
        { status: 400 }
      );
    }

    // Check if it's a Zomato menu
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return NextResponse.json(
        { success: false, message: 'Menu not found' },
        { status: 404 }
      );
    }
    
    if (menu.orderMode !== 'Zomato') {
      return NextResponse.json(
        { success: false, message: 'Add-ons are only available for Zomato ordering mode' },
        { status: 400 }
      );
    }
    
    // Find add-ons for this dish/variant
    let query = {
      dishReference: dishId
    };
    
    // If variant specified, include variant-specific add-ons
    if (variantId) {
      query.variantReference = variantId;
    } else {
      // If no variant, get only base dish add-ons
      query.variantReference = { $exists: false };
    }
    
    // Find all matching add-ons
    const addons = await AddOn.find(query)
      .populate('dishReference', 'dishName')
      .populate('variantReference', 'variantName');
    
    // Get pricing for these add-ons in this menu
    const addonIds = addons.map(addon => addon._id);
    const addonPricing = await MenuAddonPricing.find({
      menu: menuId,
      addon: { $in: addonIds },
      isAvailable: true
    });
    
    // Find dish/variant pricing in menu
    const dishPricingQuery = {
      menu: menuId,
      dish: dishId
    };
    
    if (variantId) {
      dishPricingQuery.variant = variantId;
    } else {
      dishPricingQuery.variant = { $exists: false };
    }
    
    const dishPricing = await MenuPricing.findOne(dishPricingQuery);

    // Map add-ons with their pricing
    const availableAddons = await Promise.all(addons.map(async (addon) => {
      // Find pricing for this add-on
      const pricing = addonPricing.find(p =>
        p.addon.toString() === addon._id.toString()
      );
      
      // If this add-on has pricing, use it
      if (pricing) {
        return {
          _id: addon._id,
          name: addon.name,
          dishReference: addon.dishReference,
          variantReference: addon.variantReference,
          price: pricing.price,
          finalPrice: pricing.finalPrice,
          taxRate: pricing.taxRate,
          taxSlab: pricing.taxSlab,
          taxAmount: pricing.taxAmount
        };
      }
      
      // If no pricing and it's a dish-based add-on, use the dish pricing
      if (addon.dishReference && dishPricing) {
        // Calculate tax amount based on dish pricing tax rate
        const price = dishPricing.price;
        const taxRate = dishPricing.taxRate;
        const taxAmount = (price * taxRate) / 100;
        
        return {
          _id: addon._id,
          name: addon.name,
          dishReference: addon.dishReference,
          variantReference: addon.variantReference,
          price: price,
          finalPrice: price + taxAmount,
          taxRate: taxRate,
          taxSlab: dishPricing.taxSlab,
          taxAmount: taxAmount
        };
      }
      
      // Default values if no pricing found
      return {
        _id: addon._id,
        name: addon.name,
        dishReference: addon.dishReference,
        variantReference: addon.variantReference,
        price: 0,
        finalPrice: 0,
        taxRate: 5,
        taxSlab: 'GST 5%',
        taxAmount: 0
      };
    }));
    
    // Filter to only include add-ons that have pricing or are available
    const filteredAddons = availableAddons.filter(addon => 
      addon.price > 0 || 
      addonPricing.some(p => p.addon.toString() === addon._id.toString() && p.isAvailable)
    );
    
    return NextResponse.json({
      success: true,
      count: filteredAddons.length,
      data: filteredAddons
    });
  } catch (error) {
    console.error('Error fetching dish add-ons:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};