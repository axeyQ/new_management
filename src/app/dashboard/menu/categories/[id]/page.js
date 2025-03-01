'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function CategoryDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch category details
        const categoryResponse = await axios.get(`/api/menu/categories/${id}`);
        setCategory(categoryResponse.data.data);
        
        // Fetch subcategories for this category
        const subcategoriesResponse = await axios.get(`/api/menu/subcategories?category=${id}`);
        setSubcategories(subcategoriesResponse.data.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch category details');
        console.error('Error fetching category details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategoryDetails();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };
      
      await axios.delete(`/api/menu/categories/${id}`, config);
      
      router.push('/dashboard/menu');
    } catch (err) {
      setError('Failed to delete category');
      console.error('Error deleting category:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !category) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Category not found'}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Category Details: {category.categoryName}</h2>
        
        <div className="space-x-2">
          <Link
            href="/dashboard/menu"
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu
          </Link>
          
          <Link
            href={`/dashboard/menu/categories/edit/${id}`}
            className="bg-yellow-500 hover:bg-yellow-700 text-white px-4 py-2 rounded"
          >
            Edit
          </Link>
          
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Category Name</h3>
              <p>{category.categoryName}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Parent Category</h3>
              <p className="capitalize">{category.parentCategory}</p>
            </div>
            
            {category.image && (
              <div className="md:col-span-2">
                <h3 className="text-gray-700 font-bold mb-2">Image</h3>
                <div className="border p-2 rounded-lg">
                  <img 
                    src={category.image} 
                    alt={category.categoryName}
                    className="max-h-48 object-contain" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Subcategories</h3>
        
        {subcategories.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No subcategories found in this category.</p>
            <Link 
              href="/dashboard/menu/subcategories/new" 
              className="inline-block mt-4 text-blue-500 hover:text-blue-700"
            >
              + Add a subcategory
            </Link>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subcategories.map(subcategory => (
              <div key={subcategory._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-100 border-b">
                  <h3 className="text-lg font-semibold">{subcategory.subCategoryName}</h3>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-end space-x-2">
                    <Link 
                      href={`/dashboard/menu/subcategories/${subcategory._id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
                    </Link>
                    <Link 
                      href={`/dashboard/menu/subcategories/edit/${subcategory._id}`}
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
    </div>
  );
}