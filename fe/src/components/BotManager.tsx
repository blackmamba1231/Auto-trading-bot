import React, { useState, useEffect, useCallback } from 'react';
import BotControlPanel from './BotControlPanel';
import BotDashboard from './BotDashboard';
import Link from 'next/link';
import { getBotStatus, startBot, stopBot, checkServerStatus } from '../services/botService';

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
  
  // Server status
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  
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

  // Check server connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkServerStatus();
        setServerConnected(status.success);
        
        if (status.success && status.status) {
          // Update bot statuses from server
          setAzbitStatus({ running: status.status.azbit });
          setP2pb2bStatus({ running: status.status.p2pb2b });
        }
      } catch (error) {
        console.error('Error checking server connection:', error);
        setServerConnected(false);
      }
    };
    
    if (authToken) {
      checkConnection();
      // Check connection every 30 seconds
      const interval = setInterval(checkConnection, 30000);
      return () => clearInterval(interval);
    }
  }, [authToken]);

  // Define fetchBotStatus with useCallback to prevent infinite re-renders
  const fetchBotStatus = useCallback(async (botId: string) => {
    if (!authToken || !serverConnected) return;
    
    try {
      const status = await getBotStatus(botId);
      
      if (botId === 'azbit') {
        setAzbitStatus(status);
      } else if (botId === 'p2pb2b') {
        setP2pb2bStatus(status);
      }
    } catch (error) {
      console.error(`Error fetching ${botId} status:`, error);
      setError(`Failed to get ${botId} bot status: ${(error as Error).message}`);
    }
  }, [authToken, serverConnected]);

  // Fetch bot statuses periodically
  useEffect(() => {
    if (!authToken || !serverConnected) return;
    
    // Initial fetch
    fetchBotStatus('azbit');
    fetchBotStatus('p2pb2b');
    
    // Set up interval for periodic fetching
    const interval = setInterval(() => {
      fetchBotStatus('azbit');
      fetchBotStatus('p2pb2b');
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [authToken, fetchBotStatus, serverConnected]);

  // Handle starting a bot
  const handleStartBot = async (botId: string) => {
    if (!authToken || !serverConnected) {
      setError('Cannot connect to bot server');
      return;
    }
    
    // Set loading state
    if (botId === 'azbit') {
      setAzbitAction({ isLoading: true, error: null });
    } else {
      setP2pb2bAction({ isLoading: true, error: null });
    }
    
    try {
      const response = await startBot(botId);
      
      if (!response.success) {
        throw new Error(response.error || `Failed to start ${botId} bot`);
      }
      
      // Update bot status
      if (botId === 'azbit') {
        setAzbitStatus({ running: true });
        setAzbitAction({ isLoading: false, error: null });
      } else {
        setP2pb2bStatus({ running: true });
        setP2pb2bAction({ isLoading: false, error: null });
      }
    } catch (error) {
      console.error(`Error starting ${botId} bot:`, error);
      
      // Update error state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: false, error: (error as Error).message });
      } else {
        setP2pb2bAction({ isLoading: false, error: (error as Error).message });
      }
      
      setError(`Failed to start ${botId} bot: ${(error as Error).message}`);
    }
  };

  // Handle stopping a bot
  const handleStopBot = async (botId: string) => {
    if (!authToken || !serverConnected) {
      setError('Cannot connect to bot server');
      return;
    }
    
    // Set loading state
    if (botId === 'azbit') {
      setAzbitAction({ isLoading: true, error: null });
    } else {
      setP2pb2bAction({ isLoading: true, error: null });
    }
    
    try {
      const response = await stopBot(botId);
      
      if (!response.success) {
        throw new Error(response.error || `Failed to stop ${botId} bot`);
      }
      
      // Update bot status
      if (botId === 'azbit') {
        setAzbitStatus({ running: false });
        setAzbitAction({ isLoading: false, error: null });
      } else {
        setP2pb2bStatus({ running: false });
        setP2pb2bAction({ isLoading: false, error: null });
      }
    } catch (error) {
      console.error(`Error stopping ${botId} bot:`, error);
      
      // Update error state
      if (botId === 'azbit') {
        setAzbitAction({ isLoading: false, error: (error as Error).message });
      } else {
        setP2pb2bAction({ isLoading: false, error: (error as Error).message });
      }
      
      setError(`Failed to stop ${botId} bot: ${(error as Error).message}`);
    }
  };

  if (!authToken) {
    return null; // Don't render anything until we have the auth token
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Bot Dashboard</h1>
        <div className="flex space-x-4">
          <div className={`flex items-center ${serverConnected ? 'text-green-500' : 'text-red-500'}`}>
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${serverConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>{serverConnected ? 'Server Connected' : 'Server Disconnected'}</span>
          </div>
          <Link href="/settings" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
            API Settings
          </Link>
        </div>
      </div>
      
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
      
      {!serverConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Warning: </strong>
          <span className="block sm:inline">
            Cannot connect to the bot server. Please make sure the server is running at {process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://173.249.28.166:3001'}.
          </span>
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
          disabled={!serverConnected}
        />
        <BotControlPanel
          botName="P2PB2B Trading Bot"
          botId="p2pb2b"
          isRunning={p2pb2bStatus.running}
          isLoading={p2pb2bAction.isLoading}
          onStart={() => handleStartBot('p2pb2b')}
          onStop={() => handleStopBot('p2pb2b')}
          disabled={!serverConnected}
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
