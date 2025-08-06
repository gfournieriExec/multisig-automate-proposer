import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert hex string to decimal string
 */
export function convertHexToDecimal(hexValue: string): string {
    if (!hexValue || hexValue === '0x' || hexValue === '0x0') {
        return '0';
    }

    // Remove 0x prefix if present
    const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;

    // Convert to decimal
    const decimal = parseInt(cleanHex, 16);

    if (isNaN(decimal)) {
        process.stderr.write(`Invalid hex value: ${hexValue}, using 0\n`);
        return '0';
    }

    return decimal.toString();
}

/**
 * Get chain ID from RPC connection to the blockchain
 */
export async function getChainIdFromRpc(rpcUrl: string): Promise<string> {
    try {
        process.stdout.write(`Fetching chain ID from RPC: ${rpcUrl}\n`);

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        const chainId = network.chainId.toString();

        process.stdout.write(`Chain ID retrieved: ${chainId}\n`);
        return chainId;
    } catch (error) {
        process.stderr.write(`Failed to fetch chain ID from RPC: ${String(error)}\n`);

        // Fallback to hardcoded mapping as a last resort
        process.stdout.write('Falling back to hardcoded chain ID mapping...\n');
        const chainMappings: Record<string, string> = {
            sepolia: '11155111',
            'arbitrum-sepolia': '421614',
            ethereum: '1',
            arbitrum: '42161',
            localhost: '31337',
            '127.0.0.1': '31337',
            hardhat: '31337',
        };

        const url = rpcUrl.toLowerCase();
        for (const [network, chainId] of Object.entries(chainMappings)) {
            if (url.includes(network)) {
                process.stdout.write(`Using fallback chain ID: ${chainId}\n`);
                return chainId;
            }
        }

        // Default to Sepolia if cannot determine
        process.stdout.write('Using default chain ID: 11155111 (Sepolia)\n');
        return '11155111';
    }
}

/**
 * Parse environment variables from string format: "KEY1=value1 KEY2=value2"
 */
export function parseEnvironmentVariables(envVars: string): Record<string, string> {
    const result: Record<string, string> = {};
    const envPairs = envVars.trim().split(/\s+/);

    envPairs.forEach((pair) => {
        const [key, value] = pair.split('=');
        if (key && value) {
            result[key] = value;
        }
    });

    return result;
}

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
export function formatTransactionForDisplay(
    tx: TransactionData,
    index: number,
    total: number,
): string {
    return `
Transaction ${index + 1}/${total}:
   To: ${tx.to}
   Value: ${tx.value}
   Data: ${tx.data ? tx.data.substring(0, 42) + '...' : 'None'}
   Operation: ${tx.operation || 'call'}`;
}

/**
 * Format Safe transaction hash for display
 */
export function formatSafeTransactionHash(hash: string, index: number): string {
    return `   ${index + 1}. ${hash}`;
}

/**
 * Get available scripts from broadcast directory
 */
export function getAvailableScripts(): string[] {
    const broadcastDir = path.join(process.cwd(), 'broadcast');
    if (!fs.existsSync(broadcastDir)) {
        return [];
    }

    return fs
        .readdirSync(broadcastDir)
        .filter((item) => item.endsWith('.s.sol'))
        .map((item) => item.replace('.s.sol', ''));
}

/**
 * Get available chain IDs for a script
 */
export function getAvailableChains(scriptName: string): string[] {
    const scriptDir = path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`);
    if (!fs.existsSync(scriptDir)) {
        return [];
    }

    return fs
        .readdirSync(scriptDir)
        .filter((item) => fs.statSync(path.join(scriptDir, item)).isDirectory());
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate data string for display purposes
 */
export function truncateData(data: string, maxLength: number = 42): string {
    if (!data || data.length <= maxLength) {
        return data || 'None';
    }
    return data.substring(0, maxLength) + '...';
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
    if (!dateString) {
        return 'N/A';
    }
    return new Date(dateString).toLocaleString();
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Read JSON file safely
 */
export function readJsonFile<T = unknown>(filePath: string): T {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent) as T;
}

/**
 * Validate hex string
 */
export function isValidHex(value: string): boolean {
    if (!value) {
        return false;
    }
    const cleanValue = value.startsWith('0x') ? value.slice(2) : value;
    return /^[0-9a-fA-F]*$/.test(cleanValue);
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
    try {
        return ethers.isAddress(address);
    } catch {
        return false;
    }
}

/**
 * Convert address to checksum format
 */
export function toChecksumAddress(address: string): string {
    try {
        return ethers.getAddress(address);
    } catch {
        process.stderr.write(`Invalid address format: ${address}\n`);
        return address; // Return original if conversion fails
    }
}

/**
 * Format wei to ether for display
 */
export function formatWeiToEther(wei: string): string {
    try {
        return ethers.formatEther(wei);
    } catch {
        return wei;
    }
}

/**
 * Get broadcast file path
 */
export function getBroadcastFilePath(scriptName: string, chainId: string): string {
    return path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`, chainId, 'run-latest.json');
}

/**
 * Create delay between operations
 */
export async function delay(ms: number): Promise<void> {
    await sleep(ms);
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }

            const delayMs = baseDelay * Math.pow(2, attempt - 1);
            process.stdout.write(`Attempt ${attempt} failed, retrying in ${delayMs}ms...\n`);
            await sleep(delayMs);
        }
    }

    throw new Error('Max retries exceeded');
}

/**
 * Console log utilities with consistent formatting
 */
export const logger = {
    info: (message: string, ...args: unknown[]): void => {
        process.stdout.write(`ℹ️  ${message}\n`);
        if (args.length > 0) {
            process.stdout.write(`${JSON.stringify(args)}\n`);
        }
    },
    success: (message: string, ...args: unknown[]): void => {
        process.stdout.write(`✅ ${message}\n`);
        if (args.length > 0) {
            process.stdout.write(`${JSON.stringify(args)}\n`);
        }
    },
    warning: (message: string, ...args: unknown[]): void => {
        process.stderr.write(`⚠️  ${message}\n`);
        if (args.length > 0) {
            process.stderr.write(`${JSON.stringify(args)}\n`);
        }
    },
    error: (message: string, ...args: unknown[]): void => {
        process.stderr.write(`❌ ${message}\n`);
        if (args.length > 0) {
            process.stderr.write(`${JSON.stringify(args)}\n`);
        }
    },
    debug: (message: string, ...args: unknown[]): void => {
        if (process.env.DEBUG) {
            process.stdout.write(`🐛 ${message}\n`);
            if (args.length > 0) {
                process.stdout.write(`${JSON.stringify(args)}\n`);
            }
        }
    },
};
