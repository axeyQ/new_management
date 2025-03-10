// src/lib/cronService.js
import axios from 'axios';

/**
 * This function will be used to set up a cron job on your hosting provider
 * It should be run every few minutes to check for items that need to be restocked
 */
async function runAutomaticRestock() {
  try {
    // Get the API URL from environment
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // Call the restock endpoint
    const response = await axios.get(`${apiUrl}/api/stock/restock`);
    
    console.log('Auto-restock completed:', response.data);
    
    // Log the results
    if (response.data.success) {
      console.log(`Restocked ${response.data.results.dishes} dishes and ${response.data.results.variants} variants.`);
      return {
        success: true,
        restocked: response.data.results.dishes + response.data.results.variants
      };
    } else {
      console.error('Auto-restock failed:', response.data.message);
      return {
        success: false,
        message: response.data.message
      };
    }
  } catch (error) {
    console.error('Error in automatic restock:', error);
    return {
      success: false,
      message: error.message
    };
  }
}



export default runAutomaticRestock;