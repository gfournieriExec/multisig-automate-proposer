import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { MetaTransactionData, OperationType } from '@safe-global/types-kit';
import { getProposerConfig, getSafeConfig, OwnerConfig } from './config';

export class SafeManager {
    private apiKit: SafeApiKit;
    private safeConfig: ReturnType<typeof getSafeConfig>;

    constructor() {
        this.safeConfig = getSafeConfig();

        this.apiKit = new SafeApiKit({
            chainId: this.safeConfig.chainId,
        });
    }

    /**
     * Create a Protocol Kit instance for a specific owner
     */
    private async createProtocolKit(ownerConfig: OwnerConfig): Promise<Safe> {
        return await Safe.init({
            provider: this.safeConfig.rpcUrl,
            signer: ownerConfig.privateKey,
            safeAddress: this.safeConfig.safeAddress,
        });
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
    async getTransaction(safeTxHash: string): Promise<any> {
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
    async getCurrentNonce(): Promise<number> {
        const ownerConfig = getProposerConfig();
        const protocolKit = await this.createProtocolKit(ownerConfig);
        return await protocolKit.getNonce();
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
        } catch (error) {
            console.error(`   Error proposing transaction with nonce ${nonce}:`, error);
            console.error(
                `   Transaction data that failed:`,
                JSON.stringify(transactionData, null, 2),
            );
            throw error;
        }

        return safeTxHash;
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
        console.log(`   Current base nonce: ${baseNonce}`);
        const hashes: string[] = [];

        for (let i = 0; i < transactionsData.length; i++) {
            const nonce = baseNonce + i;
            console.log(
                `Proposing transaction ${i + 1}/${transactionsData.length} with nonce ${nonce}`,
            );

            try {
                const hash = await this.proposeTransactionWithNonce(transactionsData[i], nonce);
                hashes.push(hash);

                // Small delay to avoid potential rate limiting
                if (i < transactionsData.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`   Failed to propose transaction ${i + 1} with nonce ${nonce}`);

                // If nonce conflict, try to get fresh nonce and retry
                if (error instanceof Error && error.message.includes('Unprocessable Content')) {
                    console.log(`   Retrying with fresh nonce...`);
                    const freshNonce = await this.getCurrentNonce();
                    console.log(`   Fresh nonce: ${freshNonce}`);

                    if (freshNonce !== nonce) {
                        const retryNonce = freshNonce + i;
                        console.log(`   Retrying transaction ${i + 1} with nonce ${retryNonce}`);
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
