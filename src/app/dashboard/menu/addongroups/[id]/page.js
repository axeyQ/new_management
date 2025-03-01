'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function AddonGroupDetails({ params }) {
  const { id } = params;
  const { user } = useAuth();
  const router = useRouter();
  
  const [addonGroup, setAddonGroup] = useState(null);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAddonGroupDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch addon group details
        const addonGroupResponse = await axios.get(`/api/menu/addongroups/${id}`);
        setAddonGroup(addonGroupResponse.data.data);
        
        // Fetch addons for this group
        const addonsResponse = await axios.get(`/api/menu/addons?group=${id}`);
        setAddons(addonsResponse.data.data);
        
        setError(null);
      } catch (err) {
        setError('Failed to fetch addon group details');
        console.error('Error fetching addon group details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAddonGroupDetails();
  }, [id]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this addon group? This action cannot be undone.')) {
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
      
      await axios.delete(`/api/menu/addongroups/${id}`, config);
      
      router.push('/dashboard/menu/addongroups');
    } catch (err) {
      setError('Failed to delete addon group');
      console.error('Error deleting addon group:', err);
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
  
  if (error || !addonGroup) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error || 'Addon group not found'}</span>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Addon Group: {addonGroup.name}</h2>
        
        <div className="space-x-2">
          <Link
            href="/dashboard/menu/addongroups"
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Addon Groups
          </Link>
          
          <Link
            href={`/dashboard/menu/addongroups/edit/${id}`}
            className="bg-yellow-500 hover:bg-yellow-700 text-white px-4 py-2 rounded"
          >
            Edit
          </Link>
          
          <Link
            href={`/dashboard/menu/addons/new?groupId=${id}`}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Addon
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
      
      {/* Addon Group Details Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Addon Group Name</h3>
              <p>{addonGroup.name}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Total Addons</h3>
              <p>{addons.length}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Created At</h3>
              <p>{new Date(addonGroup.createdAt).toLocaleString()}</p>
            </div>
            
            <div>
              <h3 className="text-gray-700 font-bold mb-2">Last Updated</h3>
              <p>{new Date(addonGroup.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Addons Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Addons</h3>
          
          <Link 
            href={`/dashboard/menu/addons/new?groupId=${id}`}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Addon
          </Link>
        </div>
        
        {addons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No addons found in this group.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map(addon => (
              <div key={addon._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-100 border-b">
                  <h3 className="text-lg font-semibold">{addon.name}</h3>
                </div>
                
                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-gray-700">
                      <span className="font-semibold">Price:</span> ${addon.price || '0.00'}
                    </p>
                    
                    {addon.dishReference && (
                      <p className="text-gray-700 mt-2">
                        <span className="font-semibold">Referenced Dish:</span> {addon.dishReference.dishName}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Link 
                      href={`/dashboard/menu/addons/${addon._id}`}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      View Details
                    </Link>
                    <Link 
                      href={`/dashboard/menu/addons/edit/${addon._id}`}
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