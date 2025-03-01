'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function AddonDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [addon, setAddon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAddonDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch addon details
        const addonResponse = await axios.get(`/api/menu/addons/${id}`);
        setAddon(addonResponse.data.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch addon details');
        console.error('Error fetching addon details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAddonDetails();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this addon? This action cannot be undone.')) {
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
      
      await axios.delete(`/api/menu/addons/${id}`, config);
      
      router.push('/dashboard/menu/addongroups');
    } catch (err) {
      setError('Failed to delete addon');
      console.error('Error deleting addon:', err);
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
  
  if (error || !addon) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Addon not found'}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Addon: {addon.name}</h2>
        
        <div className="space-x-2">
          <Link
            href={`/dashboard/menu/addongroups`}
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Addon Groups
          </Link>
          
          <Link
            href={`/dashboard/menu/addons/edit/${id}`}
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
      
      {/* Addon Details Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Name</h3>
              <p>{addon.name}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Price</h3>
              <p>${addon.price || '0.00'}</p>
            </div>
            
            {addon.dishReference && (
              <div>
                <h3 className="text-gray-700 font-bold mb-2">Referenced Dish</h3>
                <p>{addon.dishReference.dishName}</p>
              </div>
            )}
            
            {addon.availabilityStatus && (
              <div>
                <h3 className="text-gray-700 font-bold mb-2">Availability Status</h3>
                <div className="flex flex-wrap gap-2">
                  {addon.availabilityStatus.dineIn && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Dine-In</span>
                  )}
                  {addon.availabilityStatus.takeaway && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Takeaway</span>
                  )}
                  {addon.availabilityStatus.delivery && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Delivery</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}