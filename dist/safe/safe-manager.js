"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeManager = void 0;
const tslib_1 = require("tslib");
const api_kit_1 = tslib_1.__importDefault(require("@safe-global/api-kit"));
const protocol_kit_1 = tslib_1.__importDefault(require("@safe-global/protocol-kit"));
const types_kit_1 = require("@safe-global/types-kit");
const config_1 = require("./config");
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const validation_1 = require("./validation");
class SafeManager {
    constructor() {
        try {
            this.safeConfig = (0, config_1.getSafeConfig)();
            this.apiKit = new api_kit_1.default({
                chainId: this.safeConfig.chainId,
            });
            logger_1.logger.info('SafeManager initialized successfully', {
                chainId: this.safeConfig.chainId,
                safeAddress: this.safeConfig.safeAddress,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize SafeManager', { error });
            throw new errors_1.ConfigurationError('SafeManager initialization failed', {
                originalError: error,
            });
        }
    }
    /**
     * Create a Protocol Kit instance for a specific owner
     */
    async createProtocolKit(ownerConfig) {
        try {
            logger_1.logger.debug('Creating Protocol Kit instance', {
                safeAddress: this.safeConfig.safeAddress,
                ownerAddress: ownerConfig.address,
            });
            // Validate owner configuration
            validation_1.Validator.validateAddress(ownerConfig.address, 'Owner address');
            validation_1.Validator.validatePrivateKey(ownerConfig.privateKey);
            const protocolKit = await protocol_kit_1.default.init({
                provider: this.safeConfig.rpcUrl,
                signer: ownerConfig.privateKey,
                safeAddress: this.safeConfig.safeAddress,
            });
            logger_1.logger.debug('Protocol Kit instance created successfully');
            return protocolKit;
        }
        catch (error) {
            logger_1.logger.error('Failed to create Protocol Kit instance', {
                error,
                safeAddress: this.safeConfig.safeAddress,
                ownerAddress: ownerConfig.address,
            });
            if (error instanceof errors_1.AppError) {
                throw error;
            }
            throw new errors_1.SafeTransactionError('Failed to initialize Safe Protocol Kit', errors_1.ErrorCode.SAFE_TRANSACTION_FAILED, { originalError: error, ownerAddress: ownerConfig.address });
        }
    }
    /*//////////////////////////////////////////////////////////////
                  CREATE TRANSACTION - PROPOSE AND Bridge
    //////////////////////////////////////////////////////////////*/
    /**
     * Propose a transaction to the Safe
     */
    async proposeTransaction(transactionData) {
        const ownerConfig = (0, config_1.getProposerConfig)();
        const protocolKit = await this.createProtocolKit(ownerConfig);
        // Create transaction
        const safeTransaction = await protocolKit.createTransaction({
            transactions: [transactionData],
        });
        const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
        const signature = await protocolKit.signHash(safeTxHash);
        // Propose transaction to the service
        await this.apiKit.proposeTransaction({
            safeAddress: this.safeConfig.safeAddress,
            safeTransactionData: safeTransaction.data,
            safeTxHash,
            senderAddress: ownerConfig.address,
            senderSignature: signature.data,
        });
        return safeTxHash;
    }
    /**
     * Helper method to create a contract call transaction
     */
    createContractCallTransaction(to, data, value = '0') {
        return {
            to,
            value,
            data,
            operation: types_kit_1.OperationType.Call,
        };
    }
    /**
     * Helper method to create a delegate call transaction
     */
    createDelegateCallTransaction(to, data) {
        return {
            to,
            value: '0',
            data,
            operation: types_kit_1.OperationType.DelegateCall,
        };
    }
    /**
     * Get a specific transaction by hash
     */
    async getTransaction(safeTxHash) {
        return await this.apiKit.getTransaction(safeTxHash);
    }
    /*//////////////////////////////////////////////////////////////
                            LIST-TRANSACTION
    //////////////////////////////////////////////////////////////*/
    /**
     * Get pending transactions
     */
    async getPendingTransactions() {
        return await this.apiKit.getPendingTransactions(this.safeConfig.safeAddress);
    }
    /**
     * Get all transactions
     */
    async getAllTransactions() {
        return await this.apiKit.getAllTransactions(this.safeConfig.safeAddress);
    }
    /**
     * Get incoming transactions
     */
    async getIncomingTransactions() {
        return await this.apiKit.getIncomingTransactions(this.safeConfig.safeAddress);
    }
    /**
     * Get multisig transactions
     */
    async getMultisigTransactions() {
        return await this.apiKit.getMultisigTransactions(this.safeConfig.safeAddress);
    }
    /**
     * Get module transactions
     */
    async getModuleTransactions() {
        return await this.apiKit.getModuleTransactions(this.safeConfig.safeAddress);
    }
    /**
     * Get the current nonce for the Safe
     */
    async getCurrentNonce() {
        const ownerConfig = (0, config_1.getProposerConfig)();
        const protocolKit = await this.createProtocolKit(ownerConfig);
        return await protocolKit.getNonce();
    }
    /**
     * Propose a transaction to the Safe with explicit nonce
     */
    async proposeTransactionWithNonce(transactionData, nonce) {
        const ownerConfig = (0, config_1.getProposerConfig)();
        const protocolKit = await this.createProtocolKit(ownerConfig);
        console.log(`   Transaction data: ${JSON.stringify(transactionData, null, 2)}`);
        // Create transaction with explicit nonce
        const safeTransaction = await protocolKit.createTransaction({
            transactions: [transactionData],
            options: {
                nonce,
            },
        });
        const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
        const signature = await protocolKit.signHash(safeTxHash);
        console.log(`   Safe transaction data: ${JSON.stringify(safeTransaction.data, null, 2)}`);
        // Propose transaction to the service
        try {
            await this.apiKit.proposeTransaction({
                safeAddress: this.safeConfig.safeAddress,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: ownerConfig.address,
                senderSignature: signature.data,
            });
        }
        catch (error) {
            console.error(`   Error proposing transaction with nonce ${nonce}:`, error);
            console.error(`   Transaction data that failed:`, JSON.stringify(transactionData, null, 2));
            // Add more detailed error information
            if (error && typeof error === 'object') {
                if ('response' in error && error.response && typeof error.response === 'object') {
                    if ('status' in error.response) {
                        console.error(`   API Response Status:`, error.response.status);
                    }
                    if ('data' in error.response) {
                        console.error(`   API Response Data:`, error.response.data);
                    }
                }
                if ('code' in error) {
                    console.error(`   Error Code:`, error.code);
                }
                if ('details' in error) {
                    console.error(`   Error Details:`, error.details);
                }
            }
            throw error;
        }
        return safeTxHash;
    }
    /**
     * Propose multiple transactions with sequential nonces
     */
    async proposeTransactionsWithSequentialNonces(transactionsData) {
        if (transactionsData.length === 0) {
            return [];
        }
        const baseNonce = await this.getCurrentNonce();
        console.log(`   Current base nonce: ${baseNonce}`);
        const hashes = [];
        for (let i = 0; i < transactionsData.length; i++) {
            const nonce = baseNonce + i;
            console.log(`Proposing transaction ${i + 1}/${transactionsData.length} with nonce ${nonce}`);
            try {
                const hash = await this.proposeTransactionWithNonce(transactionsData[i], nonce);
                hashes.push(hash);
                // Small delay to avoid potential rate limiting
                if (i < transactionsData.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
            catch (error) {
                console.error(`   Failed to propose transaction ${i + 1} with nonce ${nonce}`);
                // If nonce conflict, try to get fresh nonce and retry
                if (error instanceof Error && error.message.includes('Unprocessable Content')) {
                    console.log(`   Retrying with fresh nonce...`);
                    const freshNonce = await this.getCurrentNonce();
                    console.log(`   Fresh nonce: ${freshNonce}`);
                    if (freshNonce !== nonce) {
                        const retryNonce = freshNonce + i;
                        console.log(`   Retrying transaction ${i + 1} with nonce ${retryNonce}`);
                        const hash = await this.proposeTransactionWithNonce(transactionsData[i], retryNonce);
                        hashes.push(hash);
                    }
                    else {
                        throw error;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        return hashes;
    }
}
exports.SafeManager = SafeManager;
//# sourceMappingURL=safe-manager.js.map