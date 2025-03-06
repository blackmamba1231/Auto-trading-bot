class BaseExchange {
    constructor(config) {
        this.config = config;
    }

    async getBalance() {
        throw new Error('getBalance method must be implemented');
    }

    async createOrder() {
        throw new Error('createOrder method must be implemented');
    }

    async getMarketPrice() {
        throw new Error('getMarketPrice method must be implemented');
    }
}

module.exports = BaseExchange;
