import React, { useState, useEffect, useCallback } from 'react';
import BotControlPanel from './BotControlPanel';
import BotDashboard from './BotDashboard';

interface BotStatus {
  running: boolean;
}

interface BotAction {
  isLoading: boolean;
  error: string | null;
}

const BotManager: React.FC = () => {
  // Bot status
  const [azbitStatus, setAzbitStatus] = useState<BotStatus>({ running: false });
  const [p2pb2bStatus, setP2pb2bStatus] = useState<BotStatus>({ running: false });
  
  // Loading states for actions
  const [azbitAction, setAzbitAction] = useState<BotAction>({ isLoading: false, error: null });
  const [p2pb2bAction, setP2pb2bAction] = useState<BotAction>({ isLoading: false, error: null });

  // Error display
  const [error, setError] = useState<string | null>(null);
  
  // Authentication token
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get authentication token on component mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Redirect to login if no token found
      window.location.href = '/login';
      return;
    }
    setAuthToken(token);
  }, []);

  // Define fetchBotStatus with useCallback to prevent infinite re-renders
  const fetchBotStatus = useCallback(async (botId: string) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`/api/bot?botId=${botId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to fetch ${botId} status`);
      }
      
      if (botId === 'azbit') {
        setAzbitStatus({ running: data.data.running });
      } else {
        setP2pb2bStatus({ running: data.data.running });
      }
      
      console.log(`${botId} status:`, data.data.running ? 'Running' : 'Stopped');
    } catch (error) {
      console.error(`Error fetching ${botId} status:`, error);
      // Don't set error state here to avoid UI disruption during polling
    }
  }, [authToken]);

  // Fetch bot status on component mount
  useEffect(() => {
    if (authToken) {
      fetchBotStatus('azbit');
      fetchBotStatus('p2pb2b');

      // Poll for status updates every 10 seconds
      const interval = setInterval(() => {
        fetchBotStatus('azbit');
        fetchBotStatus('p2pb2b');
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [authToken, fetchBotStatus]);

  const handleStartBot = async (botId: string) => {
    if (!authToken) return;
    
    try {
      // Set loading state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: true, error: null });
      } else {
        setP2pb2bAction({ isLoading: true, error: null });
      }
      
      // Clear any previous errors
      setError(null);
      
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'start',
          botId,
        }),
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to start ${botId} bot`);
      }
      
      // Update bot status
      await fetchBotStatus(botId);
      
      console.log(`${botId} bot started successfully`);
    } catch (error) {
      console.error(`Error starting ${botId} bot:`, error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      // Clear loading state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: false, error: null });
      } else {
        setP2pb2bAction({ isLoading: false, error: null });
      }
    }
  };

  const handleStopBot = async (botId: string) => {
    if (!authToken) return;
    
    try {
      // Set loading state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: true, error: null });
      } else {
        setP2pb2bAction({ isLoading: true, error: null });
      }
      
      // Clear any previous errors
      setError(null);
      
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          action: 'stop',
          botId,
        }),
      });
      
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to stop ${botId} bot`);
      }
      
      // Update bot status
      await fetchBotStatus(botId);
      
      console.log(`${botId} bot stopped successfully`);
    } catch (error) {
      console.error(`Error stopping ${botId} bot:`, error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      // Clear loading state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: false, error: null });
      } else {
        setP2pb2bAction({ isLoading: false, error: null });
      }
    }
  };

  if (!authToken) {
    return null; // Don't render anything until we have the auth token
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Close</span>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BotControlPanel
          botName="Azbit Trading Bot"
          botId="azbit"
          isRunning={azbitStatus.running}
          isLoading={azbitAction.isLoading}
          onStart={() => handleStartBot('azbit')}
          onStop={() => handleStopBot('azbit')}
        />
        <BotControlPanel
          botName="P2PB2B Trading Bot"
          botId="p2pb2b"
          isRunning={p2pb2bStatus.running}
          isLoading={p2pb2bAction.isLoading}
          onStart={() => handleStartBot('p2pb2b')}
          onStop={() => handleStopBot('p2pb2b')}
        />
      </div>

      {/* Dashboards */}
      <div className="space-y-8">
        {azbitStatus.running && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Azbit Bot Dashboard</h2>
            </div>
            <BotDashboard
              tradingPair="BTC/USDT"
              isActive={azbitStatus.running}
              botId="azbit"
            />
          </div>
        )}
        
        {p2pb2bStatus.running && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">P2PB2B Bot Dashboard</h2>
            </div>
            <BotDashboard
              tradingPair="BTCR/USDT"
              isActive={p2pb2bStatus.running}
              botId="p2pb2b"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BotManager;
