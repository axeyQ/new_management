'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function MenuManagement() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/menu/categories');
        setCategories(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch categories');
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
        <h2 className="text-2xl font-bold">Menu Management</h2>
        
        <div className="space-x-2">
          <Link 
            href="/dashboard/menu/all" 
            className="bg-indigo-500 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            View Complete Menu
          </Link>
          <Link 
            href="/dashboard/menu/addongroups" 
            className="bg-teal-500 hover:bg-teal-700 text-white px-4 py-2 rounded"
          >
            Addon Groups
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Categories & Dishes</h3>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Link 
                href="/dashboard/menu/categories/new" 
                className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
              >
                Add Category
              </Link>
              <Link 
                href="/dashboard/menu/subcategories/new" 
                className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Add Subcategory
              </Link>
              <Link 
                href="/dashboard/menu/dishes/new" 
                className="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded"
              >
                Add Dish
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Variants & Add-ons</h3>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Link 
                href="/dashboard/menu/variants/new" 
                className="bg-orange-500 hover:bg-orange-700 text-white px-4 py-2 rounded"
              >
                Add Variant
              </Link>
              <Link 
                href="/dashboard/menu/addongroups/new" 
                className="bg-teal-500 hover:bg-teal-700 text-white px-4 py-2 rounded"
              >
                Add Addon Group
              </Link>
              <Link 
                href="/dashboard/menu/addons/new" 
                className="bg-pink-500 hover:bg-pink-700 text-white px-4 py-2 rounded"
              >
                Add Addon
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(category => (
          <div key={category._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-100 border-b">
              <h3 className="text-lg font-semibold">{category.categoryName}</h3>
              <p className="text-sm text-gray-500">{category.parentCategory}</p>
            </div>
            
            <div className="p-4">
              <div className="flex justify-end space-x-2">
                <Link 
                  href={`/dashboard/menu/categories/${category._id}`}
                  className="text-blue-500 hover:text-blue-700"
                >
                  View Details
                </Link>
                <Link 
                  href={`/dashboard/menu/categories/edit/${category._id}`}
                  className="text-yellow-500 hover:text-yellow-700"
                >
                  Edit
                </Link>
                {user?.role === 'admin' && (
                  <button 
                    className="text-red-500 hover:text-red-700"
                    // onClick={() => handleDeleteCategory(category._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500">No categories found. Start by adding a category.</p>
        </div>
      )}
    </div>
  );
}