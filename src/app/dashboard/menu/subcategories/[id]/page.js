'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function SubcategoryDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [subcategory, setSubcategory] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSubcategoryDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch subcategory details
        const subcategoryResponse = await axios.get(`/api/menu/subcategories/${id}`);
        setSubcategory(subcategoryResponse.data.data);
        
        // Fetch dishes for this subcategory
        const dishesResponse = await axios.get(`/api/menu/dishes?subcategory=${id}`);
        setDishes(dishesResponse.data.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch subcategory details');
        console.error('Error fetching subcategory details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubcategoryDetails();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this subcategory? This action cannot be undone.')) {
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
      
      await axios.delete(`/api/menu/subcategories/${id}`, config);
      
      router.push('/dashboard/menu');
    } catch (err) {
      setError('Failed to delete subcategory');
      console.error('Error deleting subcategory:', err);
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
  
  if (error || !subcategory) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Subcategory not found'}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Subcategory: {subcategory.subCategoryName}</h2>
        
        <div className="space-x-2">
          <Link
            href="/dashboard/menu"
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu
          </Link>
          
          <Link
            href={`/dashboard/menu/subcategories/edit/${id}`}
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
              <h3 className="text-gray-700 font-bold mb-2">Subcategory Name</h3>
              <p>{subcategory.subCategoryName}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Parent Category</h3>
              <p>{subcategory.category?.categoryName || 'N/A'}</p>
            </div>
            
            {subcategory.image && (
              <div className="md:col-span-2">
                <h3 className="text-gray-700 font-bold mb-2">Image</h3>
                <div className="border p-2 rounded-lg">
                  <img 
                    src={subcategory.image} 
                    alt={subcategory.subCategoryName}
                    className="max-h-48 object-contain" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Dishes</h3>
          
          <Link 
            href="/dashboard/menu/dishes/new" 
            className="bg-purple-500 hover:bg-purple-700 text-white px-4 py-2 rounded"
          >
            Add Dish
          </Link>
        </div>
        
        {dishes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No dishes found in this subcategory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dishes.map(dish => (
              <div key={dish._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-100 border-b">
                  <div className="flex items-center">
                    {dish.dieteryTag === 'veg' && (
                      <span className="w-4 h-4 bg-green-500 rounded-full mr-2"></span>
                    )}
                    {dish.dieteryTag === 'non veg' && (
                      <span className="w-4 h-4 bg-red-500 rounded-full mr-2"></span>
                    )}
                    {dish.dieteryTag === 'egg' && (
                      <span className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></span>
                    )}
                    <h3 className="text-lg font-semibold">{dish.dishName}</h3>
                  </div>
                  {dish.specialTag && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
                      {dish.specialTag}
                    </span>
                  )}
                </div>
                
                {dish.image && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={dish.image} 
                      alt={dish.dishName}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                
                <div className="p-4">
                  {dish.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{dish.description}</p>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Link 
                      href={`/dashboard/menu/dishes/${dish._id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
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
    </div>
  );
}