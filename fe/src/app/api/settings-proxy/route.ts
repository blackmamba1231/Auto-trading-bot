import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Get bot server URL from environment variable
const BOT_SERVER_URL = process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'super121';

// Helper function to verify JWT token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

// Helper function to check authentication
const checkAuth = (request: NextRequest): boolean => {
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Forward the request to the bot server
    const response = await fetch(`${BOT_SERVER_URL}/api/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying settings GET request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to bot server'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to the bot server
    const response = await fetch(`${BOT_SERVER_URL}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying settings POST request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to bot server'
    }, { status: 500 });
  }
}
