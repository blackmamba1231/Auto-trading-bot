// Bot service for communicating with the VPS bot server via proxy

// Use the proxy API route instead of directly connecting to the VPS
const API_BASE_URL = '/api/bot-proxy';

// Function to get the auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Interface for bot status
export interface BotStatus {
  running: boolean;
}

// Interface for API response
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  running?: boolean;
  status?: {
    azbit: boolean;
    p2pb2b: boolean;
  };
}

// Check server status (no auth required)
export const checkServerStatus = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}?endpoint=status`);
    return await response.json();
  } catch (error) {
    console.error('Error checking server status:', error);
    return {
      success: false,
      error: 'Could not connect to bot server'
    };
  }
};

// Get bot status
export const getBotStatus = async (botId: string): Promise<BotStatus> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}?endpoint=bot&botId=${botId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to get bot status');
    }

    return { running: data.running };
  } catch (error) {
    console.error(`Error getting ${botId} status:`, error);
    return { running: false };
  }
};

// Start bot
export const startBot = async (botId: string): Promise<ApiResponse> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'start',
        botId
      })
    });

    return await response.json();
  } catch (error) {
    console.error(`Error starting ${botId} bot:`, error);
    return {
      success: false,
      error: `Failed to start ${botId} bot: ${(error as Error).message}`
    };
  }
};

// Stop bot
export const stopBot = async (botId: string): Promise<ApiResponse> => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'stop',
        botId
      })
    });

    return await response.json();
  } catch (error) {
    console.error(`Error stopping ${botId} bot:`, error);
    return {
      success: false,
      error: `Failed to stop ${botId} bot: ${(error as Error).message}`
    };
  }
};
