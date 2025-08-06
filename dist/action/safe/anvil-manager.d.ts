import { ChildProcess } from 'child_process';
export interface AnvilConfig {
    port?: number;
    host?: string;
    forkUrl: string;
    timeout?: number;
    accounts?: number;
    balance?: number;
    unlockAccounts?: string[];
}
export declare class AnvilManager {
    private anvilProcess;
    private isStarted;
    private currentConfig;
    /**
     * Check if Anvil is available on the system
     */
    checkAvailability(): Promise<boolean>;
    /**
     * Start an Anvil fork from the given RPC URL
     */
    startFork(config: AnvilConfig): Promise<ChildProcess>;
    /**
     * Stop the Anvil fork process
     */
    stop(): void;
    /**
     * Stop the Anvil process due to an error
     */
    stopOnError(): void;
    /**
     * Clean up internal state
     */
    private cleanup;
    /**
     * Check if Anvil is currently running
     */
    isRunning(): boolean;
    /**
     * Get the current Anvil process
     */
    getProcess(): ChildProcess | null;
    /**
     * Fund unlock accounts using Anvil RPC calls
     */
    private fundUnlockAccounts;
    /**
     * Extract sender addresses from forge options string
     */
    static extractSenderFromForgeOptions(forgeOptions?: string): string[];
    /**
     * Determine if a fork should be started based on RPC URL
     */
    static shouldStartFork(rpcUrl: string, skipAnvilFork?: boolean): boolean;
    /**
     * Get the appropriate RPC URL for forge script execution
     */
    static getForgeRpcUrl(rpcUrl: string, anvilRunning: boolean, anvilConfig?: AnvilConfig): string;
}
//# sourceMappingURL=anvil-manager.d.ts.map