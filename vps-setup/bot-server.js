const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret for authentication
const JWT_SECRET = process.env.JWT_SECRET || 'super121';

// CORS configuration - update this with your frontend URL when deployed
app.use(cors({
  origin: ['http://localhost:3000', 'https://auto-trading-bot.vercel.app','https://auto-trading-bot-2c1d.vercel.app','www.digitalsource.us'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Path to bot scripts - adjust these paths based on your VPS setup
const BOT_SCRIPTS_DIR = process.env.BOT_SCRIPTS_DIR || path.join(__dirname, '..');

// Store bot processes
const botProcesses = {
  azbit: { process: null, running: false },
  p2pb2b: { process: null, running: false }
};

// Check if bots were running before server restart
const checkExistingBots = () => {
  try {
    if (fs.existsSync(path.join(BOT_SCRIPTS_DIR, 'azbit-running.txt'))) {
      botProcesses.azbit.running = true;
      console.log('Found existing azbit bot marker, marking as running');
    }
    if (fs.existsSync(path.join(BOT_SCRIPTS_DIR, 'p2pb2b-running.txt'))) {
      botProcesses.p2pb2b.running = true;
      console.log('Found existing p2pb2b bot marker, marking as running');
    }
  } catch (error) {
    console.error('Error checking existing bots:', error);
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  // Add user info to request
  req.user = decoded;
  next();
};

// Status endpoint - no authentication required
app.get('/api/status', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Bot server is running',
    status: {
      azbit: botProcesses.azbit.running,
      p2pb2b: botProcesses.p2pb2b.running
    }
  });
});

// Bot status endpoint
app.get('/api/bot', authenticate, (req, res) => {
  const { botId } = req.query;
  
  if (!botId || !['azbit', 'p2pb2b'].includes(botId)) {
    return res.status(400).json({ success: false, error: 'Invalid bot ID' });
  }
  
  res.json({
    success: true,
    running: botProcesses[botId].running
  });
});

// Bot control endpoint
app.post('/api/bot', authenticate, (req, res) => {
  const { action, botId } = req.body;
  
  if (!botId || !['azbit', 'p2pb2b'].includes(botId)) {
    return res.status(400).json({ success: false, error: 'Invalid bot ID' });
  }
  
  if (!action || !['start', 'stop'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action' });
  }
  
  if (action === 'start') {
    // Check if bot is already running
    if (botProcesses[botId].running) {
      return res.status(400).json({ success: false, error: 'Bot is already running' });
    }
    
    // Determine which script to run
    const scriptPath = botId === 'azbit' ? 'index.js' : 'index2.js';
    const fullScriptPath = path.join(BOT_SCRIPTS_DIR, scriptPath);
    
    console.log(`Attempting to start ${botId} bot with script: ${fullScriptPath}`);
    
    // Check if script exists
    if (!fs.existsSync(fullScriptPath)) {
      console.error(`Script not found: ${fullScriptPath}`);
      return res.status(404).json({ 
        success: false, 
        error: `Script ${scriptPath} not found at ${fullScriptPath}` 
      });
    }
    
    try {
      // Create log file streams
      const outLog = fs.openSync(path.join(BOT_SCRIPTS_DIR, `${botId}-out.log`), 'a');
      const errLog = fs.openSync(path.join(BOT_SCRIPTS_DIR, `${botId}-err.log`), 'a');
      
      // Start the bot process
      const botProcess = spawn('node', [fullScriptPath], {
        detached: true,
        stdio: ['ignore', outLog, errLog],
        cwd: BOT_SCRIPTS_DIR
      });
      
      // Store the process
      botProcesses[botId].process = botProcess;
      botProcesses[botId].running = true;
      
      // Write to the running file
      fs.writeFileSync(path.join(BOT_SCRIPTS_DIR, `${botId}-running.txt`), 'true');
      
      // Unref the process so it can run independently
      botProcess.unref();
      
      console.log(`${botId} bot started successfully`);
      return res.json({ 
        success: true, 
        message: `${botId} bot started successfully` 
      });
    } catch (error) {
      console.error(`Error starting ${botId} bot:`, error);
      return res.status(500).json({ 
        success: false, 
        error: `Error starting ${botId} bot: ${error.message}` 
      });
    }
  } else if (action === 'stop') {
    // Check if bot is running
    if (!botProcesses[botId].running) {
      return res.status(400).json({ success: false, error: 'Bot is not running' });
    }
    
    try {
      console.log(`Attempting to stop ${botId} bot`);
      
      // On Linux, we need to find and kill the process by its marker file
      // since the process reference might not be valid after a server restart
      if (process.platform === 'linux') {
        try {
          // Use ps and grep to find the process
          const findProcess = spawn('ps', ['aux']);
          const grepProcess = spawn('grep', [botId === 'azbit' ? 'index.js' : 'index2.js']);
          
          findProcess.stdout.pipe(grepProcess.stdin);
          
          grepProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.includes('node') && !line.includes('grep')) {
                const pid = line.trim().split(/\s+/)[1];
                if (pid) {
                  console.log(`Found ${botId} bot process with PID: ${pid}, killing it`);
                  spawn('kill', ['-9', pid]);
                }
              }
            }
          });
        } catch (err) {
          console.error(`Error finding process to kill: ${err.message}`);
        }
      } else {
        // Kill the process if it exists (Windows)
        if (botProcesses[botId].process) {
          botProcesses[botId].process.kill();
        }
      }
      
      // Update the status
      botProcesses[botId].process = null;
      botProcesses[botId].running = false;
      
      // Remove the running file
      const runningFilePath = path.join(BOT_SCRIPTS_DIR, `${botId}-running.txt`);
      if (fs.existsSync(runningFilePath)) {
        fs.unlinkSync(runningFilePath);
      }
      
      console.log(`${botId} bot stopped successfully`);
      return res.json({ 
        success: true, 
        message: `${botId} bot stopped successfully` 
      });
    } catch (error) {
      console.error(`Error stopping ${botId} bot:`, error);
      return res.status(500).json({ 
        success: false, 
        error: `Error stopping ${botId} bot: ${error.message}` 
      });
    }
  }
});

// Check for existing bots on startup
checkExistingBots();

// Start the server
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
  console.log(`Bot scripts directory: ${BOT_SCRIPTS_DIR}`);
  console.log(`Bot status: Azbit (${botProcesses.azbit.running ? 'Running' : 'Stopped'}), P2PB2B (${botProcesses.p2pb2b.running ? 'Running' : 'Stopped'})`);
});
