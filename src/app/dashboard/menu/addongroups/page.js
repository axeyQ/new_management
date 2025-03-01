'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

export default function AddonGroupsManagement() {
  const { user } = useAuth();
  const [addonGroups, setAddonGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAddonGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/menu/addongroups');
        setAddonGroups(response.data.data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch addon groups');
        console.error('Error fetching addon groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAddonGroups();
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
        <h2 className="text-2xl font-bold">Addon Groups Management</h2>
        
        <div className="space-x-2">
          <Link 
            href="/dashboard/menu" 
            className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Back to Menu
          </Link>
          <Link 
            href="/dashboard/menu/addongroups/new" 
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Add Addon Group
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {addonGroups.map(group => (
          <div key={group._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-100 border-b">
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <p className="text-sm text-gray-500">
                {group.addOns?.length || 0} addons
              </p>
            </div>
            
            <div className="p-4">
              <div className="flex justify-end space-x-2">
                <Link 
                  href={`/dashboard/menu/addongroups/${group._id}`}
                  className="text-blue-500 hover:text-blue-700"
                >
                  View Details
                </Link>
                <Link 
                  href={`/dashboard/menu/addongroups/edit/${group._id}`}
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

      {addonGroups.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500">No addon groups found. Start by adding an addon group.</p>
        </div>
      )}
    </div>
  );
}