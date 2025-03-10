import axios from 'axios';
import { saveCategories, saveSubcategories } from '@/lib/indexedDB';

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

// Add a response interceptor that safely caches data without disrupting the flow
axiosWithAuth.interceptors.response.use(
  (response) => {
    // Only attempt to cache successful GET responses for menu data
    try {
      const url = response.config.url;
      const method = response.config.method;
      
      if (method === 'get' && response.data && response.data.success) {
        // Cache categories data
        if (url.includes('/api/menu/categories') && !url.includes('/stock')) {
          // Use setTimeout to not block the response
          setTimeout(() => {
            saveCategories(response.data.data).catch(err => {
              console.error('Error caching categories:', err);
            });
          }, 0);
        }
        
        // Cache subcategories data
        else if (url.includes('/api/menu/subcategories') && !url.includes('/stock')) {
          // Use setTimeout to not block the response
          setTimeout(() => {
            saveSubcategories(response.data.data).catch(err => {
              console.error('Error caching subcategories:', err);
            });
          }, 0);
        }
      }
    } catch (error) {
      // Just log the error but don't interrupt the response flow
      console.error('Error during response caching:', error);
    }
    
    // Always return the original response unmodified
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosWithAuth;