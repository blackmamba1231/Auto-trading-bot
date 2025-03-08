"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ApiKeys {
  azbit: {
    apiKey: string;
    apiSecret: string;
  };
  p2pb2b: {
    apiKey: string;
    apiSecret: string;
  };
}

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    azbit: {
      apiKey: '',
      apiSecret: ''
    },
    p2pb2b: {
      apiKey: '',
      apiSecret: ''
    }
  });

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    
    // Fetch current API keys
    fetchApiKeys();
    
    setIsAuthenticated(true);
    setIsLoading(false);
  }, []);

  // Fetch current API keys from server
  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      // Use default empty values
    }
  };

  // Handle input changes
  const handleInputChange = (exchange: 'azbit' | 'p2pb2b', field: 'apiKey' | 'apiSecret', value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [exchange]: {
        ...prev[exchange],
        [field]: value
      }
    }));
  };

  // Save API keys
  const saveApiKeys = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ apiKeys })
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to save API keys');
        setSaveSuccess(false);
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      setErrorMessage('An error occurred while saving API keys');
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default API keys
  const resetToDefault = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setApiKeys(data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to reset API keys');
        setSaveSuccess(false);
      }
    } catch (error) {
      console.error('Error resetting API keys:', error);
      setErrorMessage('An error occurred while resetting API keys');
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Settings</h1>
            <Link href="/" className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Back to Dashboard
            </Link>
          </div>
          
          {saveSuccess === true && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
              API keys saved successfully!
            </div>
          )}
          
          {saveSuccess === false && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {errorMessage || 'Failed to save API keys'}
            </div>
          )}
          
          <div className="space-y-8">
            {/* Azbit API Keys */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Azbit API Keys</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="azbit-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    id="azbit-api-key"
                    type="text"
                    value={apiKeys.azbit.apiKey}
                    onChange={(e) => handleInputChange('azbit', 'apiKey', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter Azbit API Key"
                  />
                </div>
                <div>
                  <label htmlFor="azbit-api-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Secret
                  </label>
                  <input
                    id="azbit-api-secret"
                    type="password"
                    value={apiKeys.azbit.apiSecret}
                    onChange={(e) => handleInputChange('azbit', 'apiSecret', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter Azbit API Secret"
                  />
                </div>
              </div>
            </div>
            
            {/* P2PB2B API Keys */}
            <div className="pb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">P2PB2B API Keys</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="p2pb2b-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    id="p2pb2b-api-key"
                    type="text"
                    value={apiKeys.p2pb2b.apiKey}
                    onChange={(e) => handleInputChange('p2pb2b', 'apiKey', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter P2PB2B API Key"
                  />
                </div>
                <div>
                  <label htmlFor="p2pb2b-api-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Secret
                  </label>
                  <input
                    id="p2pb2b-api-secret"
                    type="password"
                    value={apiKeys.p2pb2b.apiSecret}
                    onChange={(e) => handleInputChange('p2pb2b', 'apiSecret', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter P2PB2B API Secret"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button
                onClick={resetToDefault}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                Reset to Default
              </button>
              <button
                onClick={saveApiKeys}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Save API Keys'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
