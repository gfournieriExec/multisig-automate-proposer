import SafeApiKit, {
    AllTransactionsListResponse,
    SafeInfoResponse,
    SafeModuleTransactionListResponse,
    SafeMultisigTransactionListResponse,
    TransferListResponse,
} from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { MetaTransactionData, OperationType } from '@safe-global/types-kit';
import { getProposerConfig, getSafeConfig, OwnerConfig } from './config';
import { AppError, ConfigurationError, ErrorCode, SafeTransactionError } from './errors';
import { logger } from './logger';
import { Validator } from './validation';

export class SafeManager {
    private apiKit: SafeApiKit;
    private safeConfig: Awaited<ReturnType<typeof getSafeConfig>>; // Fix this line

    private constructor(safeConfig: Awaited<ReturnType<typeof getSafeConfig>>) {
        this.safeConfig = safeConfig;
        this.apiKit = new SafeApiKit({
            chainId: this.safeConfig.chainId,
        });

        logger.info('SafeManager initialized successfully', {
            chainId: this.safeConfig.chainId,
            safeAddress: this.safeConfig.safeAddress,
        });
    }

    static async create(): Promise<SafeManager> {
        try {
            const safeConfig = await getSafeConfig();
            return new SafeManager(safeConfig);
        } catch (error) {
            logger.error('Failed to initialize SafeManager', { error });
            throw new ConfigurationError('SafeManager initialization failed', {
                originalError: error,
            });
        }
    }

    /**
     * Create a Protocol Kit instance for a specific owner
     */
    private async createProtocolKit(ownerConfig: OwnerConfig): Promise<Safe> {
        try {
            logger.debug('Creating Protocol Kit instance', {
                safeAddress: this.safeConfig.safeAddress,
                ownerAddress: ownerConfig.address,
            });

            // Validate owner configuration
            Validator.validateAddress(ownerConfig.address, 'Owner address');
            Validator.validatePrivateKey(ownerConfig.privateKey);

            const protocolKit = await Safe.init({
                provider: this.safeConfig.rpcUrl,
                signer: ownerConfig.privateKey,
                safeAddress: this.safeConfig.safeAddress,
            });

            logger.debug('Protocol Kit instance created successfully');
            return protocolKit;
        } catch (error) {
            logger.error('Failed to create Protocol Kit instance', {
                error,
                safeAddress: this.safeConfig.safeAddress,
                ownerAddress: ownerConfig.address,
            });

            if (error instanceof AppError) {
                throw error;
            }

            throw new SafeTransactionError(
                'Failed to initialize Safe Protocol Kit',
                ErrorCode.SAFE_TRANSACTION_FAILED,
                { originalError: error, ownerAddress: ownerConfig.address },
            );
        }
    }

    /*//////////////////////////////////////////////////////////////
                  CREATE TRANSACTION - PROPOSE AND Bridge
    //////////////////////////////////////////////////////////////*/

