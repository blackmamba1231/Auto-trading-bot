import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface BalanceCardProps {
  title: string;
  amount: number;
  currency: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ title, amount, currency }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 shadow-lg"
  >
    <h3 className="text-white text-lg font-medium">{title}</h3>
    <p className="text-white text-2xl font-bold mt-2">
      {amount.toFixed(currency === 'BTC' ? 8 : 2)} {currency}
    </p>
  </motion.div>
);

const Dashboard: React.FC = () => {
  const [orderBook, setOrderBook] = React.useState<OrderBookData>({
    lowestSell: 0,
    highestBuy: 0,
    spread: 0,
    lastOrderType: null
  });
  const [tradeHistory, setTradeHistory] = React.useState<TradeData[]>([]);
  const [balance] = React.useState({
    btc: 0,
    usdt: 0,
  });

  // Simulated data fetch - replace with actual API calls
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // This should be replaced with actual API calls to your bot's endpoints
        const mockData = {
          lowestSell: 45000,
          highestBuy: 44800,
          spread: 200,
          lastOrderType: 'buy' as const
        };
        setOrderBook(mockData);

        // Mock trade history
        const history = Array.from({ length: 6 }, (_, i) => ({
          time: new Date(Date.now() - i * 3600000).toLocaleTimeString(),
          lowestSell: 45000 + Math.random() * 1000,
          highestBuy: 44800 + Math.random() * 1000,
          spread: 200 + Math.random() * 50
        })).reverse();
        setTradeHistory(history);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      {/* Trading Pair Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">BTCR/USDT</h2>
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

      {/* Volume Range Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Bot Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Volume Range</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">1 - 2 BTCR</p>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">Time Range</p>
            <p className="text-lg font-bold text-gray-800 dark:text-white">1 - 15 minutes</p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BalanceCard title="BTC Balance" amount={balance.btc} currency="BTC" />
        <BalanceCard title="USDT Balance" amount={balance.usdt} currency="USDT" />
      </div>
    </motion.div>
  );
};

export default Dashboard;
