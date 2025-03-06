const axios = require('axios');
const crypto = require('crypto');

class P2PB2BExchange {
    constructor(apiKey, secretKey) {
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.baseUrl = 'https://api.p2pb2b.com';
    }

    formatMarketSymbol(market) {
        // Convert BRIL/USDT to BRIL_USDT
        return market.replace('/', '_').toUpperCase();
    }

    generateSignature(payload) {
        return crypto
            .createHmac('sha512', this.secretKey)
            .update(payload)
            .digest('hex');
    }

    generateHeaders(endpoint, data = {}) {
        const nonce = Date.now();
        const requestBody = {
            ...data,
            request: endpoint,
            nonce: nonce
        };

        const payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');
        const signature = this.generateSignature(payload);

        return {
            'Content-Type': 'application/json',
            'X-TXC-APIKEY': this.apiKey,
            'X-TXC-PAYLOAD': payload,
            'X-TXC-SIGNATURE': signature
        };
    }

    async getBalance(currency = 'USDT') {
        try {
            if (process.env.TEST_MODE === 'true') {
                const testBalance = parseFloat(process.env.TEST_BALANCE || '100');
                console.log('\nUsing test balance:', testBalance, 'USDT');
                return testBalance;
            }

            const endpoint = '/api/v2/account/balances';
            const requestBody = {
                request: endpoint,
                nonce: Date.now()
            };

            const payload = Buffer.from(JSON.stringify(requestBody)).toString('base64');
            const signature = this.generateSignature(payload);

            const headers = {
                'Content-Type': 'application/json',
                'X-TXC-APIKEY': this.apiKey,
                'X-TXC-PAYLOAD': payload,
                'X-TXC-SIGNATURE': signature
            };

            console.log('Sending request to P2PB2B with headers:', {
                'X-TXC-APIKEY': this.apiKey.substring(0, 5) + '...',
                'X-TXC-PAYLOAD': payload.substring(0, 10) + '...',
                'X-TXC-SIGNATURE': signature.substring(0, 10) + '...'
            });

            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                requestBody,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(`P2PB2B API Error: ${JSON.stringify(response.data)}`);
            }

            const balances = response.data.result;
            const balance = balances[currency];
            
            if (!balance) {
                throw new Error(`Balance for ${currency} not found`);
            }

            return parseFloat(balance.available) + parseFloat(balance.freeze);
        } catch (error) {
            console.error('Error getting P2PB2B balance:', error.message);
            throw error;
        }
    }

    async getMarketPrice(market) {
        try {
            const formattedMarket = this.formatMarketSymbol(market);
            console.log('Getting market price for:', formattedMarket);

            // First check if the market exists
            const markets = await this.getMarkets();
            if (!markets.includes(formattedMarket)) {
                throw new Error(`Market ${formattedMarket} not found. Available markets: ${markets.join(', ')}`);
            }

            const response = await axios.get(
                `${this.baseUrl}/api/v2/public/ticker?market=${formattedMarket}`
            );

            if (!response.data.success) {
                throw new Error(`P2PB2B API Error: ${response.data.message}`);
            }

            return {
                bid: parseFloat(response.data.result.bid),
                ask: parseFloat(response.data.result.ask),
                last: parseFloat(response.data.result.last)
            };
        } catch (error) {
            console.error('Error getting P2PB2B market price:', error.message);
            throw error;
        }
    }

    async getMarkets() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v2/public/markets`);
            if (!response.data.success) {
                throw new Error(`P2PB2B API Error: ${response.data.message}`);
            }
            return response.data.result.map(m => m.name);
        } catch (error) {
            console.error('Error getting markets:', error.message);
            throw error;
        }
    }

    async getMarketLimits(market) {
        try {
            const formattedMarket = this.formatMarketSymbol(market);
            const response = await axios.get(
                `${this.baseUrl}/api/v2/public/market?market=${formattedMarket}`
            );

            if (!response.data.success) {
                throw new Error(`P2PB2B API Error: ${response.data.message}`);
            }

            return response.data.result.limits;
        } catch (error) {
            console.error('Error getting market limits:', error.message);
            throw error;
        }
    }

    async createOrder(market, side, amount, price) {
        try {
            if (process.env.TEST_MODE === 'true') {
                console.log(`Test mode: ${side.toUpperCase()} order would be created for ${amount} at ${price}`);
                return { orderId: 'test-' + Date.now() };
            }

            // Format market symbol
            const formattedMarket = this.formatMarketSymbol(market);
            console.log('Creating order for market:', formattedMarket);

            // Validate amount and price against market limits
            const limits = await this.getMarketLimits(formattedMarket);
            
            if (parseFloat(amount) < parseFloat(limits.min_amount)) {
                throw new Error(`Amount ${amount} is below minimum ${limits.min_amount}`);
            }
            if (parseFloat(amount) > parseFloat(limits.max_amount)) {
                throw new Error(`Amount ${amount} is above maximum ${limits.max_amount}`);
            }
            if (parseFloat(price) < parseFloat(limits.min_price)) {
                throw new Error(`Price ${price} is below minimum ${limits.min_price}`);
            }
            if (parseFloat(price) > parseFloat(limits.max_price)) {
                throw new Error(`Price ${price} is above maximum ${limits.max_price}`);
            }

            const endpoint = '/api/v2/order/new';
            const data = {
                market: formattedMarket,
                side: side.toLowerCase(),
                amount: amount.toString(),
                price: price.toString()
            };
            const headers = this.generateHeaders(endpoint, data);
            const requestBody = {
                ...data,
                request: endpoint,
                nonce: Date.now()
            };

            const response = await axios.post(
                `${this.baseUrl}${endpoint}`,
                requestBody,
                { headers }
            );

            if (!response.data.success) {
                throw new Error(`P2PB2B API Error: ${response.data.message}`);
            }

            return response.data.result;
        } catch (error) {
            console.error('Error creating P2PB2B order:', error.message);
            throw error;
        }
    }
}

module.exports = P2PB2BExchange;
