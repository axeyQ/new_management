// Create file: src/lib/axiosWithAuth.js
import axios from 'axios';

// Create a custom axios instance
const axiosWithAuth = axios.create();

// Add a request interceptor to include the token in all requests
axiosWithAuth.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosWithAuth;