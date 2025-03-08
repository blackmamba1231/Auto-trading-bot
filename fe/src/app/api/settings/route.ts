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

// Load API keys from settings file or use defaults
const loadApiKeys = async (): Promise<ApiKeys> => {
  try {
    const filePath = getSettingsFilePath();
    const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
    
    if (fileExists) {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
  }
  
  // Return default keys if file doesn't exist or there's an error
  return getDefaultApiKeys();
};

// Save API keys to settings file
const saveApiKeys = async (apiKeys: ApiKeys): Promise<boolean> => {
  try {
    const filePath = getSettingsFilePath();
    await fs.writeFile(filePath, JSON.stringify(apiKeys, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving API keys:', error);
    return false;
  }
};

// GET endpoint to retrieve current API keys
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const apiKeys = await loadApiKeys();
    
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
      data: maskedApiKeys
    });
  } catch (error) {
    console.error('Error getting API keys:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An error occurred while retrieving API keys'
    }, { status: 500 });
  }
}

// POST endpoint to update API keys
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { apiKeys } = body;
    
    if (!apiKeys || !apiKeys.azbit || !apiKeys.p2pb2b) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid API keys format'
      }, { status: 400 });
    }
    
    // Load current API keys to preserve secrets if they weren't changed (masked)
    const currentApiKeys = await loadApiKeys();
    
    // Only update secrets if they were actually changed (not masked)
    const updatedApiKeys: ApiKeys = {
      azbit: {
        apiKey: apiKeys.azbit.apiKey,
        apiSecret: apiKeys.azbit.apiSecret === '••••••••••••••••' 
          ? currentApiKeys.azbit.apiSecret 
          : apiKeys.azbit.apiSecret
      },
      p2pb2b: {
        apiKey: apiKeys.p2pb2b.apiKey,
        apiSecret: apiKeys.p2pb2b.apiSecret === '••••••••••••••••' 
          ? currentApiKeys.p2pb2b.apiSecret 
          : apiKeys.p2pb2b.apiSecret
      }
    };
    
    const success = await saveApiKeys(updatedApiKeys);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'API keys updated successfully'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save API keys'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating API keys:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'An error occurred while updating API keys'
    }, { status: 500 });
  }
}
