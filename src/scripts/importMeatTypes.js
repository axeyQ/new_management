// src/scripts/importMeatTypes.js
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Function to import meat types from CSV
export async function importMeatTypesFromCSV(filePath) {
  try {
    // Read the CSV file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse the CSV content
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Group meat types by category
    const meatTypesByCategory = {};
    
    records.forEach(record => {
      const category = record.Category;
      const meatType = record['Meat Type'];
      
      if (!meatTypesByCategory[category]) {
        meatTypesByCategory[category] = [];
      }
      
      if (meatType && !meatTypesByCategory[category].includes(meatType)) {
        meatTypesByCategory[category].push(meatType);
      }
    });
    
    // Write the result to a JSON file that can be imported in the application
    const outputPath = path.join(process.cwd(), 'src/data/meatTypes.json');
    fs.writeFileSync(outputPath, JSON.stringify(meatTypesByCategory, null, 2));
    
    console.log(`Meat types imported successfully and saved to ${outputPath}`);
    return meatTypesByCategory;
  } catch (error) {
    console.error('Error importing meat types from CSV:', error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(process.cwd(), 'data/meat_types.csv');
  importMeatTypesFromCSV(csvPath).catch(console.error);
}