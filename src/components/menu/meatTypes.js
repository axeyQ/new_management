// src/components/menu/meatTypes.js

// Meat types organized by category
export const meatTypes = {
    "Popular Options": [
      "Chicken", "Fish", "Mutton", "Goat", "Lamb", 
      "Pork", "Egg", "Turkey", "Beef", "Buffalo", 
      "Bull", "Crab", "Prawn", "Shrimp", "Shellfish", 
      "Squid", "Lobster"
    ],
    "Other Options": [
      "Duck", "Camel", "Deer", "Frog", "Goose", 
      "Octopus", "Pigeon", "Quail", "Rabbit", 
      "Shark", "Veal", "Venison"
    ]
  };
  
  // Get all categories
  export const getMeatCategories = () => {
    return Object.keys(meatTypes);
  };
  
  // Get meat types by category
  export const getMeatTypesByCategory = (category) => {
    return meatTypes[category] || [];
  };
  
  // Get all meat types as a flat array
  export const getAllMeatTypes = () => {
    return Object.values(meatTypes).flat();
  };