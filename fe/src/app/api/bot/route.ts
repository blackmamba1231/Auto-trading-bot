import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key-for-trading-bot-authentication';

// Helper function to verify JWT token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Helper function to check authentication
const checkAuth = (request: NextRequest) => {
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

// Store bot process IDs
let botProcesses: Record<string, { process: any; running: boolean }> = {
  azbit: { process: null, running: false },
  p2pb2b: { process: null, running: false }
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, botId } = await request.json();

    if (!botId || !['azbit', 'p2pb2b'].includes(botId)) {
      return NextResponse.json({ success: false, error: 'Invalid bot ID' }, { status: 400 });
    }

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Get the root directory (outside of /fe)
    const rootDir = process.cwd().replace(/\\fe$/, '');

    if (action === 'start') {
      // Check if bot is already running
      if (botProcesses[botId].running) {
        return NextResponse.json({ success: false, error: 'Bot is already running' }, { status: 400 });
      }

      // Determine which script to run based on botId
      const scriptPath = botId === 'azbit' ? 'index.js' : 'index2.js';
      const fullScriptPath = path.join(rootDir, scriptPath);

      // Check if the script exists
      if (!fs.existsSync(fullScriptPath)) {
        return NextResponse.json({ 
          success: false, 
          error: `Script ${scriptPath} not found` 
        }, { status: 404 });
      }

      try {
        // Start the bot process detached so it continues running after the API request completes
        const process = spawn('node', [scriptPath], {
          cwd: rootDir,
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });

        // Unref the process to allow the Node.js event loop to exit even if the process is still running
        process.unref();

        // Store the process reference
        botProcesses[botId] = {
          process: process,
          running: true
        };

        // Create a marker file to indicate the bot is running
        fs.writeFileSync(path.join(rootDir, `${botId}-running.txt`), 'running');

        return NextResponse.json({ 
          success: true, 
          message: `${botId} bot started successfully`,
          pid: process.pid
        });
      } catch (error) {
        console.error(`Error starting ${botId} bot:`, error);
        return NextResponse.json({ 
          success: false, 
          error: `Failed to start ${botId} bot: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    } else if (action === 'stop') {
      // Check if bot is running based on marker file
      const markerFile = path.join(rootDir, `${botId}-running.txt`);
      const isRunning = fs.existsSync(markerFile);

      if (!isRunning) {
        return NextResponse.json({ success: false, error: 'Bot is not running' }, { status: 400 });
      }

      try {
        // If we have a process reference, try to kill it
        if (botProcesses[botId].process) {
          // On Windows, we need to use taskkill to kill the process tree
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', botProcesses[botId].process.pid.toString(), '/f', '/t']);
          } else {
            process.kill(-botProcesses[botId].process.pid); // Negative PID kills the process group
          }
        }

        // Remove the marker file
        fs.unlinkSync(markerFile);

        // Update the process status
        botProcesses[botId] = {
          process: null,
          running: false
        };

        return NextResponse.json({ 
          success: true, 
          message: `${botId} bot stopped successfully` 
        });
      } catch (error) {
        console.error(`Error stopping ${botId} bot:`, error);
        
        // Even if there's an error, try to remove the marker file and update status
        try {
          if (fs.existsSync(markerFile)) {
            fs.unlinkSync(markerFile);
          }
          botProcesses[botId].running = false;
        } catch (e) {
          console.error('Error cleaning up after failed stop:', e);
        }

        return NextResponse.json({ 
          success: false, 
          error: `Failed to stop ${botId} bot: ${error instanceof Error ? error.message : 'Unknown error'}`
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling bot action:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An error occurred' 
    }, { status: 500 });
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
    
    // Check if the marker file exists to determine if the bot is running
    const rootDir = process.cwd().replace(/\\fe$/, '');
    const markerFile = path.join(rootDir, `${botId}-running.txt`);
    const isRunning = fs.existsSync(markerFile);
    
    // Update our in-memory state to match the file system
    botProcesses[botId].running = isRunning;
    
    return NextResponse.json({ 
      success: true, 
      data: {
        running: isRunning
      }
    });
  } catch (error: any) {
    console.error('Error getting bot status:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'An error occurred' 
    }, { status: 500 });
  }
}
