// src/services/meatTypesService.js

// Meat types organized by category
export const meatTypes = {
    "Poultry": ["Chicken", "Turkey", "Duck", "Quail", "Goose"],
    "Red Meat": ["Beef", "Lamb", "Goat", "Venison", "Pork"],
    "Seafood": ["Fish", "Shrimp", "Crab", "Lobster", "Squid", "Octopus"],
    "Exotic": ["Buffalo", "Ostrich", "Rabbit", "Wild Boar"],
    "Organ Meats": ["Liver", "Heart", "Kidney", "Brain", "Tongue"]
  };
  
  // Get a flat list of all meat types
  export const getAllMeatTypes = () => {
    return Object.values(meatTypes).flat();
  };
  
  // Get all categories
  export const getMeatCategories = () => {
    return Object.keys(meatTypes);
  };
  
  // Get meat types by category
  export const getMeatTypesByCategory = (category) => {
    return meatTypes[category] || [];
  };
  
  // Export a function to get a label for displaying meat type
  export const getMeatTypeWithCategory = (meatType) => {
    if (!meatType) return '';
    
    // Find which category this meat type belongs to
    for (const [category, types] of Object.entries(meatTypes)) {
      if (types.includes(meatType)) {
        return `${category}: ${meatType}`;
      }
    }
    
    return meatType;
  };
  
  // Create a service object and then export it as default
  const meatTypesService = {
    meatTypes,
    getAllMeatTypes,
    getMeatCategories,
    getMeatTypesByCategory,
    getMeatTypeWithCategory
  };
  
  // Default export
  export default meatTypesService;