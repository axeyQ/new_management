'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function AddDish() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [formData, setFormData] = useState({
    dishName: '',
    description: '',
    image: '',
    shortCode: '',
    subCategory: [],
    dieteryTag: 'veg',
    specialTag: '',
    spiceLevel: '',
    servingInfo: {
      portionSize: '',
      quantity: '',
      unit: 'grams',
      serves: ''
    },
    packagingCharges: {
      type: 'fixed',
      amount: '',
      appliedAt: 'dish'
    },
    gstItemType: 'goods',
    natureTags: {
      cuisine: '',
      spiciness: '',
      sweetnessSaltness: '',
      texture: '',
      oil: '',
      temperature: '',
      cookingStyle: '',
      other: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/menu/categories');
        setCategories(response.data.data);
        
        // Set first category as default if available
        if (response.data.data.length > 0) {
          setSelectedCategory(response.data.data[0]._id);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, []);
  
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (!selectedCategory) return;
      
      try {
        setDataLoading(true);
        const response = await axios.get(`/api/menu/subcategories?category=${selectedCategory}`);
        setSubcategories(response.data.data);
      } catch (err) {
        console.error('Error fetching subcategories:', err);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory]);
  
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
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
  
  const handleSubcategoryChange = (e) => {
    const options = e.target.options;
    const selected = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      subCategory: selected
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.dishName || formData.subCategory.length === 0) {
      setError('Dish name and at least one subcategory are required');
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
        servingInfo: {
          ...formData.servingInfo,
          quantity: formData.servingInfo.quantity ? Number(formData.servingInfo.quantity) : undefined,
          serves: formData.servingInfo.serves ? Number(formData.servingInfo.serves) : undefined
        },
        packagingCharges: {
          ...formData.packagingCharges,
          amount: formData.packagingCharges.amount ? Number(formData.packagingCharges.amount) : undefined
        }
      };
      
      await axios.post('/api/menu/dishes', processedData, config);
      
      router.push('/dashboard/menu');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create dish');
      console.error('Error creating dish:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Add New Dish</h2>
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dishName" className="block text-gray-700 text-sm font-bold mb-2">
                  Dish Name *
                </label>
                <input
                  type="text"
                  id="dishName"
                  name="dishName"
                  value={formData.dishName}
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
            </div>
          </div>
          
          {/* Category Selection */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Category & Subcategory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
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
              
              <div>
                <label htmlFor="subCategory" className="block text-gray-700 text-sm font-bold mb-2">
                  Subcategory * (Hold Ctrl/Cmd to select multiple)
                </label>
                <select
                  id="subCategory"
                  name="subCategory"
                  multiple
                  value={formData.subCategory}
                  onChange={handleSubcategoryChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  size="4"
                >
                  {dataLoading ? (
                    <option>Loading subcategories...</option>
                  ) : subcategories.length === 0 ? (
                    <option>No subcategories available</option>
                  ) : (
                    subcategories.map(subcat => (
                      <option key={subcat._id} value={subcat._id}>
                        {subcat.subCategoryName}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
          
          {/* Tags & Attributes */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Tags & Attributes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="dieteryTag" className="block text-gray-700 text-sm font-bold mb-2">
                  Dietary Tag
                </label>
                <select
                  id="dieteryTag"
                  name="dieteryTag"
                  value={formData.dieteryTag}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="veg">Vegetarian</option>
                  <option value="non veg">Non-Vegetarian</option>
                  <option value="egg">Contains Egg</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="specialTag" className="block text-gray-700 text-sm font-bold mb-2">
                  Special Tag
                </label>
                <select
                  id="specialTag"
                  name="specialTag"
                  value={formData.specialTag}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">None</option>
                  <option value="Chef&apos;s Special">Chef&apos;s Special</option>
                  <option value="Gluten Free">Gluten Free</option>
                  <option value="Jain">Jain</option>
                  <option value="Sugar Free">Sugar Free</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="spiceLevel" className="block text-gray-700 text-sm font-bold mb-2">
                  Spice Level
                </label>
                <select
                  id="spiceLevel"
                  name="spiceLevel"
                  value={formData.spiceLevel}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="">Not Specified</option>
                  <option value="Low Spicy">Low Spicy</option>
                  <option value="Medium Spicy">Medium Spicy</option>
                  <option value="Very Spicy">Very Spicy</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Serving Info */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-4">Serving Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="servingInfo.portionSize" className="block text-gray-700 text-sm font-bold mb-2">
                  Portion Size
                </label>
                <input
                  type="text"
                  id="servingInfo.portionSize"
                  name="servingInfo.portionSize"
                  value={formData.servingInfo.portionSize}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              
              <div>
                <label htmlFor="servingInfo.quantity" className="block text-gray-700 text-sm font-bold mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  id="servingInfo.quantity"
                  name="servingInfo.quantity"
                  value={formData.servingInfo.quantity}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              
              <div>
                <label htmlFor="servingInfo.unit" className="block text-gray-700 text-sm font-bold mb-2">
                  Unit
                </label>
                <select
                  id="servingInfo.unit"
                  name="servingInfo.unit"
                  value={formData.servingInfo.unit}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="grams">Grams</option>
                  <option value="ml">ML</option>
                  <option value="pieces">Pieces</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="servingInfo.serves" className="block text-gray-700 text-sm font-bold mb-2">
                  Serves
                </label>
                <input
                  type="number"
                  id="servingInfo.serves"
                  name="servingInfo.serves"
                  value={formData.servingInfo.serves}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
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
              
              <div>
                <label htmlFor="gstItemType" className="block text-gray-700 text-sm font-bold mb-2">
                  GST Item Type
                </label>
                <select
                  id="gstItemType"
                  name="gstItemType"
                  value={formData.gstItemType}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  <option value="goods">Goods</option>
                  <option value="services">Services</option>
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
          
          {/* Submit Button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Dish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}