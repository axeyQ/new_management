'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AddVariant() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [dishes, setDishes] = useState([]);
  const [formData, setFormData] = useState({
    variantName: '',
    description: '',
    image: '',
    shortCode: '',
    dishId: '',
    packagingCharges: {
      type: 'fixed',
      amount: '',
      appliedAt: 'dish'
    },
    natureTags: {
      cuisine: '',
      spiciness: '',
      sweetnessSaltness: '',
      texture: '',
      oil: '',
      temperature: '',
      cookingStyle: '',
      other: ''
    },
    statInclusion: false
  });
  
  const [loading, setLoading] = useState(false);
  const [dishesLoading, setDishesLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setDishesLoading(true);
        const response = await axios.get('/api/menu/dishes');
        setDishes(response.data.data);
      } catch (err) {
        console.error('Error fetching dishes:', err);
        setError('Failed to load dishes');
      } finally {
        setDishesLoading(false);
      }
    };
    
    fetchDishes();
  }, []);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.variantName || !formData.dishId) {
      setError('Variant name and dish are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      };
      
      // Convert string numbers to actual numbers
      const processedData = {
        ...formData,
        packagingCharges: {
          ...formData.packagingCharges,
          amount: formData.packagingCharges.amount ? Number(formData.packagingCharges.amount) : undefined
        }
      };
      
      await axios.post('/api/menu/variants', processedData, config);
      
      router.push('/dashboard/menu/dishes/' + formData.dishId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create variant');
      console.error('Error creating variant:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Add New Variant</h2>
        <Link 
          href="/dashboard/menu"
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Menu
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {dishesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="variantName" className="block text-gray-700 text-sm font-bold mb-2">
                    Variant Name *
                  </label>
                  <input
                    type="text"
                    id="variantName"
                    name="variantName"
                    value={formData.variantName}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="shortCode" className="block text-gray-700 text-sm font-bold mb-2">
                    Short Code
                  </label>
                  <input
                    type="text"
                    id="shortCode"
                    name="shortCode"
                    value={formData.shortCode}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">
                    Image URL
                  </label>
                  <input
                    type="text"
                    id="image"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div>
                  <label htmlFor="dishId" className="block text-gray-700 text-sm font-bold mb-2">
                    Dish *
                  </label>
                  <select
                    id="dishId"
                    name="dishId"
                    value={formData.dishId}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  >
                    <option value="">Select a dish</option>
                    {dishes.map(dish => (
                      <option key={dish._id} value={dish._id}>
                        {dish.dishName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Pricing & Taxes */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4">Pricing & Taxes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="packagingCharges.type" className="block text-gray-700 text-sm font-bold mb-2">
                    Packaging Charge Type
                  </label>
                  <select
                    id="packagingCharges.type"
                    name="packagingCharges.type"
                    value={formData.packagingCharges.type}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="packagingCharges.amount" className="block text-gray-700 text-sm font-bold mb-2">
                    Packaging Charge Amount
                  </label>
                  <input
                    type="number"
                    id="packagingCharges.amount"
                    name="packagingCharges.amount"
                    value={formData.packagingCharges.amount}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div>
                  <label htmlFor="packagingCharges.appliedAt" className="block text-gray-700 text-sm font-bold mb-2">
                    Applied At
                  </label>
                  <select
                    id="packagingCharges.appliedAt"
                    name="packagingCharges.appliedAt"
                    value={formData.packagingCharges.appliedAt}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="dish">Dish Level</option>
                    <option value="billing">Billing Level</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Nature Tags */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4">Nature Tags</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="natureTags.cuisine" className="block text-gray-700 text-sm font-bold mb-2">
                    Cuisine
                  </label>
                  <input
                    type="text"
                    id="natureTags.cuisine"
                    name="natureTags.cuisine"
                    value={formData.natureTags.cuisine}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.spiciness" className="block text-gray-700 text-sm font-bold mb-2">
                    Spiciness
                  </label>
                  <input
                    type="text"
                    id="natureTags.spiciness"
                    name="natureTags.spiciness"
                    value={formData.natureTags.spiciness}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.sweetnessSaltness" className="block text-gray-700 text-sm font-bold mb-2">
                    Sweetness/Saltiness
                  </label>
                  <input
                    type="text"
                    id="natureTags.sweetnessSaltness"
                    name="natureTags.sweetnessSaltness"
                    value={formData.natureTags.sweetnessSaltness}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.texture" className="block text-gray-700 text-sm font-bold mb-2">
                    Texture
                  </label>
                  <input
                    type="text"
                    id="natureTags.texture"
                    name="natureTags.texture"
                    value={formData.natureTags.texture}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.oil" className="block text-gray-700 text-sm font-bold mb-2">
                    Oil
                  </label>
                  <input
                    type="text"
                    id="natureTags.oil"
                    name="natureTags.oil"
                    value={formData.natureTags.oil}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.temperature" className="block text-gray-700 text-sm font-bold mb-2">
                    Temperature
                  </label>
                  <input
                    type="text"
                    id="natureTags.temperature"
                    name="natureTags.temperature"
                    value={formData.natureTags.temperature}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.cookingStyle" className="block text-gray-700 text-sm font-bold mb-2">
                    Cooking Style
                  </label>
                  <input
                    type="text"
                    id="natureTags.cookingStyle"
                    name="natureTags.cookingStyle"
                    value={formData.natureTags.cookingStyle}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="natureTags.other" className="block text-gray-700 text-sm font-bold mb-2">
                    Other
                  </label>
                  <input
                    type="text"
                    id="natureTags.other"
                    name="natureTags.other"
                    value={formData.natureTags.other}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
              </div>
            </div>
            
            {/* Extras */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-4">Additional Settings</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="statInclusion"
                  name="statInclusion"
                  checked={formData.statInclusion}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label htmlFor="statInclusion" className="text-gray-700">
                  Include in Statistics
                </label>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Variant'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}