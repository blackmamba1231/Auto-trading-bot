import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TransactionHistory from './TransactionHistory';

interface OrderBookData {
  lowestSell: number;
  highestBuy: number;
  spread: number;
  lastOrderType: 'buy' | 'sell' | null;
}

interface TradeData {
  time: string;
  lowestSell: number;
  highestBuy: number;
  spread: number;
}

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

interface BalanceCardProps {
  title: string;
  amount: number;
  currency: string;
}

interface BotDashboardProps {
  botName: string;
  tradingPair: string;
  isActive: boolean;
  botId: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ title, amount, currency }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 shadow-lg"
  >
    <h3 className="text-white text-lg font-medium">{title}</h3>
    <p className="text-white text-2xl font-bold mt-2">
      {amount.toFixed(currency === 'BTCR' || currency === 'BTC' ? 8 : 2)} {currency}
    </p>
  </motion.div>
);

const BotDashboard: React.FC<BotDashboardProps> = ({ botName, tradingPair, isActive, botId }) => {
  const [orderBook, setOrderBook] = React.useState<OrderBookData>({
    lowestSell: 0,
    highestBuy: 0,
    spread: 0,
    lastOrderType: null
  });
  const [tradeHistory, setTradeHistory] = React.useState<TradeData[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [balance, setBalance] = React.useState({
    crypto: 0,
    usdt: 0,
  });
  const [tradingPairInfo, setTradingPairInfo] = React.useState(tradingPair);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [authToken, setAuthToken] = React.useState<string | null>(null);

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

  // Fetch real data from API
  useEffect(() => {
    if (!isActive || !authToken) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/bot-data?botId=${botId}`, {
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
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch bot data');
        }
        
        const data = await response.json();
        
        if (data.success) {
          setOrderBook(data.data.orderBook);
          setTradeHistory(data.data.priceHistory);
          setTransactions(data.data.transactions);
          setBalance(data.data.balance);
          // Use the trading pair from the API response
          if (data.data.tradingPair) {
            setTradingPairInfo(data.data.tradingPair);
          }
        } else {
          throw new Error(data.error || 'Failed to fetch bot data');
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [botId, isActive, authToken]);

  if (!isActive) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          This bot is currently inactive. Start the bot to view its dashboard.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  // Get the correct crypto currency from the trading pair info
  const cryptoCurrency = tradingPairInfo.split('/')[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Trading Pair Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{tradingPairInfo}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">Lowest Sell</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">${orderBook.lowestSell.toFixed(2)}</p>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">Highest Buy</p>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200">${orderBook.highestBuy.toFixed(2)}</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">Spread</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">${orderBook.spread.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Last Order Type: <span className="font-bold capitalize">{orderBook.lastOrderType || 'None'}</span>
          </p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BalanceCard title={`${cryptoCurrency} Balance`} amount={balance.crypto} currency={cryptoCurrency} />
        <BalanceCard title="USDT Balance" amount={balance.usdt} currency="USDT" />
      </div>

      {/* Price History Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Price History</h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer>
            <LineChart data={tradeHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                name="Lowest Sell"
                dataKey="lowestSell"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                name="Highest Buy"
                dataKey="highestBuy"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                name="Spread"
                dataKey="spread"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction History */}
      <TransactionHistory transactions={transactions} />

     
    </motion.div>
  );
};

export default BotDashboard;
