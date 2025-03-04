import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AddOnGroup from '@/models/AddOnGroup';
import AddOn from '@/models/AddOn';
import MenuAddonPricing from '@/models/MenuAddonPricing';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import MenuPricing from '@/models/MenuPricing';
import Menu from '@/models/Menu';

export const GET = async (request) => {
  try {
    await connectDB();
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const menuId = url.searchParams.get('menuId');
    
    if (!groupId || !menuId) {
      return NextResponse.json(
        { success: false, message: 'Group ID and Menu ID are required' },
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
    
    // Get the group and its add-ons
    const group = await AddOnGroup.findById(groupId).populate('addOns');
    if (!group) {
      return NextResponse.json(
        { success: false, message: 'Add-on group not found' },
        { status: 404 }
      );
    }
    
    // Get all add-on IDs from the group
    const addonIds = group.addOns.map(addon =>
      typeof addon === 'string' ? addon : addon._id
    );
    
    // Find all add-ons in this group
    const addons = await AddOn.find({ _id: { $in: addonIds } })
      .populate('dishReference', 'dishName image dieteryTag')
      .populate('variantReference', 'variantName');
    
    // Get all dishes with variants for this group
    const addonDishIds = [...new Set(addons
      .filter(a => a.dishReference)
      .map(a => a.dishReference._id.toString())
    )];
    
    // Get all variants for these dishes
    let allVariantAddons = [];
    if (addonDishIds.length > 0) {
      // Find dishes with variants
      const dishesWithVariants = await Dish.find({
        _id: { $in: addonDishIds },
        variations: { $exists: true, $ne: [] }
      }).populate('variations');
      
      // For each dish with variants
      for (const dish of dishesWithVariants) {
        if (dish.variations && dish.variations.length > 0) {
          // Find any existing add-ons for these variants in this group
          const variantIds = dish.variations.map(v => v._id);
          const variantAddons = await AddOn.find({
            dishReference: dish._id,
            variantReference: { $in: variantIds },
            _id: { $in: addonIds }
          }).populate('dishReference', 'dishName image dieteryTag')
          .populate('variantReference', 'variantName');
          
          allVariantAddons = [...allVariantAddons, ...variantAddons];
        }
      }
    }
    
    // Combine all add-ons
    const allAddons = [...addons, ...allVariantAddons];
    
    // Find existing pricing for these add-ons in the selected menu
    const existingPricing = await MenuAddonPricing.find({
      menu: menuId,
      addon: { $in: allAddons.map(a => a._id) }
    });
    
    // Get all dish and variant pricing from the menu
    const dishIds = [...new Set(allAddons
      .filter(a => a.dishReference)
      .map(a => a.dishReference._id.toString())
    )];
    
    const menuPricingItems = await MenuPricing.find({
      menu: menuId,
      dish: { $in: dishIds }
    });
    
    // Map add-ons with their pricing
    const addonsWithPricing = await Promise.all(allAddons.map(async (addon) => {
      // Check if there's existing pricing
      const pricing = existingPricing.find(p =>
        p.addon.toString() === addon._id.toString()
      );
      
      // If we already have pricing, use it
      if (pricing) {
        return {
          addon: addon,
          pricing: pricing,
          isPriced: true,
          price: pricing.price,
          taxSlab: pricing.taxSlab,
          taxRate: pricing.taxRate,
          isAvailable: pricing.isAvailable
        };
      }
      
      // For dish-based add-ons without pricing, get from menu pricing
      if (addon.dishReference) {
        // Find menu pricing for this dish/variant
        let menuPricing;
        
        if (addon.variantReference) {
          // Find pricing for specific variant
          menuPricing = menuPricingItems.find(p => 
            p.dish.toString() === addon.dishReference._id.toString() &&
            p.variant?.toString() === addon.variantReference._id.toString()
          );
        } else {
          // Find pricing for base dish (no variant)
          menuPricing = menuPricingItems.find(p => 
            p.dish.toString() === addon.dishReference._id.toString() &&
            (!p.variant)
          );
        }
        
        if (menuPricing) {
          // Use menu pricing values
          return {
            addon: addon,
            pricing: null,
            isPriced: false,
            price: menuPricing.price,
            taxSlab: menuPricing.taxSlab,
            taxRate: menuPricing.taxRate,
            isAvailable: true
          };
        }
      }
      
      // Default values for add-ons without pricing
      return {
        addon: addon,
        pricing: null,
        isPriced: false,
        price: 0,
        taxSlab: 'GST 5%',
        taxRate: 5,
        isAvailable: true
      };
    }));
    
    // Sort by name and then by whether they have variants
    addonsWithPricing.sort((a, b) => {
      // First by dish name
      const dishNameA = a.addon.dishReference?.dishName || '';
      const dishNameB = b.addon.dishReference?.dishName || '';
      if (dishNameA !== dishNameB) {
        return dishNameA.localeCompare(dishNameB);
      }
      
      // Then put base items before variants
      const hasVariantA = !!a.addon.variantReference;
      const hasVariantB = !!b.addon.variantReference;
      if (hasVariantA !== hasVariantB) {
        return hasVariantA ? 1 : -1;
      }
      
      // Finally by add-on name
      return a.addon.name.localeCompare(b.addon.name);
    });
    
    return NextResponse.json({
      success: true,
      count: addonsWithPricing.length,
      data: addonsWithPricing
    });
  } catch (error) {
    console.error('Error fetching group add-ons with pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};