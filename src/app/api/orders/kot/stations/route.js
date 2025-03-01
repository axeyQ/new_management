import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KOT from '@/models/KOT';
import { authMiddleware } from '@/lib/auth';

// Define valid order modes
const ORDER_MODES = [
  'Dine-in', 
  'Takeaway', 
  'Delivery', 
  'Direct Order-TableQR', 
  'Direct Order-Takeaway', 
  'Direct Order-Delivery', 
  'Zomato'
];

export const GET = authMiddleware(async (request) => {
  try {
    // Ensure database connection
    await connectDB();

    // Parse URL and get parameters
    const url = new URL(request.url);
    
    // Default statuses if not provided
    const statusParam = url.searchParams.get('status') || 'pending,preparing';
    const modeParam = url.searchParams.get('mode');

    // Construct query
    const query = {
      kotStatus: { $in: statusParam.split(',') }
    };

    // Add mode filter if specified
    if (modeParam && ORDER_MODES.includes(modeParam)) {
      query.orderMode = modeParam;
    }

    // Fetch KOTs with comprehensive population
    const kots = await KOT.find(query)
      .sort({ createdAt: -1 })
      .populate('table')
      .populate('salesOrder')
      .populate({
        path: 'items.dish',
        select: 'dishName'
      })
      .populate({
        path: 'items.variant',
        select: 'variantName'
      })
      .populate('customer');

    // Return response
    return NextResponse.json({
      success: true,
      count: kots.length,
      data: kots
    });

  } catch (error) {
    console.error('KOT Fetch Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error fetching KOTs',
        error: error.message 
      },
      { status: 500 }
    );
  }
});