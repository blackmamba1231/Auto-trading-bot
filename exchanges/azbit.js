const axios = require('axios');
const crypto = require('crypto');
const BaseExchange = require('./base');

class AzbitExchange extends BaseExchange {
    constructor(apiKey, secretKey) {
        super();
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.baseUrl = 'https://data.azbit.com/api';
    }

    generateSignature(requestUrl, requestBody = '') {
        try {
            // Format: publicKey + requestUrl + requestBodyString
            const signatureText = this.apiKey + requestUrl + requestBody;

            // Convert to UTF8 bytes and compute HMACSHA256
            return crypto
                .createHmac('sha256', this.secretKey)
                .update(signatureText)
                .digest('hex');
        } catch (error) {
            console.error('Error generating signature:', error.message);
            throw error;
        }
    }

    async getBalance() {
        try {
            if (process.env.TEST_MODE === 'true') {
                const testBalance = parseFloat(process.env.TEST_BALANCE || '100');
                console.log('\nUsing test balance:', testBalance, 'USDT');
                return testBalance;
            }

            const endpoint = '/wallets/balances';
            const url = `${this.baseUrl}${endpoint}`;
            const signature = this.generateSignature(url, '');
            
            const response = await axios.get(url, {
                headers: {
                    'API-PublicKey': this.apiKey,
                    'API-Signature': signature,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status !== 'Success') {
                throw new Error(response.data.message || 'Failed to get balance');
            }

            const usdtBalance = response.data.result.find(
                wallet => wallet.currency === 'USDT'
            );

            return usdtBalance ? parseFloat(usdtBalance.balance) : 0;
        } catch (error) {
            console.error('Error getting Azbit balance:', error.message);
            throw error;
        }
    }

    async getMarketPrice(symbol) {
        try {
            const market = symbol.replace('/', '');
            const response = await axios.get(
                `${this.baseUrl}/market/ticker/${market}`
            );

            if (response.data.status !== 'Success') {
                throw new Error(response.data.message || 'Failed to get market price');
            }

            return response.data.result.last;
        } catch (error) {
            console.error('Error getting Azbit market price:', error.message);
            throw error;
        }
    }

    async createOrder(symbol, side, amount, price) {
        try {
            if (process.env.TEST_MODE === 'true') {
                console.log(`Test mode: ${side.toUpperCase()} order would be created for ${amount} at ${price}`);
                return { orderId: 'test-' + Date.now() };
            }

            const market = symbol.replace('/', '');
            const endpoint = '/order/create';
            const url = `${this.baseUrl}${endpoint}`;
            
            const orderData = {
                market,
                side: side.toLowerCase(),
                amount: amount.toString(),
                price: price.toString(),
                type: 'limit'
            };

            const signature = this.generateSignature(url, JSON.stringify(orderData));

            const response = await axios.post(url, orderData, {
                headers: {
                    'API-PublicKey': this.apiKey,
                    'API-Signature': signature,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status !== 'Success') {
                throw new Error(response.data.message || 'Failed to create order');
            }

            return response.data.result;
        } catch (error) {
            console.error('Error creating Azbit order:', error.message);
            throw error;
        }
    }
}

module.exports = AzbitExchange;
