'use client';

import React, { useState, useEffect } from 'react';

export default function TestLoginPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Fetch environment variables (only public ones will be available)
    setDebugInfo({
      NEXT_PUBLIC_VALID_USERNAME: process.env.NEXT_PUBLIC_VALID_USERNAME || 'Not set (using default)',
      NEXT_PUBLIC_JWT_SECRET: process.env.NEXT_PUBLIC_JWT_SECRET ? 'Set (hidden)' : 'Not set (using default)',
      hasToken: localStorage.getItem('auth_token') ? 'Yes' : 'No'
    });
  }, []);

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      setResult({
        status: response.status,
        success: data.success,
        message: data.message || data.error,
        tokenReceived: !!data.token
      });
      
      if (data.token) {
        // Don't actually set the token, just for testing
        console.log('Token received but not stored');
      }
    } catch (error) {
      setResult({
        error: 'Error making request',
        details: (error as Error).message
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Login Debugging Page</h1>
      
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
        <p className="font-bold">Debug Only</p>
        <p>This page is for debugging login issues only.</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Environment Variables</h2>
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Test Login</h2>
        <form onSubmit={handleTestLogin} className="space-y-4">
          <div>
            <label className="block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Login
          </button>
        </form>
      </div>
      
      {result && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Result</h2>
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <div className="mt-6">
        <a href="/login" className="text-blue-500 hover:underline">Go to real login page</a>
      </div>
    </div>
  );
}
