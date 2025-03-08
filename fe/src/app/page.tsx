"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BotManager = dynamic(() => import('../components/BotManager'), {
  ssr: false
});

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    console.log('Home page - Checking authentication');
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    console.log('Token exists:', !!token);
    
    if (!token) {
      console.log('No token found, redirecting to login');
      window.location.href = '/login';
      return;
    }

    try {
      // For now, we'll just check if token exists
      console.log('Token found, setting authenticated state');
      setIsAuthenticated(true);
      setUsername('Admin');
      setIsLoading(false);
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }, []);

  const handleLogout = () => {
    console.log('Logging out');
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Auto Trading Bot Manager
          </h1>
          <div className="flex items-center">
            <span className="mr-4 text-gray-600 dark:text-gray-300">Welcome, {username}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <BotManager />
        </div>
      </main>
    </div>
  );
}