    /**
     * Propose a transaction to the Safe
     */
    async proposeTransaction(transactionData: MetaTransactionData): Promise<string> {
        const ownerConfig = getProposerConfig();
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
    createContractCallTransaction(
        to: string,
        data: string,
        value: string = '0',
    ): MetaTransactionData {
        return {
            to,
            value,
            data,
            operation: OperationType.Call,
        };
    }

    /**
     * Helper method to create a delegate call transaction
     */
    createDelegateCallTransaction(to: string, data: string): MetaTransactionData {
        return {
            to,
            value: '0',
            data,
            operation: OperationType.DelegateCall,
        };
    }

    /**
     * Get a specific transaction by hash
     */
    async getTransaction(safeTxHash: string): Promise<unknown> {
        return await this.apiKit.getTransaction(safeTxHash);
    }

    /*//////////////////////////////////////////////////////////////
                            LIST-TRANSACTION
    //////////////////////////////////////////////////////////////*/

    /**
     * Get pending transactions
     */
    async getPendingTransactions(): Promise<SafeMultisigTransactionListResponse> {
        return await this.apiKit.getPendingTransactions(this.safeConfig.safeAddress);
    }

    /**
     * Get all transactions
     */
    async getAllTransactions(): Promise<AllTransactionsListResponse> {
        return await this.apiKit.getAllTransactions(this.safeConfig.safeAddress);
    }

    /**
     * Get incoming transactions
     */
    async getIncomingTransactions(): Promise<TransferListResponse> {
        return await this.apiKit.getIncomingTransactions(this.safeConfig.safeAddress);
    }

    /**
     * Get multisig transactions
     */
    async getMultisigTransactions(): Promise<SafeMultisigTransactionListResponse> {
        return await this.apiKit.getMultisigTransactions(this.safeConfig.safeAddress);
    }

    /**
     * Get module transactions
     */
    async getModuleTransactions(): Promise<SafeModuleTransactionListResponse> {
        return await this.apiKit.getModuleTransactions(this.safeConfig.safeAddress);
    }

    /**
     * Get the current nonce for the Safe
     */
    async getCurrentNonce(): Promise<number> {
        const ownerConfig = getProposerConfig();
        const protocolKit = await this.createProtocolKit(ownerConfig);
        return await protocolKit.getNonce();
    }

    /**
     * Get Safe information including owners
     */
    async getSafeInfo(): Promise<SafeInfoResponse> {
        return await this.apiKit.getSafeInfo(this.safeConfig.safeAddress);
    }

    /**
     * Get all owners of the Safe
     */
    async getSafeOwners(): Promise<string[]> {
        const safeInfo = await this.getSafeInfo();
        return safeInfo.owners;
    }

    /**
     * Get the Safe address
     */
    getSafeAddress(): string {
        return this.safeConfig.safeAddress;
    }

    /**
     * Propose a transaction to the Safe with explicit nonce
     */
    async proposeTransactionWithNonce(
        transactionData: MetaTransactionData,
        nonce: number,
    ): Promise<string> {
        const ownerConfig = getProposerConfig();
        const protocolKit = await this.createProtocolKit(ownerConfig);

        logger.debug('Transaction data for proposal', { transactionData });

        // Create transaction with explicit nonce
        const safeTransaction = await protocolKit.createTransaction({
            transactions: [transactionData],
            options: {
                nonce,
            },
        });

        const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
        const signature = await protocolKit.signHash(safeTxHash);

        logger.debug('Safe transaction data created', {
            safeTransactionData: safeTransaction.data,
        });

        // Propose transaction to the service
        try {
            await this.apiKit.proposeTransaction({
                safeAddress: this.safeConfig.safeAddress,
                safeTransactionData: safeTransaction.data,
                safeTxHash,
                senderAddress: ownerConfig.address,
                senderSignature: signature.data,
            });
        } catch (error) {
            this.handleProposeTransactionError(error, nonce, transactionData);
            throw error;
        }

        return safeTxHash;
    }

    /**
     * Handle errors from propose transaction operations
     */
    private handleProposeTransactionError(
        error: unknown,
        nonce: number,
        transactionData: MetaTransactionData,
    ): void {
        logger.error('Error proposing transaction with nonce', {
            nonce,
            error,
            transactionData,
        });

        // Add more detailed error information
        if (error && typeof error === 'object') {
            if ('response' in error && error.response && typeof error.response === 'object') {
                if ('status' in error.response) {
                    logger.error('API Response Status', { status: error.response.status });
                }
                if ('data' in error.response) {
                    logger.error('API Response Data', { data: error.response.data });
                }
            }
            if ('code' in error) {
                logger.error('Error Code', { code: error.code });
            }
            if ('details' in error) {
                logger.error('Error Details', { details: error.details });
            }
        }
    }

    /**
     * Propose multiple transactions with sequential nonces
     */
    async proposeTransactionsWithSequentialNonces(
        transactionsData: MetaTransactionData[],
    ): Promise<string[]> {
        if (transactionsData.length === 0) {
            return [];
        }

        const baseNonce = await this.getCurrentNonce();
        logger.info('Current base nonce', { baseNonce });
        const hashes: string[] = [];

        for (let i = 0; i < transactionsData.length; i++) {
            const nonce = baseNonce + i;
            logger.info('Proposing transaction', {
                transactionIndex: i + 1,
                totalTransactions: transactionsData.length,
                nonce,
            });

            try {
                const hash = await this.proposeTransactionWithNonce(transactionsData[i], nonce);
                hashes.push(hash);

                // Small delay to avoid potential rate limiting
                if (i < transactionsData.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            } catch (error) {
                logger.error('Failed to propose transaction', {
                    transactionIndex: i + 1,
                    nonce,
                });

                // If nonce conflict, try to get fresh nonce and retry
                if (error instanceof Error && error.message.includes('Unprocessable Content')) {
                    logger.info('Retrying with fresh nonce');
                    const freshNonce = await this.getCurrentNonce();
                    logger.info('Fresh nonce retrieved', { freshNonce });

                    if (freshNonce !== nonce) {
                        const retryNonce = freshNonce + i;
                        logger.info('Retrying transaction with updated nonce', {
                            transactionIndex: i + 1,
                            retryNonce,
                        });
                        const hash = await this.proposeTransactionWithNonce(
                            transactionsData[i],
                            retryNonce,
                        );
                        hashes.push(hash);
                    } else {
                        throw error;
                    }
                } else {
                    throw error;
                }
            }
        }

        return hashes;
    }
}
