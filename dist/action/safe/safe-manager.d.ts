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
    getTransaction(safeTxHash: string): Promise<any>;
    /**
     * Get pending transactions
     */
    getPendingTransactions(): Promise<import("@safe-global/api-kit").SafeMultisigTransactionListResponse>;
    /**
     * Get all transactions
     */
    getAllTransactions(): Promise<import("@safe-global/api-kit").AllTransactionsListResponse>;
    /**
     * Get incoming transactions
     */
    getIncomingTransactions(): Promise<import("@safe-global/api-kit").TransferListResponse>;
    /**
     * Get multisig transactions
     */
    getMultisigTransactions(): Promise<import("@safe-global/api-kit").SafeMultisigTransactionListResponse>;
    /**
     * Get module transactions
     */
    getModuleTransactions(): Promise<import("@safe-global/api-kit").SafeModuleTransactionListResponse>;
    /**
     * Get the current nonce for the Safe
     */
    getCurrentNonce(): Promise<number>;
    /**
     * Get Safe information including owners
     */
    getSafeInfo(): Promise<import("@safe-global/api-kit").SafeInfoResponse>;
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
     * Propose multiple transactions with sequential nonces
     */
    proposeTransactionsWithSequentialNonces(transactionsData: MetaTransactionData[]): Promise<string[]>;
}
//# sourceMappingURL=safe-manager.d.ts.map