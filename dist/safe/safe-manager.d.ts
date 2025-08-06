import { AllTransactionsListResponse, SafeInfoResponse, SafeModuleTransactionListResponse, SafeMultisigTransactionListResponse, TransferListResponse } from '@safe-global/api-kit';
import { MetaTransactionData } from '@safe-global/types-kit';
export declare class SafeManager {
    private apiKit;
    private safeConfig;
    constructor();
    /**
     * Create a Protocol Kit instance for a specific owner
     */
    private createProtocolKit;
    /**
     * Propose a transaction to the Safe
     */
    proposeTransaction(transactionData: MetaTransactionData): Promise<string>;
    /**
     * Helper method to create a contract call transaction
     */
    createContractCallTransaction(to: string, data: string, value?: string): MetaTransactionData;
    /**
     * Helper method to create a delegate call transaction
     */
    createDelegateCallTransaction(to: string, data: string): MetaTransactionData;
    /**
     * Get a specific transaction by hash
     */
    getTransaction(safeTxHash: string): Promise<unknown>;
    /**
     * Get pending transactions
     */
    getPendingTransactions(): Promise<SafeMultisigTransactionListResponse>;
    /**
     * Get all transactions
     */
    getAllTransactions(): Promise<AllTransactionsListResponse>;
    /**
     * Get incoming transactions
     */
    getIncomingTransactions(): Promise<TransferListResponse>;
    /**
     * Get multisig transactions
     */
    getMultisigTransactions(): Promise<SafeMultisigTransactionListResponse>;
    /**
     * Get module transactions
     */
    getModuleTransactions(): Promise<SafeModuleTransactionListResponse>;
    /**
     * Get the current nonce for the Safe
     */
    getCurrentNonce(): Promise<number>;
    /**
     * Get Safe information including owners
     */
    getSafeInfo(): Promise<SafeInfoResponse>;
    /**
     * Get all owners of the Safe
     */
    getSafeOwners(): Promise<string[]>;
    /**
     * Get the Safe address
     */
    getSafeAddress(): string;
    /**
     * Propose a transaction to the Safe with explicit nonce
     */
    proposeTransactionWithNonce(transactionData: MetaTransactionData, nonce: number): Promise<string>;
    /**
     * Handle errors from propose transaction operations
     */
    private handleProposeTransactionError;
    /**
     * Propose multiple transactions with sequential nonces
     */
    proposeTransactionsWithSequentialNonces(transactionsData: MetaTransactionData[]): Promise<string[]>;
}
//# sourceMappingURL=safe-manager.d.ts.map