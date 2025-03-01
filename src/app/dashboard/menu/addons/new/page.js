'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function AddAddon() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [addonGroups, setAddonGroups] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    addonGroupId: '',
    dishReference: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch addon groups
        const groupsResponse = await axios.get('/api/menu/addongroups');
        setAddonGroups(groupsResponse.data.data);
        
        // Fetch dishes for reference
        const dishesResponse = await axios.get('/api/menu/dishes');
        setDishes(dishesResponse.data.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.addonGroupId) {
      setError('Addon name and group are required');
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
      
      // Process form data
      const processedData = {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined
      };
      
      await axios.post('/api/menu/addons', processedData, config);
      
      router.push(`/dashboard/menu/addongroups/${formData.addonGroupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create addon');
      console.error('Error creating addon:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Add New Addon</h2>
        <Link 
          href="/dashboard/menu/addongroups"
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Back to Addon Groups
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {dataLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
                Addon Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="addonGroupId" className="block text-gray-700 text-sm font-bold mb-2">
                Addon Group *
              </label>
              <select
                id="addonGroupId"
                name="addonGroupId"
                value={formData.addonGroupId}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select an addon group</option>
                {addonGroups.map(group => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label htmlFor="dishReference" className="block text-gray-700 text-sm font-bold mb-2">
                Reference Dish (Optional)
              </label>
              <select
                id="dishReference"
                name="dishReference"
                value={formData.dishReference}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">None</option>
                {dishes.map(dish => (
                  <option key={dish._id} value={dish._id}>
                    {dish.dishName}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Addon'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}