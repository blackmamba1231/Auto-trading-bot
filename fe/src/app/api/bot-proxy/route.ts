import { NextRequest, NextResponse } from 'next/server';

const BOT_SERVER_URL = process.env.NEXT_PUBLIC_BOT_SERVER_URL || 'http://173.249.28.166:3001';

// Status endpoint - no authentication required
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'status';
  const botId = searchParams.get('botId');
  
  try {
    let url = `${BOT_SERVER_URL}/api/${endpoint}`;
    if (botId) {
      url += `?botId=${botId}`;
    }
    
    const headers: HeadersInit = {};
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(url, { headers });
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to bot server' },
      { status: 500 }
    );
  }
}

// Bot control endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${BOT_SERVER_URL}/api/bot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to bot server' },
      { status: 500 }
    );
  }
}
