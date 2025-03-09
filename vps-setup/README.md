# Trading Bot VPS Setup Guide

This guide will help you set up your trading bot on a VPS server, allowing it to run continuously while being controlled from your frontend application.

## Prerequisites

- A VPS server running Linux (Ubuntu/Debian recommended)
- Node.js 16+ installed on the VPS
- Basic knowledge of Linux commands
- SSH access to your VPS

## Files in this Directory

- `bot-server.js`: The main server script that manages your trading bots
- `package.json`: Dependencies and scripts for the bot server
- `deploy.sh`: Deployment script to automate setup
- `.env.example`: Example environment variables (copy to `.env` and customize)

## Deployment Steps

### 1. Upload Files to VPS

Upload the contents of this directory to your VPS using SCP, SFTP, or any file transfer method:

```bash
# Example using SCP (run from your local machine)
scp -r ./vps-setup/* user@your-vps-ip:~/auto-trading-bot/
```

### 2. SSH into Your VPS

```bash
ssh user@your-vps-ip
```

### 3. Make the Deployment Script Executable

```bash
cd ~/auto-trading-bot
chmod +x deploy.sh
```

### 4. Run the Deployment Script

```bash
./deploy.sh
```

This script will:
- Install Node.js if not already installed
- Install PM2 for process management
- Set up the application directory
- Install dependencies
- Create and configure the .env file
- Configure the firewall to allow traffic on port 3001
- Start the bot server using PM2

### 5. Configure Environment Variables

The script will prompt you to edit the `.env` file. Make sure to set:

- `PORT`: The port for the bot server (default: 3001)
- `JWT_SECRET`: Must match your frontend JWT secret
- API keys for your exchanges

### 6. Update Frontend Configuration

In your frontend application, make sure to:

1. Set the `NEXT_PUBLIC_BOT_SERVER_URL` environment variable to point to your VPS:
   ```
   NEXT_PUBLIC_BOT_SERVER_URL=http://YOUR_VPS_IP:3001
   ```

2. Deploy your frontend application to Vercel or your preferred hosting provider.

## Managing Your Bot Server

The bot server runs using PM2, which keeps it alive and restarts it if it crashes:

```bash
# Check status
pm2 status

# View logs
pm2 logs trading-bot-server

# Restart the server
pm2 restart trading-bot-server

# Stop the server
pm2 stop trading-bot-server
```

## Security Considerations

1. **Firewall**: The deployment script opens port 3001. Consider using a more restrictive firewall configuration in production.

2. **CORS**: Update the CORS settings in `bot-server.js` to only allow requests from your frontend domain.

3. **HTTPS**: For production, consider setting up HTTPS using a reverse proxy like Nginx with Let's Encrypt.

4. **JWT Secret**: Use a strong, unique JWT secret and keep it confidential.

## Troubleshooting

1. **Server not starting**: Check the logs with `pm2 logs trading-bot-server`

2. **Connection issues**: Verify that port 3001 is open in your firewall with `sudo ufw status`

3. **Authentication failures**: Ensure the JWT_SECRET matches between frontend and bot server

4. **Bot not starting**: Check file paths in the bot server and ensure the bot scripts are in the correct location

## Architecture Overview

```
┌─────────────────┐      HTTPS      ┌─────────────────┐
│                 │ ◄─────────────► │                 │
│  Frontend App   │                 │   Bot Server    │
│  (Next.js on    │      API        │   (Express.js   │
│   Vercel)       │ ◄─────────────► │    on VPS)      │
│                 │                 │                 │
└─────────────────┘                 └─────────────────┘
                                          │
                                          │ Spawns
                                          ▼
                                    ┌─────────────────┐
                                    │  Trading Bots   │
                                    │  (Node.js       │
                                    │   Processes)    │
                                    └─────────────────┘
```
