import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const readFilePromise = promisify(fs.readFile);
const existsPromise = promisify(fs.exists);

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key-for-trading-bot-authentication';

// Define type for decoded JWT token
interface DecodedToken {
  username: string;
  iat: number;
  exp: number;
}

// Helper function to verify JWT token
const verifyToken = (token: string): DecodedToken | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// Helper function to check authentication
const checkAuth = (request: NextRequest): boolean => {
  // For browser requests, check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      return true;
    }
  }
  
  // For API requests from the frontend, check the token in the request body
  return false;
};

// Define transaction type
interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// Create a mock data store for transaction history
// In a real implementation, this would come from a database or log files
const transactionStore: Record<string, Transaction[]> = {
  azbit: [],
  p2pb2b: []
};

// Function to parse log files or other data sources
async function getOrderBookData(botId: string) {
  try {
    // In a real implementation, this would read from actual log files or a database
    // For now, we'll return mock data that's more realistic
    
    // Simulate fetching real data from the bot
    const baseDir = process.cwd().replace(/\\fe$/, '');
    const orderBookPath = path.join(baseDir, `${botId}-orderbook.json`);
    
    // Check if the file exists
    const exists = await existsPromise(orderBookPath);
    
    if (exists) {
      // Read the file
      const data = await readFilePromise(orderBookPath, 'utf8');
      return JSON.parse(data);
    }
    
    // If file doesn't exist, return mock data
    return {
      lowestSell: botId === 'azbit' ? 0.29 : 0.0025,
      highestBuy: botId === 'azbit' ? 0.27 : 0.0023,
      spread: botId === 'azbit' ? 0.02 : 0.0002,
      lastOrderType: Math.random() > 0.5 ? 'buy' : 'sell'
    };
  } catch (error) {
    console.error(`Error getting order book data for ${botId}:`,error);
    // Return default data on error
    return {
      lowestSell: botId === 'azbit' ? 0.29 : 0.0025,
      highestBuy: botId === 'azbit' ? 0.27 : 0.0023,
      spread: botId === 'azbit' ? 0.02 : 0.0002,
      lastOrderType: null
    };
  }
}

async function getBalanceData(botId: string) {
  try {
    // In a real implementation, this would read from actual log files or a database
    const baseDir = process.cwd().replace(/\\fe$/, '');
    const balancePath = path.join(baseDir, `${botId}-balance.json`);
    
    // Check if the file exists
    const exists = await existsPromise(balancePath);
    
    if (exists) {
      // Read the file
      const data = await readFilePromise(balancePath, 'utf8');
      return JSON.parse(data);
    }
    
    // If file doesn't exist, return mock data
    return {
      crypto: botId === 'azbit' ? 1.5 : 5000,
      usdt: 5000 + Math.random() * 10000
    };
  } catch (error) {
    console.error(`Error getting balance data for ${botId}:`,error);
    // Return default data on error
    return {
      crypto: botId === 'azbit' ? 1.5 : 5000,
      usdt: 5000
    };
  }
}

async function getTransactionHistory(botId: string) {
  try {
    // In a real implementation, this would read from actual log files or a database
    const baseDir = process.cwd().replace(/\\fe$/, '');
    const transactionPath = path.join(baseDir, `${botId}-transactions.json`);
    
    // Check if the file exists
    const exists = await existsPromise(transactionPath);
    
    if (exists) {
      // Read the file
      const data = await readFilePromise(transactionPath, 'utf8');
      return JSON.parse(data);
    }
    
    // If no transactions exist yet, return empty array
    if (!transactionStore[botId] || transactionStore[botId].length === 0) {
      // Generate some initial mock transactions
      transactionStore[botId] = Array.from({ length: 5 }, (_, i) => {
        const type = i % 2 === 0 ? 'buy' : 'sell';
        const price = botId === 'azbit' ? 0.28 + (Math.random() * 0.02) : 0.0024 + (Math.random() * 0.0002);
        const amount = botId === 'azbit' ? 0.1 + (Math.random() * 0.5) : 1000 + (Math.random() * 5000);
        return {
          id: `tx-${botId}-${Date.now()}-${i}`,
          type,
          amount,
          price,
          total: price * amount,
          timestamp: new Date(Date.now() - i * 3600000 * 2).toLocaleString(),
          status: 'completed'
        };
      });
    }
    
    return transactionStore[botId];
  } catch (error) {
    console.error(`Error getting transaction history for ${botId}:`,error);
    return [];
  }
}

async function getPriceHistory(botId: string) {
  try {
    // In a real implementation, this would read from actual log files or a database
    const baseDir = process.cwd().replace(/\\fe$/, '');
    const historyPath = path.join(baseDir, `${botId}-price-history.json`);
    
    // Check if the file exists
    const exists = await existsPromise(historyPath);
    
    if (exists) {
      // Read the file
      const data = await readFilePromise(historyPath, 'utf8');
      return JSON.parse(data);
    }
    
    // If file doesn't exist, return mock data
    const basePrice = botId === 'azbit' ? 0.28 : 0.0024;
    const baseSpread = botId === 'azbit' ? 0.02 : 0.0002;
    
    return Array.from({ length: 6 }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000).toLocaleTimeString(),
      lowestSell: basePrice + (Math.random() * 0.02),
      highestBuy: basePrice - (Math.random() * 0.02),
      spread: baseSpread + (Math.random() * (baseSpread * 0.1))
    })).reverse();
  } catch (error) {
    console.error(`Error getting price history for ${botId}:`,error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId');
    
    if (!botId || !['azbit', 'p2pb2b'].includes(botId)) {
      return NextResponse.json({ success: false, error: 'Invalid bot ID' }, { status: 400 });
    }
    
    // Get all the data in parallel
    const [orderBook, balance, transactions, priceHistory] = await Promise.all([
      getOrderBookData(botId),
      getBalanceData(botId),
      getTransactionHistory(botId),
      getPriceHistory(botId)
    ]);
    
    return NextResponse.json({ 
      success: true, 
      data: {
        orderBook,
        balance,
        transactions,
        priceHistory,
        tradingPair: botId === 'azbit' ? 'BTCR/USDT' : 'BRIL/USDT'
      }
    });
  } catch (error) {
    console.error('Error getting bot data:',error);
    return NextResponse.json({ 
      success: false, 
      error: 'An error occurred' 
    }, { status: 500 });
  }
}
