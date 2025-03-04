// src/scripts/fix-menu-pricing-index.js (CommonJS version)
// At the top of the script
require('dotenv').config({ path: './.env.local' });
const mongoose = require('mongoose');

// Replace the import with direct connection code
async function connectDB() {
  if (mongoose.connection.readyState) {
    console.log('Using existing connection');
    return;
  }
  
  try {
    // You may need to replace this with your actual MongoDB URI
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_management';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    throw error;
  }
}

async function fixMenuPricingIndex() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    // Check existing indexes
    const indexes = await db.collection('menupricings').indexes();
    console.log('Current indexes:', indexes);
    
    // Drop the problematic index if it exists
    const hasDishVariantIndex = indexes.some(idx => 
      idx.name === 'dish_1_variant_1' || 
      (idx.key && idx.key.dish === 1 && idx.key.variant === 1 && !idx.key.menu)
    );
    
    if (hasDishVariantIndex) {
      console.log('Dropping dish_variant index...');
      await db.collection('menupricings').dropIndex('dish_1_variant_1');
    }
    
    // Create the proper compound index
    console.log('Creating menu_dish_variant index...');
    await db.collection('menupricings').createIndex(
      { menu: 1, dish: 1, variant: 1 },
      { unique: true }
    );
    
    console.log('Index update complete!');
  } catch (error) {
    console.error('Error fixing index:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
fixMenuPricingIndex();