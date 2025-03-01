// Create a new file: src/app/debug/auth/page.js
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AuthDebugPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState({});
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Check all possible token locations
    const localStorageToken = localStorage.getItem('token');
    const sessionStorageToken = sessionStorage.getItem('token');
    
    // Extract cookies
    const cookies = document.cookie.split(';')
      .reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
    
    setToken({
      localStorage: localStorageToken || 'Not found',
      sessionStorage: sessionStorageToken || 'Not found',
      cookies
    });
    
    addLog('Checking token sources');
  }, []);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const testAuthEndpoint = async () => {
    try {
      addLog('Testing /api/auth/me endpoint');
      const token = localStorage.getItem('token');
      
      if (!token) {
        addLog('No token found in localStorage');
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      addLog(`Sending request with token: ${token.substring(0, 10)}...`);
      
      const response = await axios.get('/api/auth/me', config);
      
      addLog(`Response status: ${response.status}`);
      addLog(`Response data: ${JSON.stringify(response.data)}`);
      
      setStatus({ me: response.data });
    } catch (error) {
      addLog(`Error testing /api/auth/me: ${error.message}`);
      addLog(`Response status: ${error.response?.status}`);
      addLog(`Response data: ${JSON.stringify(error.response?.data)}`);
    }
  };

  const testCategoryEndpoint = async () => {
    try {
      addLog('Testing POST /api/menu/categories endpoint');
      const token = localStorage.getItem('token');
      
      if (!token) {
        addLog('No token found in localStorage');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };

      const testData = {
        categoryName: 'Debug Test Category',
        image: '',
        parentCategory: 'food'
      };

      addLog(`Sending POST request with config: ${JSON.stringify(config.headers)}`);
      addLog(`And data: ${JSON.stringify(testData)}`);
      
      const response = await axios.post('/api/menu/categories', testData, config);
      
      addLog(`Response status: ${response.status}`);
      addLog(`Response data: ${JSON.stringify(response.data)}`);
      
      setStatus({ categories: response.data });
    } catch (error) {
      addLog(`Error testing categories endpoint: ${error.message}`);
      addLog(`Response status: ${error.response?.status}`);
      addLog(`Response data: ${JSON.stringify(error.response?.data)}`);
    }
  };

  const loginAgain = async () => {
    try {
      addLog('Attempting login with admin/admin123');
      
      const response = await axios.post('/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      
      addLog(`Login response status: ${response.status}`);
      addLog(`Login response data: ${JSON.stringify(response.data)}`);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        addLog(`Token saved to localStorage: ${response.data.token.substring(0, 10)}...`);
        
        // Update token state
        setToken(prev => ({
          ...prev,
          localStorage: response.data.token
        }));
      } else {
        addLog('No token received from login');
      }
    } catch (error) {
      addLog(`Login error: ${error.message}`);
      addLog(`Response status: ${error.response?.status}`);
      addLog(`Response data: ${JSON.stringify(error.response?.data)}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Authentication Debug Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Token Sources</h2>
        <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(token, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Debug Actions</h2>
        <button 
          onClick={testAuthEndpoint}
          style={{ padding: '8px 16px', marginRight: '10px', cursor: 'pointer' }}
        >
          Test /api/auth/me
        </button>
        
        <button 
          onClick={testCategoryEndpoint}
          style={{ padding: '8px 16px', marginRight: '10px', cursor: 'pointer' }}
        >
          Test POST Categories
        </button>
        
        <button 
          onClick={loginAgain}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Login Again
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Response Status</h2>
        <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>
      
      <div>
        <h2>Debug Logs</h2>
        <div style={{ background: '#222', color: '#fff', padding: '10px', borderRadius: '4px', maxHeight: '300px', overflow: 'auto' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '5px', fontFamily: 'monospace' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}