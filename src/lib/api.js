// Create a new file: src/lib/api.js
import axios from 'axios';

/**
 * Makes an authenticated API request
 * @param {string} method - 'get', 'post', 'put', 'delete'
 * @param {string} url - API endpoint
 * @param {object} data - Request body (for POST, PUT)
 * @returns {Promise} - Axios response
 */
export const apiRequest = async (method, url, data = null) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Set request config with auth header
  const config = {
    headers: {
      'Content-Type': 'application/json',
      // Only add Authorization if token exists
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  // Make request based on method
  switch (method.toLowerCase()) {
    case 'get':
      return axios.get(url, config);
    case 'post':
      return axios.post(url, data, config);
    case 'put':
      return axios.put(url, data, config);
    case 'delete':
      return axios.delete(url, config);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
};