#!/usr/bin/env ts-node
interface TransactionInput {
    to: string;
    value: string;
    data: string;
    operation?: 'call' | 'delegatecall';
}
interface ExecutionConfig {
    dryRun?: boolean;
    scriptName?: string;
    rpcUrl: string;
    forgeOptions?: string;
    forgeScript?: string;
    smartContract?: string;
    envVars?: string;
}
export declare class TransactionExecutor {
    private safeManager;
    private anvilManager;
    private constructor();
    /**
     * Static factory method to create and initialize TransactionExecutor
     */
    static create(): Promise<TransactionExecutor>;
    /**
     * Execute transactions from Foundry script with automatic broadcast generation
     */
    executeFromScript(config: ExecutionConfig): Promise<string[]>;
    /**
     * Validate execution configuration
     */
    private validateExecutionConfig;
    /**
     * Setup Anvil fork if needed
     */
    private setupAnvilFork;
    /**
     * Build forge script command arguments
     */
    private buildForgeScriptCommand;
    /**
     * Handle forge process events
     */
    private handleForgeProcess;
    /**
     * Process transactions from broadcast file
     */
    private processTransactionsFromBroadcast;
    /**
     * Fallback to existing broadcast file
     */
    private fallbackToBroadcastFile;
    /**
     * Execute multiple transactions with proper nonce management
     */
    executeTransactions(transactions: TransactionInput[], dryRun?: boolean): Promise<string[]>;
    /**
     * Run the Foundry script and return the chain ID
     */
    private runFoundryScript;
    /**
     * Read the broadcast file and extract transactions
     */
    private readBroadcastFile;
    /**
     * Display transactions in a readable format
     */
    private displayTransactions;
    /**
     * Get the current nonce for the Safe
     */
    getCurrentNonce(): Promise<number>;
}
export {};
//# sourceMappingURL=transaction-executor.d.ts.map