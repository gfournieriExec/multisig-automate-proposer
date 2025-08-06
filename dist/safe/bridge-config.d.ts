#!/usr/bin/env ts-node
interface BridgeConfigArgs {
    sourceChain: string;
    targetChain: string;
    rpcUrl: string;
    scriptName: string;
    dryRun?: boolean;
    forgeOptions?: string;
}
export declare class BridgeConfigurator {
    private safeManager;
    constructor();
    configureBridge(args: BridgeConfigArgs): Promise<void>;
    /**
     * Run the Foundry script and return the chain ID
     */
    private runFoundryScript;
    /**
     * Get chain ID from RPC URL or use default mapping
     */
    private getChainIdFromRpc;
    /**
     * Read the broadcast file and extract transactions
     */
    private readBroadcastFile;
    /**
     * Display transactions in a readable format
     */
    private displayTransactions;
    /**
     * Propose transactions to Safe multisig
     */
    private proposeTransactionsToSafe;
    /**
     * Get available scripts from broadcast directory
     */
    static getAvailableScripts(): string[];
    /**
     * Get available chain IDs for a script
     */
    static getAvailableChains(scriptName: string): string[];
}
export {};
//# sourceMappingURL=bridge-config.d.ts.map