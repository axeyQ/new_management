// src/utils/statusHelper.js
import mongoose from 'mongoose';
import Status from '@/models/Status';
import connectDB from '@/lib/db';

/**
 * Gets the active status ObjectId
 * Creates a default one if none exists
 */
export async function getActiveStatusId() {
  await connectDB();
  
  // Try to find an active status first
  let status = await Status.findOne({ 
    dineIn: true,
    takeaway: true,
    delivery: true
  });
  
  // If no status exists, create a default one
  if (!status) {
    try {
      status = await Status.create({
        dineIn: true,
        takeaway: true,
        delivery: true,
        qrOrdering: true,
        takeawayCustomerEnd: true,
        deliveryCustomerEnd: true,
        zomato: true
      });
      console.log("Created default status:", status._id);
    } catch (error) {
      console.error("Error creating default status:", error);
      // As a fallback, create a dummy ObjectId
      return new mongoose.Types.ObjectId();
    }
  }
  
  return status._id;
}

/**
 * Gets the inactive status ObjectId
 * Creates a default one if none exists
 */
export async function getInactiveStatusId() {
  await connectDB();
  
  // Try to find an inactive status first
  let status = await Status.findOne({ 
    dineIn: false,
    takeaway: false,
    delivery: false
  });
  
  // If no status exists, create a default one
  if (!status) {
    try {
      status = await Status.create({
        dineIn: false,
        takeaway: false,
        delivery: false,
        qrOrdering: false,
        takeawayCustomerEnd: false,
        deliveryCustomerEnd: false,
        zomato: false
      });
      console.log("Created default inactive status:", status._id);
    } catch (error) {
      console.error("Error creating default inactive status:", error);
      // As a fallback, create a dummy ObjectId
      return new mongoose.Types.ObjectId();
    }
  }
  
  return status._id;
}

/**
 * Gets the appropriate status ID based on a boolean value
 */
export async function getStatusIdFromBoolean(isActive) {
  return isActive ? await getActiveStatusId() : await getInactiveStatusId();
}