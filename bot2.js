const axios = require('axios');
const crypto = require('crypto');
const P2PB2BExchange = require('./exchanges/p2pb2b');

class AutoTradingBot2 {
    constructor(apiKey, secretKey) {
        try {
            if (!apiKey || !secretKey) {
                throw new Error('API key and secret key are required');
            }
            
            this.exchange = new P2PB2BExchange(apiKey, secretKey);
            this.lastAction = 'sell';  // Start with buy since we'll flip it
            this.isShuttingDown = false;
            this.pendingOrders = new Map(); // Track orders that need matching orders
            
            // Add cycle tracking for random order quantities
            this.currentCycle = 0;
            this.ordersInCurrentCycle = 0;
            this.targetOrdersInCycle = this.getRandomOrderCount();
            
            console.log('\n=== Bot Initialization ===');
            console.log('✓ API Keys configured');
            console.log('✓ Starting with BUY order (buy low, then sell high)');
            console.log(`✓ First cycle will create ${this.targetOrdersInCycle} orders`);
            
            if (process.env.TEST_MODE === 'true') {
                const testBalance = parseFloat(process.env.TEST_BALANCE || '100');
                console.log('✓ Test Mode enabled');
                console.log(`✓ Test Balance: ${testBalance} USDT`);
            }

            // Setup graceful shutdown
            this.setupShutdownHandlers();
        } catch (error) {
            console.error('Error initializing bot:', error.message);
            throw error;
        }
    }

