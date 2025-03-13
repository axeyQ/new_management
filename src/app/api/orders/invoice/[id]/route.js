// src/app/api/orders/invoice/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import { authMiddleware } from '@/lib/auth';

// Get a specific invoice by ID
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    console.log(`API: Fetching invoice with ID: ${id}`);
    
    const invoice = await Invoice.findById(id)
      .populate('salesOrder', 'invoiceNumber orderDateTime orderMode')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!invoice) {
      console.log(`API: Invoice with ID ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Successfully retrieved invoice ${id}`);
    return NextResponse.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('API Error fetching invoice:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});

// Update an invoice
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();
    console.log(`API: Processing update for invoice ${id}`, updateData);
    
    // Find and update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: { ...updateData, updatedBy: request.user._id, updatedAt: new Date() } },
      { new: true }
    )
    .populate('salesOrder', 'invoiceNumber orderDateTime orderMode')
    .populate('createdBy', 'username')
    .populate('updatedBy', 'username');
    
    if (!updatedInvoice) {
      console.log(`API: Invoice ${id} not found`);
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    console.log(`API: Successfully updated invoice ${id}`);
    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('API Error updating invoice:', error);
    return NextResponse.json(
      { success: false, message: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
});