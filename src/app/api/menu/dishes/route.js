import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import SubCategory from '@/models/SubCategory';
import { roleMiddleware } from '@/lib/auth';
import Variant from '@/models/Variant';

// Get all dishes
export const GET = async (request) => {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(request.url);
    const subcategoryId = url.searchParams.get('subcategory');
    
    let query = {};
    if (subcategoryId) {
      query.subCategory = subcategoryId;
    }
    
    const dishes = await Dish.find(query)
      .sort({ dishName: 1 })
      .populate('subCategory')
      .populate('availabilityStatus')
      .populate('discountStatus');
    
    return NextResponse.json({
      success: true,
      count: dishes.length,
      data: dishes
    });
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Create a new dish
const createHandler = async (request) => {
  try {
    const dishData = await request.json();
    
    if (!dishData.dishName || !dishData.subCategory || dishData.subCategory.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Dish name and at least one subcategory are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Check if dish already exists
    const existingDish = await Dish.findOne({ dishName: dishData.dishName });
    
    if (existingDish) {
      return NextResponse.json(
        { success: false, message: 'Dish already exists' },
        { status: 400 }
      );
    }
    
    // Extract variants data if present
    const { variations, ...mainDishData } = dishData;
    
    // Add user info for dish
    mainDishData.createdBy = request.user._id;
    mainDishData.updatedBy = request.user._id;
    
    // Create new dish
    const dish = await Dish.create(mainDishData);
    
    // Create variants if they exist
    if (variations && variations.length > 0) {
      const variantPromises = variations.map(async (variant) => {
        // Create variant with reference to dish AND include required fields
        const variantData = {
          ...variant,
          dishReference: dish._id,
          createdBy: request.user._id,
          updatedBy: request.user._id,
          // Include required natureTags fields from the parent dish
          natureTags: {
            cuisine: dish.natureTags?.cuisine || "Default Cuisine",
            spiciness: dish.natureTags?.spiciness || "Medium",
            sweetnessSaltness: dish.natureTags?.sweetnessSaltness || "Medium", 
            texture: dish.natureTags?.texture || "Smooth",
            oil: dish.natureTags?.oil || "Regular",
            temperature: dish.natureTags?.temperature || "Hot",
            cookingStyle: dish.natureTags?.cookingStyle || "Regular"
          },
          // Include required packagingCharges fields
          packagingCharges: {
            type: dish.packagingCharges?.type || "fixed",
            amount: dish.packagingCharges?.amount || 0,
            appliedAt: dish.packagingCharges?.appliedAt || "dish"
          }
        };
        delete variantData._id; // Remove temporary ID
        
        const newVariant = await Variant.create(variantData);
        return newVariant._id;
      });
      
      // Wait for all variants to be created
      const variantIds = await Promise.all(variantPromises);
      
      // Update dish with variant references
      dish.variations = variantIds;
      await dish.save();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Dish created successfully',
      data: dish
    });
  } catch (error) {
    console.error('Error creating dish:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
};

// Only admins and billers can create dishes
export const POST = roleMiddleware(['admin', 'biller'])(createHandler);