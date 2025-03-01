'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AddSubCategory() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    subCategoryName: '',
    image: '',
    category: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await axios.get('/api/menu/categories');
        setCategories(response.data.data);
        
        // Set first category as default if available
        if (response.data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            category: response.data.data[0]._id
          }));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    fetchCategories();
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
    
    if (!formData.subCategoryName || !formData.category) {
      setError('Subcategory name and category are required');
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
      
      await axios.post('/api/menu/subcategories', formData, config);
      
      router.push('/dashboard/menu');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subcategory');
      console.error('Error creating subcategory:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Add New Subcategory</h2>
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
        {categoriesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="subCategoryName" className="block text-gray-700 text-sm font-bold mb-2">
                Subcategory Name *
              </label>
              <input
                type="text"
                id="subCategoryName"
                name="subCategoryName"
                value={formData.subCategoryName}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            
            <div className="mb-4">
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
            
            <div className="mb-6">
              <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.categoryName} ({category.parentCategory})
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
                {loading ? 'Saving...' : 'Save Subcategory'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}