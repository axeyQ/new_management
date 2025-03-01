'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function AllMenuItems() {
  const { user } = useAuth();
  const [menuData, setMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});

  useEffect(() => {
    const fetchAllMenuData = async () => {
      try {
        setLoading(true);
        
        // Fetch all categories
        const categoriesResponse = await axios.get('/api/menu/categories');
        const categories = categoriesResponse.data.data;
        
        // Fetch subcategories and dishes for each category
        const menuDataWithItems = await Promise.all(categories.map(async (category) => {
          // Get subcategories for this category
          const subcategoriesResponse = await axios.get(`/api/menu/subcategories?category=${category._id}`);
          const subcategories = subcategoriesResponse.data.data;
          
          // Get dishes for each subcategory
          const subcategoriesWithDishes = await Promise.all(subcategories.map(async (subcategory) => {
            const dishesResponse = await axios.get(`/api/menu/dishes?subcategory=${subcategory._id}`);
            const dishes = dishesResponse.data.data;
            
            return {
              ...subcategory,
              dishes
            };
          }));
          
          return {
            ...category,
            subcategories: subcategoriesWithDishes
          };
        }));
        
        setMenuData(menuDataWithItems);
        
        // Initialize expanded states
        const initialCategoryState = menuDataWithItems.reduce((acc, category) => {
          acc[category._id] = true; // Start with all categories expanded
          return acc;
        }, {});
        
        const initialSubcategoryState = menuDataWithItems.reduce((acc, category) => {
          category.subcategories.forEach(subcategory => {
            acc[subcategory._id] = true; // Start with all subcategories expanded
          });
          return acc;
        }, {});
        
        setExpandedCategories(initialCategoryState);
        setExpandedSubcategories(initialSubcategoryState);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch menu data');
        console.error('Error fetching menu data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllMenuData();
  }, []);
  
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  
  const toggleSubcategory = (subcategoryId) => {
    setExpandedSubcategories(prev => ({
      ...prev,
      [subcategoryId]: !prev[subcategoryId]
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Complete Menu View</h2>
        
        <div className="space-x-2">
          <Link 
            href="/dashboard/menu" 
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu Dashboard
          </Link>
          <Link 
            href="/dashboard/menu/dishes/new" 
            className="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            Add Dish
          </Link>
        </div>
      </div>
      
      {menuData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No menu items found. Start by adding a category and dishes.</p>
          <div className="mt-4 space-x-4">
            <Link 
              href="/dashboard/menu/categories/new" 
              className="text-blue-500 hover:text-blue-700"
            >
              + Add a category
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {menuData.map(category => (
            <div key={category._id} className="mb-6 border-b pb-4 last:border-b-0 last:pb-0">
              <div 
                className="flex items-center cursor-pointer py-2"
                onClick={() => toggleCategory(category._id)}
              >
                <div className="mr-2">
                  {expandedCategories[category._id] ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-bold text-blue-800">
                  {category.categoryName} ({category.parentCategory})
                </h3>
                <div className="ml-auto space-x-2">
                  <Link 
                    href={`/dashboard/menu/categories/${category._id}`}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View
                  </Link>
                  <Link 
                    href={`/dashboard/menu/categories/edit/${category._id}`}
                    className="text-yellow-500 hover:text-yellow-700 text-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
              
              {expandedCategories[category._id] && (
                <div className="ml-6 mt-2">
                  {category.subcategories.length === 0 ? (
                    <p className="text-gray-500 text-sm py-2">No subcategories in this category</p>
                  ) : (
                    category.subcategories.map(subcategory => (
                      <div key={subcategory._id} className="mb-4">
                        <div 
                          className="flex items-center cursor-pointer py-2 border-l-2 border-gray-200 pl-4"
                          onClick={() => toggleSubcategory(subcategory._id)}
                        >
                          <div className="mr-2">
                            {expandedSubcategories[subcategory._id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <h4 className="text-lg font-semibold text-green-700">
                            {subcategory.subCategoryName}
                          </h4>
                          <div className="ml-auto space-x-2">
                            <Link 
                              href={`/dashboard/menu/subcategories/${subcategory._id}`}
                              className="text-blue-500 hover:text-blue-700 text-sm"
                            >
                              View
                            </Link>
                            <Link 
                              href={`/dashboard/menu/subcategories/edit/${subcategory._id}`}
                              className="text-yellow-500 hover:text-yellow-700 text-sm"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                        
                        {expandedSubcategories[subcategory._id] && (
                          <div className="ml-6 mt-2">
                            {subcategory.dishes.length === 0 ? (
                              <p className="text-gray-500 text-sm py-2">No dishes in this subcategory</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subcategory.dishes.map(dish => (
                                  <div key={dish._id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="p-3 bg-gray-50 border-b flex items-center">
                                      {dish.dieteryTag === 'veg' && (
                                        <span className="w-4 h-4 bg-green-500 rounded-full mr-2" title="Vegetarian"></span>
                                      )}
                                      {dish.dieteryTag === 'non veg' && (
                                        <span className="w-4 h-4 bg-red-500 rounded-full mr-2" title="Non-Vegetarian"></span>
                                      )}
                                      {dish.dieteryTag === 'egg' && (
                                        <span className="w-4 h-4 bg-yellow-500 rounded-full mr-2" title="Contains Egg"></span>
                                      )}
                                      <h5 className="font-medium truncate">{dish.dishName}</h5>
                                    </div>
                                    
                                    <div className="p-3">
                                      {dish.description && (
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{dish.description}</p>
                                      )}
                                      
                                      {dish.specialTag && (
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1 mb-2">
                                          {dish.specialTag}
                                        </span>
                                      )}
                                      
                                      <div className="flex justify-end space-x-2 text-sm">
                                        <Link 
                                          href={`/dashboard/menu/dishes/${dish._id}`}
                                          className="text-blue-500 hover:text-blue-700"
                                        >
                                          View
                                        </Link>
                                        <Link 
                                          href={`/dashboard/menu/dishes/edit/${dish._id}`}
                                          className="text-yellow-500 hover:text-yellow-700"
                                        >
                                          Edit
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}