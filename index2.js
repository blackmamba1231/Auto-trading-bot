require('dotenv').config();
const { AutoTradingBot2 } = require('./bot2');

async function main() {
    try {
        // Initialize the bot with P2PB2B API keys
        const apikey = process.env.P2PB2B_API_KEY;
        const secretkey = process.env.P2PB2B_SECRET_KEY;
        
        if (!apikey || !secretkey) {
            throw new Error('P2PB2B API key and secret key must be configured in .env file');
        }
        
        const bot = new AutoTradingBot2(apikey, secretkey);

        // Get exchange and symbol from environment variables
        const exchange = process.env.EXCHANGE_2 || 'P2PB2B';
        const symbol = process.env.TRADE_SYMBOL_2;

        if (!symbol) {
            throw new Error('Trading symbol must be configured in .env file (TRADE_SYMBOL_2)');
        }

        // Start trading with configured pair
        await bot.startTrading(exchange, symbol);
    } catch (error) {
        console.error('Bot error:', error.message);
    }
}

main();
