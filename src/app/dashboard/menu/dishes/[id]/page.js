'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function DishDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [dish, setDish] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDishDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch dish details
        const dishResponse = await axios.get(`/api/menu/dishes/${id}`);
        setDish(dishResponse.data.data);
        
        // Fetch variants for this dish
        const variantsResponse = await axios.get(`/api/menu/variants?dish=${id}`);
        setVariants(variantsResponse.data.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch dish details');
        console.error('Error fetching dish details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDishDetails();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this dish? This action cannot be undone.')) {
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
      
      await axios.delete(`/api/menu/dishes/${id}`, config);
      
      router.push('/dashboard/menu');
    } catch (err) {
      setError('Failed to delete dish');
      console.error('Error deleting dish:', err);
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
  
  if (error || !dish) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Dish not found'}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dish: {dish.dishName}</h2>
        
        <div className="space-x-2">
          <Link
            href="/dashboard/menu"
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu
          </Link>
          
          <Link
            href={`/dashboard/menu/dishes/edit/${id}`}
            className="bg-yellow-500 hover:bg-yellow-700 text-white px-4 py-2 rounded"
          >
            Edit
          </Link>
          
          <Link
            href={`/dashboard/menu/variants/new?dish=${id}`}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Variant
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
      
      {/* Dish Details Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic information */}
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Dish Name</h3>
              <p className="flex items-center">
                {dish.dieteryTag === 'veg' && (
                  <span className="w-4 h-4 bg-green-500 rounded-full mr-2" title="Vegetarian"></span>
                )}
                {dish.dieteryTag === 'non veg' && (
                  <span className="w-4 h-4 bg-red-500 rounded-full mr-2" title="Non-Vegetarian"></span>
                )}
                {dish.dieteryTag === 'egg' && (
                  <span className="w-4 h-4 bg-yellow-500 rounded-full mr-2" title="Contains Egg"></span>
                )}
                {dish.dishName}
              </p>
            </div>
            
            {dish.shortCode && (
              <div>
                <h3 className="text-gray-700 font-bold mb-2">Short Code</h3>
                <p>{dish.shortCode}</p>
              </div>
            )}
            
            {dish.description && (
              <div className="md:col-span-2">
                <h3 className="text-gray-700 font-bold mb-2">Description</h3>
                <p>{dish.description}</p>
              </div>
            )}
            
            {dish.image && (
              <div className="md:col-span-2">
                <h3 className="text-gray-700 font-bold mb-2">Image</h3>
                <div className="border p-2 rounded-lg">
                  <img 
                    src={dish.image} 
                    alt={dish.dishName}
                    className="max-h-48 object-contain" 
                  />
                </div>
              </div>
            )}
            
            {dish.specialTag && (
              <div>
                <h3 className="text-gray-700 font-bold mb-2">Special Tag</h3>
                <p>{dish.specialTag}</p>
              </div>
            )}
            
            {dish.spiceLevel && (
              <div>
                <h3 className="text-gray-700 font-bold mb-2">Spice Level</h3>
                <p>{dish.spiceLevel}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Variants Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Variants</h3>
          
          <Link 
            href={`/dashboard/menu/variants/new?dish=${id}`}
            className="bg-orange-500 hover:bg-orange-700 text-white px-4 py-2 rounded"
          >
            Add Variant
          </Link>
        </div>
        
        {variants.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No variants found for this dish.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {variants.map(variant => (
              <div key={variant._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-100 border-b">
                  <h3 className="text-lg font-semibold">{variant.variantName}</h3>
                </div>
                
                {variant.image && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={variant.image} 
                      alt={variant.variantName}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                
                <div className="p-4">
                  {variant.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{variant.description}</p>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Link 
                      href={`/dashboard/menu/variants/${variant._id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
                    </Link>
                    <Link 
                      href={`/dashboard/menu/variants/edit/${variant._id}`}
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