    setupShutdownHandlers() {
        // Handle graceful shutdown
        const handleShutdown = async () => {
            if (this.isShuttingDown) return;
            
            console.log('\n=== Graceful Shutdown Initiated ===');
            this.isShuttingDown = true;
            
            // Check if there are any pending orders that need matching orders
            if (this.pendingOrders.size > 0) {
                console.log(`Creating matching orders for ${this.pendingOrders.size} pending orders before shutdown...`);
                
                // Create matching orders for all pending orders
                for (const [orderId, orderDetails] of this.pendingOrders.entries()) {
                    try {
                        console.log(`Creating matching order for order ID: ${orderId}`);
                        await this.createMatchingOrder(orderDetails);
                        console.log(`Successfully created matching order for order ID: ${orderId}`);
                        this.pendingOrders.delete(orderId);
                    } catch (error) {
                        console.error(`Failed to create matching order for order ID: ${orderId}`, error.message);
                    }
                }
            }
            
            console.log('Graceful shutdown complete. Exiting...');
            process.exit(0);
        };
        
        // Register shutdown handlers
        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);
        process.on('exit', () => {
            if (!this.isShuttingDown) {
                console.log('\nProcess exiting without proper shutdown. Some orders may be left without matching orders.');
            }
        });
    }

    async startTrading(exchange, symbol) {
        try {
            console.log('\n=== Starting Trading Bot ===');
            console.log('Exchange:', exchange);
            console.log('Symbol:', symbol);
            console.log('Trade Amount:', process.env.TRADE_AMOUNT, 'USDT');
            
            // Start the trading cycle
            await this.executeTrade(exchange, symbol);
        } catch (error) {
            console.error('Error starting trading:', error.message);
            throw error;
        }
    }

    getRandomDelay() {
        const minMinutes = parseInt(process.env.TIME_MIN || '1');
        const maxMinutes = parseInt(process.env.TIME_MAX || '15');
        const minMs = minMinutes * 60 * 1000;
        const maxMs = maxMinutes * 60 * 1000;
        return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }

    async getBalance() {
        try {
            return await this.exchange.getBalance('USDT');
        } catch (error) {
            console.error('\nError fetching wallet balance:', error.message);
            
            // If API fails and test mode is enabled, use test balance
            if (process.env.TEST_MODE === 'true') {
                const testBalance = parseFloat(process.env.TEST_BALANCE || '100');
                console.log('\nFalling back to test balance:', testBalance, 'USDT');
                return testBalance;
            }
            
            return 0;
        }
    }

    async getOrderBook(symbol) {
        try {
            // Get market price from P2PB2B
            const marketPrice = await this.exchange.getMarketPrice(symbol);
            
            if (!marketPrice || !marketPrice.bid || !marketPrice.ask) {
                throw new Error('Invalid market price data structure');
            }

            const bestBid = marketPrice.bid;
            const bestAsk = marketPrice.ask;
            const spread = ((bestAsk - bestBid) / bestBid) * 100;

            console.log('\nOrder Book Analysis:');
            console.log(`Best Bid: ${bestBid}`);
            console.log(`Best Ask: ${bestAsk}`);
            console.log(`Spread: ${spread.toFixed(2)}%`);

            return {
                bestBid,
                bestAsk
            };

        } catch (error) {
            console.error('Error fetching order book:', error.message);
            return null;
        }
    }

    async createOrder(symbol, side, amount, price) {
        try {
            console.log('\nCreating order:');
            console.log('Type:', side.toUpperCase());
            console.log('Amount:', amount);
            console.log('Price:', price);
            console.log('Total:', (parseFloat(amount) * parseFloat(price)).toFixed(8), 'USDT');

            const result = await this.exchange.createOrder(symbol, side, amount, price);
            console.log('Order created:', result);
            return result.orderId || result;
        } catch (error) {
            console.error('Error creating order:', error.message);
            return null;
        }
    }

    async createMatchingOrder(orderDetails) {
        try {
            if (!orderDetails.amount) {
                throw new Error('Invalid order details: missing amount');
            }

            if (!orderDetails.price) {
                throw new Error('Invalid order details: missing price');
            }

            // Create opposite order with same price and amount
            const matchingSide = orderDetails.type === 'buy' ? 'sell' : 'buy';
            
            console.log('\nCreating matching order:');
            console.log(`Type: ${matchingSide.toUpperCase()}`);
            console.log(`Price: ${orderDetails.price} USDT (same as first order)`);
            console.log(`Amount: ${orderDetails.amount}`);
            console.log(`Total: ${(parseFloat(orderDetails.price) * parseFloat(orderDetails.amount)).toFixed(8)} USDT`);

            const result = await this.exchange.createOrder(
                orderDetails.currencyPairCode.replace('_', '/'), 
                matchingSide, 
                orderDetails.amount, 
                orderDetails.price
            );
            
            console.log('Matching order created:', result);
            return result.orderId || result;
        } catch (error) {
            console.error('Error creating matching order:', error.message);
            return null;
        }
    }

    async executeTradeAction(action, symbol, price, amount) {
        try {
            // Parse and format numbers before creating order
            const formattedPrice = price.toString();
            const formattedAmount = amount.toString();
            
            const orderData = await this.createOrder(symbol, action, formattedAmount, formattedPrice);
            if (!orderData) {
                console.error('Failed to create first order');
                return;
            }

            console.log(`\n${action.toUpperCase()} order created successfully`);
            console.log('Order ID:', orderData);

            // Get order details
            const orderDetails = await this.getOrderStatus(orderData);
            if (orderDetails.status === 'error') {
                console.error('Error getting order details');
                return;
            }

            // Track this order as pending a matching order
            this.pendingOrders.set(orderData, {
                type: action,
                amount: formattedAmount,
                price: formattedPrice,
                market: symbol.replace('/', '')
            });

            // Create matching order to fill our own order
            console.log('\nCreating matching order to fill our order...');
            
            // Use the same amount and price from our first order
            const matchingOrderId = await this.createMatchingOrder({
                type: action,
                amount: formattedAmount,
                price: formattedPrice,
                market: symbol.replace('/', '')
            });

            // Remove from pending orders since we've created a matching order
            this.pendingOrders.delete(orderData);

            if (matchingOrderId) {
                console.log('\nBoth orders created successfully!');
                console.log('First Order ID:', orderData);
                console.log('Matching Order ID:', matchingOrderId);

                // Maximum retries and delay between checks
                const maxRetries = 5;
                const checkDelay = 2000; // 2 seconds
                let retryCount = 0;
                let bothOrdersFilled = false;

                while (retryCount < maxRetries && !bothOrdersFilled && !this.isShuttingDown) {
                    // Wait between checks
                    await new Promise(resolve => setTimeout(resolve, checkDelay));

                    // Check both orders with retry on connection error
                    let firstOrderStatus, matchingOrderStatus;
                    try {
                        [firstOrderStatus, matchingOrderStatus] = await Promise.all([
                            this.getOrderStatus(orderData),
                            this.getOrderStatus(matchingOrderId)
                        ]);
                    } catch (error) {
                        console.error(`\nError checking order status (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
                        retryCount++;
                        continue;
                    }

                    // Skip if either status check failed
                    if (firstOrderStatus.status === 'error' || matchingOrderStatus.status === 'error') {
                        retryCount++;
                        continue;
                    }

                    const firstOrderFilled = parseFloat(firstOrderStatus.filled) >= 99;
                    const matchingOrderFilled = parseFloat(matchingOrderStatus.filled) >= 99;

                    console.log('\nOrder Fill Status:');
                    console.log(`First Order: ${firstOrderStatus.filled}% filled`);
                    console.log(`Matching Order: ${matchingOrderStatus.filled}% filled`);

                    if (firstOrderFilled && matchingOrderFilled) {
                        bothOrdersFilled = true;
                        console.log('\n✓ Both orders filled successfully!');
                        
                        // Save transaction data for UI
                        this.saveTransactionData({
                            id: `tx-p2pb2b-${Date.now()}`,
                            type: action,
                            amount: parseFloat(formattedAmount),
                            price: parseFloat(formattedPrice),
                            total: parseFloat(formattedAmount) * parseFloat(formattedPrice),
                            timestamp: new Date().toLocaleString(),
                            status: 'completed'
                        });
                        
                        // Add delay before starting new cycle
                        console.log('\nWaiting 5 seconds before starting new cycle...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        // Only start a new cycle if we're not shutting down
                        if (!this.isShuttingDown) {
                            console.log('\n=== Starting New Cycle ===');
                            this.lastAction = action;
                            await this.executeTrade('P2PB2B', symbol);
                        } else {
                            console.log('Bot is shutting down, not starting a new cycle.');
                        }
                        break;
                    }

                    retryCount++;
                }

                if (!bothOrdersFilled && !this.isShuttingDown) {
                    console.log('\nOrders not filled after maximum retries');
                }
            }

        } catch (error) {
            console.error('Error in executeTradeAction:', error.message);
        }
    }

    async executeTrade(exchange, symbol) {
        try {
            // Check if we're shutting down
            if (this.isShuttingDown) {
                console.log('Bot is shutting down, not executing new trades.');
                return;
            }
            
            // Get current market prices
            const orderBook = await this.getOrderBook(symbol);
            if (!orderBook) {
                console.error('Failed to get order book, retrying in 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                return this.executeTrade(exchange, symbol);
            }

            const { bestBid, bestAsk } = orderBook;
            const spread = ((bestAsk - bestBid) / bestBid) * 100;

            // Check if we need to start a new cycle
            if (this.ordersInCurrentCycle >= this.targetOrdersInCycle) {
                this.currentCycle++;
                this.ordersInCurrentCycle = 0;
                this.targetOrdersInCycle = this.getRandomOrderCount();
                
                console.log('\n=== Starting New Trading Cycle ===');
                console.log(`Cycle #${this.currentCycle}`);
                console.log(`Target Orders for this cycle: ${this.targetOrdersInCycle}`);
                
                // Flip the last action to alternate between buy and sell for the first order of the new cycle
                this.lastAction = this.lastAction === 'buy' ? 'sell' : 'buy';
            }

            console.log('\n=== Trading Cycle ===');
            console.log(`Cycle #${this.currentCycle} - Order ${this.ordersInCurrentCycle + 1}/${this.targetOrdersInCycle}`);
            console.log('Market Status for BRIL/USDT:');
            console.log(`Best Bid: ${bestBid.toFixed(8)}`);
            console.log(`Best Ask: ${bestAsk.toFixed(8)}`);
            console.log(`Spread: ${spread.toFixed(2)}%`);

            // Get account balance for dynamic trade sizing
            const balance = await this.getBalance();
            if (!balance) {
                console.error('Failed to get balance, retrying in 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                return this.executeTrade(exchange, symbol);
            }

            // Calculate dynamic trade amount based on account balance
            // Use 30% of available balance for each trade
            const maxTradeValueUSDT = balance * 0.3;
            let tradeAmount;

            // Determine action based on last action
            const action = this.lastAction === 'sell' ? 'buy' : 'sell';
            
            console.log('\nTrading Strategy:');
            console.log(`Previous Action: ${this.lastAction || 'None'}`);
            console.log(`Current Action: ${action}`);
            console.log(`Available Balance: ${balance.toFixed(8)} USDT`);

            // Calculate price with dynamic adjustment based on spread
            let price;
            if (action === 'buy') {
                // Use best ask price for buy orders
                const currentBestAsk = bestAsk;
                // Calculate a random percentage between 2-5% for dynamic pricing
                const randomAdjustment = (2 + Math.random() * 3).toFixed(2);
                // Buy slightly below the best ask price
                price = (currentBestAsk * (1 - randomAdjustment/100)).toFixed(8);
                tradeAmount = (maxTradeValueUSDT / parseFloat(price)).toFixed(8);
                
                console.log('\nBUY Strategy:');
                console.log(`Current Best Ask: ${currentBestAsk}`);
                console.log(`Random Adjustment: -${randomAdjustment}%`);
                console.log(`Our Buy Price: ${price}`);
            } else {
                // Get fresh best ask from order book
                const currentBestAsk = bestAsk;
                // Calculate a random percentage between 2-5% for dynamic pricing
                const randomAdjustment = (2 + Math.random() * 3).toFixed(2);
                price = (currentBestAsk * (1 - randomAdjustment/100)).toFixed(8);
                tradeAmount = (maxTradeValueUSDT / parseFloat(price)).toFixed(8);
                
                console.log('\nSELL Strategy:');
                console.log(`Current Best Ask: ${currentBestAsk}`);
                console.log(`Random Adjustment: -${randomAdjustment}%`);
                console.log(`Our Sell Price: ${price}`);
            }

            // Ensure minimum trade amount (adjust as needed for the specific token)
            const minTradeAmount = 0.1; // This should be adjusted based on P2PB2B's minimum trade requirements
            tradeAmount = Math.max(minTradeAmount, parseFloat(tradeAmount)).toFixed(8);

            console.log(`\n${action.toUpperCase()} Order Details:`);
            console.log(`Amount: ${tradeAmount}`);
            console.log(`Price: ${price} USDT`);
            console.log(`Total: ${(parseFloat(tradeAmount) * parseFloat(price)).toFixed(8)} USDT`);

            // Execute the trade with retry mechanism
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries && !this.isShuttingDown) {
                try {
                    await this.executeTradeAction(action, symbol, price, tradeAmount);
                    
                    // Increment the orders in current cycle counter
                    this.ordersInCurrentCycle++;
                    
                    // Update last action for the next order
                    this.lastAction = action;
                    
                    // If we still have orders to create in this cycle and not shutting down,
                    // continue with the next order after a short delay
                    if (this.ordersInCurrentCycle < this.targetOrdersInCycle && !this.isShuttingDown) {
                        console.log(`\nCompleted order ${this.ordersInCurrentCycle}/${this.targetOrdersInCycle} in cycle ${this.currentCycle}`);
                        console.log('Waiting 5 seconds before creating next order...');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return this.executeTrade(exchange, symbol);
                    }
                    
                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === maxRetries) {
                        console.error(`Failed to execute trade after ${maxRetries} attempts`);
                        // Wait 1 minute before starting new cycle
                        console.log('Waiting 1 minute before starting new cycle...');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        return this.executeTrade(exchange, symbol);
                    }
                    console.log(`Retrying trade execution (${retryCount}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        } catch (error) {
            console.error('\nTrade execution error:', error.message);
        }
    }

    // Add method to get random order count between 1-5
    getRandomOrderCount() {
        return Math.floor(Math.random() * 5) + 1; // Random number between 1 and 5
    }

    // Helper methods to save data for the UI
    saveOrderBookData(orderBook) {
        try {
            const fs = require('fs');
            const data = {
                lowestSell: orderBook.bestAsk,
                highestBuy: orderBook.bestBid,
                spread: orderBook.bestAsk - orderBook.bestBid,
                lastOrderType: this.lastAction
            };
            fs.writeFileSync('p2pb2b-orderbook.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving order book data:', error.message);
        }
    }

    saveBalanceData(balance) {
        try {
            const fs = require('fs');
            // Get BRIL balance - in a real implementation, you'd fetch this from the exchange
            const brilBalance = 5000; // Mock value
            const data = {
                crypto: brilBalance,
                usdt: balance
            };
            fs.writeFileSync('p2pb2b-balance.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving balance data:', error.message);
        }
    }

    saveTransactionData(transaction) {
        try {
            const fs = require('fs');
            let transactions = [];
            
            // Read existing transactions if file exists
            if (fs.existsSync('p2pb2b-transactions.json')) {
                transactions = JSON.parse(fs.readFileSync('p2pb2b-transactions.json', 'utf8'));
            }
            
            // Add new transaction
            transactions.push(transaction);
            
            // Keep only the latest 20 transactions
            if (transactions.length > 20) {
                transactions = transactions.slice(-20);
            }
            
            fs.writeFileSync('p2pb2b-transactions.json', JSON.stringify(transactions, null, 2));
        } catch (error) {
            console.error('Error saving transaction data:', error.message);
        }
    }
}

module.exports = { AutoTradingBot2 };
