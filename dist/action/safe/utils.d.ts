/**
 * Convert hex string to decimal string
 */
export declare function convertHexToDecimal(hexValue: string): string;
/**
 * Get chain ID from RPC connection to the blockchain
 */
export declare function getChainIdFromRpc(rpcUrl: string): Promise<string>;
/**
 * Parse environment variables from string format: "KEY1=value1 KEY2=value2"
 */
export declare function parseEnvironmentVariables(envVars: string): Record<string, string>;
/**
 * Interface for transaction data
 */
interface TransactionData {
    to: string;
    value: string;
    data?: string;
    operation?: string;
}
/**
 * Format transaction data for display
 */
export declare function formatTransactionForDisplay(tx: TransactionData, index: number, total: number): string;
/**
 * Format Safe transaction hash for display
 */
export declare function formatSafeTransactionHash(hash: string, index: number): string;
/**
 * Get available scripts from broadcast directory
 */
export declare function getAvailableScripts(): string[];
/**
 * Get available chain IDs for a script
 */
export declare function getAvailableChains(scriptName: string): string[];
/**
 * Sleep for a specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Truncate data string for display purposes
 */
export declare function truncateData(data: string, maxLength?: number): string;
/**
 * Format date for display
 */
export declare function formatDate(dateString: string): string;
/**
 * Check if a file exists
 */
export declare function fileExists(filePath: string): boolean;
/**
 * Read JSON file safely
 */
export declare function readJsonFile<T = unknown>(filePath: string): T;
/**
 * Validate hex string
 */
export declare function isValidHex(value: string): boolean;
/**
 * Validate Ethereum address
 */
export declare function isValidAddress(address: string): boolean;
/**
 * Convert address to checksum format
 */
export declare function toChecksumAddress(address: string): string;
/**
 * Format wei to ether for display
 */
export declare function formatWeiToEther(wei: string): string;
/**
 * Get broadcast file path
 */
export declare function getBroadcastFilePath(scriptName: string, chainId: string): string;
/**
 * Create delay between operations
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Retry operation with exponential backoff
 */
export declare function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Console log utilities with consistent formatting
 */
export declare const logger: {
    info: (message: string, ...args: unknown[]) => void;
    success: (message: string, ...args: unknown[]) => void;
    warning: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
};
export {};
//# sourceMappingURL=utils.d.ts.map