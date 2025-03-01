import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import { authMiddleware } from '@/lib/auth';

// Get invoice by ID
export const GET = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    
    const invoice = await Invoice.findById(id)
      .populate('salesOrder', 'invoiceNumber orderDateTime orderMode')
      .populate('createdBy', 'username')
      .populate('updatedBy', 'username');
    
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});

// Update invoice
export const PUT = authMiddleware(async (request, { params }) => {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();
    
    // Find the invoice
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json(
        { success: false, message: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Update isPaid status
    if (updateData.isPaid !== undefined) {
      invoice.isPaid = updateData.isPaid;
    }
    
    // Update isEmailSent status
    if (updateData.isEmailSent !== undefined) {
      invoice.isEmailSent = updateData.isEmailSent;
      if (updateData.isEmailSent) {
        invoice.emailSentAt = Date.now();
      }
    }
    
    // Update isPrinted status
    if (updateData.isPrinted !== undefined) {
      invoice.isPrinted = updateData.isPrinted;
      if (updateData.isPrinted) {
        invoice.printedAt = Date.now();
      }
    }
    
    // Update updatedBy and updatedAt
    invoice.updatedBy = request.user._id;
    invoice.updatedAt = Date.now();
    
    // Save the updated invoice
    await invoice.save();
    
    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
});