#!/bin/bash

# Exit on error
set -e

echo "=== Auto Trading Bot VPS Deployment Script ==="
echo "This script will set up your trading bot on the VPS server"

# Install Node.js and npm if not already installed
echo "=== Installing Node.js and npm ==="
if ! command -v node &> /dev/null; then
    echo "Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed"
fi

# Install PM2 for process management
echo "=== Installing PM2 ==="
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found, installing..."
    sudo npm install -g pm2
else
    echo "PM2 is already installed"
fi

# Create application directory
echo "=== Setting up application directory ==="
mkdir -p ~/auto-trading-bot

# Copy files to application directory
echo "=== Copying files ==="
cp -r ./* ~/auto-trading-bot/

# Install dependencies
echo "=== Installing dependencies ==="
cd ~/auto-trading-bot
npm install

# Setup environment variables
echo "=== Setting up environment variables ==="
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit the .env file with your configuration"
    nano .env
fi

# Setup firewall
echo "=== Setting up firewall ==="
sudo ufw allow 3001/tcp
sudo ufw status

# Start the bot server with PM2
echo "=== Starting bot server ==="
pm2 start bot-server.js --name "trading-bot-server"
pm2 save
pm2 startup

echo "=== Setup complete! ==="
echo "Your trading bot server is now running on port 3001"
echo "To check status: pm2 status"
echo "To view logs: pm2 logs trading-bot-server"
echo "To restart: pm2 restart trading-bot-server"
echo ""
echo "IMPORTANT: Make sure to update the CORS settings in bot-server.js with your frontend URL"
