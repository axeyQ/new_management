import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Dish from '@/models/Dish';
import Variant from '@/models/Variant';
import StockHistory from '@/models/StockHistory';

export async function GET() {
  try {
    await connectDB();
    const now = new Date();
    
    // Find and update dishes that need to be restocked
    const dishResults = await Dish.updateMany(
      {
        'stockStatus.isOutOfStock': true,
        'stockStatus.autoRestock': true,
        'stockStatus.restockTime': { $lte: now }
      },
      {
        $set: {
          'stockStatus.isOutOfStock': false,
          'stockStatus.lastStockUpdate': now
        }
      }
    );
    
    // Find and update variants that need to be restocked
    const variantResults = await Variant.updateMany(
      {
        'stockStatus.isOutOfStock': true,
        'stockStatus.autoRestock': true,
        'stockStatus.restockTime': { $lte: now }
      },
      {
        $set: {
          'stockStatus.isOutOfStock': false,
          'stockStatus.lastStockUpdate': now
        }
      }
    );
    
    // Create history entries for auto-restocks
    // (This is a simplified approach - in production, you'd create individual entries)
    
    return NextResponse.json({
      success: true,
      message: 'Auto-restock check completed',
      results: {
        dishes: dishResults.modifiedCount,
        variants: variantResults.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error in auto-restock process:', error);
    return NextResponse.json(
      { success: false, message: 'Server error during auto-restock' },
      { status: 500 }
    );
  }
}