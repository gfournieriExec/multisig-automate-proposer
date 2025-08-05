"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.convertHexToDecimal = convertHexToDecimal;
exports.getChainIdFromRpc = getChainIdFromRpc;
exports.parseEnvironmentVariables = parseEnvironmentVariables;
exports.formatTransactionForDisplay = formatTransactionForDisplay;
exports.formatSafeTransactionHash = formatSafeTransactionHash;
exports.getAvailableScripts = getAvailableScripts;
exports.getAvailableChains = getAvailableChains;
exports.sleep = sleep;
exports.truncateData = truncateData;
exports.formatDate = formatDate;
exports.fileExists = fileExists;
exports.readJsonFile = readJsonFile;
exports.isValidHex = isValidHex;
exports.isValidAddress = isValidAddress;
exports.toChecksumAddress = toChecksumAddress;
exports.formatWeiToEther = formatWeiToEther;
exports.getBroadcastFilePath = getBroadcastFilePath;
exports.delay = delay;
exports.retryWithBackoff = retryWithBackoff;
const tslib_1 = require("tslib");
const ethers_1 = require("ethers");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
/**
 * Convert hex string to decimal string
 */
function convertHexToDecimal(hexValue) {
    if (!hexValue || hexValue === '0x' || hexValue === '0x0') {
        return '0';
    }
    // Remove 0x prefix if present
    const cleanHex = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
    // Convert to decimal
    const decimal = parseInt(cleanHex, 16);
    if (isNaN(decimal)) {
        console.warn(`Invalid hex value: ${hexValue}, using 0`);
        return '0';
    }
    return decimal.toString();
}
/**
 * Get chain ID from RPC connection to the blockchain
 */
async function getChainIdFromRpc(rpcUrl) {
    try {
        console.log(`Fetching chain ID from RPC: ${rpcUrl}`);
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        const chainId = network.chainId.toString();
        console.log(`Chain ID retrieved: ${chainId}`);
        return chainId;
    }
    catch (error) {
        console.error('Failed to fetch chain ID from RPC:', error);
        // Fallback to hardcoded mapping as a last resort
        console.log('Falling back to hardcoded chain ID mapping...');
        const chainMappings = {
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
                console.log(`Using fallback chain ID: ${chainId}`);
                return chainId;
            }
        }
        // Default to Sepolia if cannot determine
        console.log('Using default chain ID: 11155111 (Sepolia)');
        return '11155111';
    }
}
/**
 * Parse environment variables from string format: "KEY1=value1 KEY2=value2"
 */
function parseEnvironmentVariables(envVars) {
    const result = {};
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
 * Format transaction data for display
 */
function formatTransactionForDisplay(tx, index, total) {
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
function formatSafeTransactionHash(hash, index) {
    return `   ${index + 1}. ${hash}`;
}
/**
 * Get available scripts from broadcast directory
 */
function getAvailableScripts() {
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
function getAvailableChains(scriptName) {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Truncate data string for display purposes
 */
function truncateData(data, maxLength = 42) {
    if (!data || data.length <= maxLength) {
        return data || 'None';
    }
    return data.substring(0, maxLength) + '...';
}
/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) {
        return 'N/A';
    }
    return new Date(dateString).toLocaleString();
}
/**
 * Check if a file exists
 */
function fileExists(filePath) {
    return fs.existsSync(filePath);
}
/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}
/**
 * Validate hex string
 */
function isValidHex(value) {
    if (!value)
        return false;
    const cleanValue = value.startsWith('0x') ? value.slice(2) : value;
    return /^[0-9a-fA-F]*$/.test(cleanValue);
}
/**
 * Validate Ethereum address
 */
function isValidAddress(address) {
    try {
        return ethers_1.ethers.isAddress(address);
    }
    catch {
        return false;
    }
}
/**
 * Convert address to checksum format
 */
function toChecksumAddress(address) {
    try {
        return ethers_1.ethers.getAddress(address);
    }
    catch (error) {
        console.warn(`Invalid address format: ${address}`);
        return address; // Return original if conversion fails
    }
}
/**
 * Format wei to ether for display
 */
function formatWeiToEther(wei) {
    try {
        return ethers_1.ethers.formatEther(wei);
    }
    catch {
        return wei;
    }
}
/**
 * Get broadcast file path
 */
function getBroadcastFilePath(scriptName, chainId) {
    return path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`, chainId, 'run-latest.json');
}
/**
 * Create delay between operations
 */
async function delay(ms) {
    await sleep(ms);
}
/**
 * Retry operation with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            const delayMs = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
            await sleep(delayMs);
        }
    }
    throw new Error('Max retries exceeded');
}
/**
 * Console log utilities with consistent formatting
 */
exports.logger = {
    info: (message, ...args) => {
        console.log(`ℹ️  ${message}`, ...args);
    },
    success: (message, ...args) => {
        console.log(`✅ ${message}`, ...args);
    },
    warning: (message, ...args) => {
        console.warn(`⚠️  ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`❌ ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.DEBUG) {
            console.log(`🐛 ${message}`, ...args);
        }
    },
};
//# sourceMappingURL=utils.js.map