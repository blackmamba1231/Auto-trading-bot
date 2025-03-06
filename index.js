require('dotenv').config();
const { AutoTradingBot } = require('./bot');

async function main() {
    try {
        // Initialize the bot (no need to pass API keys, it will get them from env)
        const apikey= process.env.AZBIT_API_KEY;
        const secretkey= process.env.AZBIT_SECRET_KEY;
        const bot = new AutoTradingBot(apikey, secretkey);

        // Get exchange and symbol from environment variables
        const exchange = process.env.EXCHANGE_1;
        const symbol = process.env.TRADE_SYMBOL_1;

        if (!exchange || !symbol) {
            throw new Error('Exchange and symbol must be configured in .env file');
        }

        // Start trading with configured pair
        await bot.startTrading(exchange, symbol);
    } catch (error) {
        console.error('Bot error:', error.message);
    }
}

main();