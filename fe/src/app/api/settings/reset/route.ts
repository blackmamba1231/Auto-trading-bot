import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';

// Use environment variable for JWT secret
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'super121';

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
  
  return false;
};

// Define API keys interface
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

// Path to the settings file
const getSettingsFilePath = () => {
  const rootDir = process.cwd().replace(/\\fe$/, '');
  return path.join(rootDir, 'api-settings.json');
};

// Default API keys (from environment variables or fallback to empty)
const getDefaultApiKeys = (): ApiKeys => {
  return {
    azbit: {
      apiKey: process.env.AZBIT_API_KEY || '',
      apiSecret: process.env.AZBIT_API_SECRET || ''
    },
    p2pb2b: {
      apiKey: process.env.P2PB2B_API_KEY || '',
      apiSecret: process.env.P2PB2B_API_SECRET || ''
    }
  };
};

// Reset API keys to default values
const resetApiKeys = async (): Promise<ApiKeys> => {
  try {
    const filePath = getSettingsFilePath();
    const defaultKeys = getDefaultApiKeys();
    
    // Write default keys to settings file
    await fs.writeFile(filePath, JSON.stringify(defaultKeys, null, 2), 'utf8');
    
    return defaultKeys;
  } catch (error) {
    console.error('Error resetting API keys:', error);
    // Return defaults even if saving fails
    return getDefaultApiKeys();
  }
};

// POST endpoint to reset API keys to default values
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const apiKeys = await resetApiKeys();
    
    // Mask secrets for security
    const maskedApiKeys = {
      azbit: {
        apiKey: apiKeys.azbit.apiKey,
        apiSecret: apiKeys.azbit.apiSecret ? '••••••••••••••••' : ''
      },
      p2pb2b: {
        apiKey: apiKeys.p2pb2b.apiKey,
        apiSecret: apiKeys.p2pb2b.apiSecret ? '••••••••••••••••' : ''
      }
    };
    
    return NextResponse.json({
      success: true,
      message: 'API keys reset to default values',
      data: maskedApiKeys
    });
  } catch (error) {
    console.error('Error resetting API keys:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An error occurred while resetting API keys'
    }, { status: 500 });
  }
}
