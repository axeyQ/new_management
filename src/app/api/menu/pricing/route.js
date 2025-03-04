import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Menu from '@/models/Menu';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import { roleMiddleware } from '@/lib/auth';
import mongoose from 'mongoose';

export const GET = async (request) => {
  try {
    await connectDB();
    const url = new URL(request.url);
    const menuId = url.searchParams.get('menu');
    const dishId = url.searchParams.get('dish');
    const variantId = url.searchParams.get('variant');
    
    if (!menuId && !dishId) {
      return NextResponse.json(
        { success: false, message: 'Either menu ID or dish ID is required' },
        { status: 400 }
      );
    }
    
    // Build the query directly for the MongoDB collection
    const db = mongoose.connection.db;
    const collection = db.collection('menupricings');
    
    // Create a basic query
    let query = {};
    if (menuId) query.menu = new mongoose.Types.ObjectId(menuId);
    if (dishId) query.dish = new mongoose.Types.ObjectId(dishId);
    if (variantId) {
      query.variant = new mongoose.Types.ObjectId(variantId);
    } else if (dishId && variantId === '') {
      query.variant = { $exists: false };
    }
    
    // Get the documents and manually populate them
    const pricingItems = await collection.find(query).toArray();
    
    // If we have results, enrich them with dish and variant data
    if (pricingItems.length > 0) {
      const dishIds = [...new Set(pricingItems.map(item => item.dish))];
      const variantIds = [...new Set(pricingItems.filter(item => item.variant).map(item => item.variant))];
      
      // Get all dishes in one query
      const dishes = await Dish.find({ _id: { $in: dishIds } }).lean();
      const dishMap = dishes.reduce((map, dish) => {
        map[dish._id.toString()] = dish;
        return map;
      }, {});
      
      // Get all variants in one query
      const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
      const variantMap = variants.reduce((map, variant) => {
        map[variant._id.toString()] = variant;
        return map;
      }, {});
      
      // Enrich the pricing items
      const enrichedItems = pricingItems.map(item => {
        const dishId = item.dish.toString();
        const dish = dishMap[dishId];
        let variant = null;
        if (item.variant) {
          const variantId = item.variant.toString();
          variant = variantMap[variantId];
        }
        return {
          ...item,
          dish: dish ? {
            _id: dish._id,
            dishName: dish.dishName,
            image: dish.image,
            dieteryTag: dish.dieteryTag
          } : { _id: item.dish },
          variant: variant ? {
            _id: variant._id,
            variantName: variant.variantName
          } : null
        };
      });
      
      return NextResponse.json({
        success: true,
        count: enrichedItems.length,
        data: enrichedItems
      });
    }
    
    return NextResponse.json({
      success: true,
      count: 0,
      data: []
    });
  } catch (error) {
    console.error('Error fetching menu pricing:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
};

const createHandler = async (request) => {
  try {
    const { menuId, dishId, variantId, price, taxSlab, taxRate, isAvailable } = await request.json();
    
    if (!menuId || !dishId || price === undefined) {
      return NextResponse.json(
        { success: false, message: 'Menu ID, dish ID, and price are required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
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
    
    // Verify variant if provided
    if (variantId) {
      const variant = await Variant.findById(variantId);
      if (!variant) {
        return NextResponse.json(
          { success: false, message: 'Variant not found' },
          { status: 404 }
        );
      }
      
      // Check that variant belongs to the selected dish
      const variantBelongsToDish = dish.variations && dish.variations.some(
        v => v.toString() === variantId.toString()
      );
      if (!variantBelongsToDish) {
        return NextResponse.json(
          { success: false, message: 'Variant does not belong to the selected dish' },
          { status: 400 }
        );
      }
    }
    
    // Calculate tax and final price
    const taxAmount = (price * taxRate) / 100;
    const finalPrice = price + taxAmount;
    
    // Get direct access to the MongoDB collection
    const db = mongoose.connection.db;
    const collection = db.collection('menupricings');
    
    // Create a query to find an existing pricing entry
    const query = {
      menu: new mongoose.Types.ObjectId(menuId),
      dish: new mongoose.Types.ObjectId(dishId)
    };
    
    if (variantId) {
      query.variant = new mongoose.Types.ObjectId(variantId);
    } else {
      // We need to be explicit about checking for records where variant is not present
      query.variant = { $exists: false };
    }
    
    // Check if a document already exists
    const now = new Date();
    const userId = request.user?._id ? new mongoose.Types.ObjectId(request.user._id) : null;
    
    // MODIFIED: Instead of separate insert/update, use findOneAndUpdate with upsert
    const result = await collection.findOneAndUpdate(
      query,
      {
        $set: {
          menu: new mongoose.Types.ObjectId(menuId),
          dish: new mongoose.Types.ObjectId(dishId),
          price,
          taxSlab,
          taxRate,
          taxAmount,
          finalPrice,
          isAvailable: isAvailable !== undefined ? isAvailable : true,
          updatedAt: now,
          updatedBy: userId
        },
        $setOnInsert: {
          createdAt: now,
          createdBy: userId
        }
      },
      { 
        upsert: true,
        returnDocument: 'after'
      }
    );
    
    // Check which operation was performed
    const wasInserted = !!result.upsertedId;
    
    // If this was a new document, add it to the menu's dishPricing array
    if (wasInserted) {
      const insertedId = result.upsertedId;
      await Menu.findByIdAndUpdate(
        menuId,
        { $addToSet: { dishPricing: insertedId } }
      );
    }
    
    // Return the document (whether it was newly inserted or updated)
    return NextResponse.json({
      success: true,
      message: wasInserted ? 'Menu pricing added successfully' : 'Menu pricing updated successfully',
      data: result.value
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