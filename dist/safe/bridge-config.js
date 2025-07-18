#!/usr/bin/env ts-node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeConfigurator = void 0;
const safe_manager_1 = require("./safe-manager");
const config_1 = require("./config");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BridgeConfigurator {
    constructor() {
        this.safeManager = new safe_manager_1.SafeManager();
    }
    async configureBridge(args) {
        console.log(`Configuring bridge ${args.sourceChain} -> ${args.targetChain}`);
        try {
            let chainId;
            let useExistingBroadcast = false;
            try {
                chainId = await this.runFoundryScript(args);
            }
            catch (foundryError) {
                chainId = this.getChainIdFromRpc(args.rpcUrl);
                useExistingBroadcast = true;
                const broadcastPath = path.join(process.cwd(), 'broadcast', `${args.scriptName}.s.sol`, chainId, 'run-latest.json');
                if (!fs.existsSync(broadcastPath)) {
                    throw foundryError;
                }
            }
            const transactions = await this.readBroadcastFile(args.scriptName, chainId);
            if (transactions.length === 0) {
                console.log('No transactions found in broadcast file');
                return;
            }
            console.log(`Found ${transactions.length} transactions to propose`);
            if (args.dryRun) {
                console.log('DRY RUN - Transactions that would be proposed:');
                this.displayTransactions(transactions);
            }
            else {
                console.log('Proposing transactions to Safe...');
                await this.proposeTransactionsToSafe(transactions);
            }
        }
        catch (error) {
            console.error('Error configuring bridge:', error);
            throw error;
        }
    }
    /**
     * Run the Foundry script and return the chain ID
     */
    async runFoundryScript(args) {
        return new Promise((resolve, reject) => {
            const makeArgs = [
                'configure-bridge',
                `SOURCE_CHAIN=${args.sourceChain}`,
                `TARGET_CHAIN=${args.targetChain}`,
                `RPC_URL=http://localhost:8545`
            ];
            if (args.forgeOptions) {
                const options = args.forgeOptions.trim().split(/\s+/);
                makeArgs.push(`FORGE_OPTIONS=${options.join(' ')}`);
            }
            const makeProcess = (0, child_process_1.spawn)('make', makeArgs, {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: { ...process.env }
            });
            makeProcess.on('close', (code) => {
                if (code === 0) {
                    const chainId = this.getChainIdFromRpc(args.rpcUrl);
                    resolve(chainId);
                }
                else {
                    reject(new Error(`Make process exited with code ${code}`));
                }
            });
            makeProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
    /**
     * Get chain ID from RPC URL or use default mapping
     */
    getChainIdFromRpc(rpcUrl) {
        const chainMappings = {
            'sepolia': '11155111',
            'arbitrum-sepolia': '421614',
            'ethereum': '1',
            'arbitrum': '42161'
        };
        const url = rpcUrl.toLowerCase();
        for (const [network, chainId] of Object.entries(chainMappings)) {
            if (url.includes(network)) {
                return chainId;
            }
        }
        return '11155111';
    }
    /**
     * Read the broadcast file and extract transactions
     */
    async readBroadcastFile(scriptName, chainId) {
        const broadcastPath = path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`, chainId, 'run-latest.json');
        if (!fs.existsSync(broadcastPath)) {
            throw new Error(`Broadcast file not found: ${broadcastPath}`);
        }
        const broadcastContent = fs.readFileSync(broadcastPath, 'utf8');
        const broadcastData = JSON.parse(broadcastContent);
        return broadcastData.transactions.filter(tx => tx.transactionType === 'CALL');
    }
    /**
     * Display transactions in a readable format
     */
    displayTransactions(transactions) {
        transactions.forEach((tx, index) => {
            console.log(`\nTransaction ${index + 1}:`);
            console.log(`   To: ${tx.contractAddress}`);
            console.log(`   Function: ${tx.function}`);
            console.log(`   Value: ${tx.transaction.value}`);
            console.log(`   Data: ${tx.transaction.input}`);
            console.log(`   Gas: ${tx.transaction.gas}`);
        });
    }
    /**
     * Propose transactions to Safe multisig
     */
    async proposeTransactionsToSafe(transactions) {
        const proposedHashes = [];
        for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            console.log(`\nProposing transaction ${i + 1}/${transactions.length}:`);
            console.log(`   To: ${tx.contractAddress}`);
            console.log(`   Function: ${tx.function}`);
            try {
                const transactionData = this.safeManager.createContractCallTransaction(tx.contractAddress, tx.transaction.input, tx.transaction.value);
                const safeTxHash = await this.safeManager.proposeTransaction(transactionData);
                proposedHashes.push(safeTxHash);
                console.log(`   Proposed! Safe TX Hash: ${safeTxHash}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`   Failed to propose transaction ${i + 1}:`, error);
                throw error;
            }
        }
        console.log('\nAll transactions proposed successfully!');
        console.log('\nSafe Transaction Hashes:');
        proposedHashes.forEach((hash, index) => {
            console.log(`   ${index + 1}. ${hash}`);
        });
    }
    /**
     * Get available scripts from broadcast directory
     */
    static getAvailableScripts() {
        const broadcastDir = path.join(process.cwd(), 'broadcast');
        if (!fs.existsSync(broadcastDir)) {
            return [];
        }
        return fs.readdirSync(broadcastDir)
            .filter(item => item.endsWith('.s.sol'))
            .map(item => item.replace('.s.sol', ''));
    }
    /**
     * Get available chain IDs for a script
     */
    static getAvailableChains(scriptName) {
        const scriptDir = path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`);
        if (!fs.existsSync(scriptDir)) {
            return [];
        }
        return fs.readdirSync(scriptDir)
            .filter(item => fs.statSync(path.join(scriptDir, item)).isDirectory());
    }
}
exports.BridgeConfigurator = BridgeConfigurator;
// CLI functionality
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
Safe Bridge Configurator

Usage: npm run bridge-config -- [options]

Options:
  --source-chain <chain>     Source chain name (required)
  --target-chain <chain>     Target chain name (required)
  --rpc-url <url>           RPC URL for the source chain (required)
  --script <name>           Script name (default: IexecLayerZeroBridge)
  --forge-options <options>  Additional forge options (e.g. "--unlocked --sender 0x...")
  --dry-run                 Show transactions without proposing
  --help                    Show this help message

Examples:
  npm run bridge-config -- --source-chain sepolia --target-chain arbitrum-sepolia --rpc-url https://sepolia.infura.io/v3/YOUR_KEY
  npm run bridge-config -- --source-chain sepolia --target-chain arbitrum-sepolia --rpc-url https://sepolia.infura.io/v3/YOUR_KEY --dry-run
  npm run bridge-config -- --source-chain sepolia --target-chain arbitrum-sepolia --rpc-url http://localhost:8545 --forge-options="--unlocked --sender 0x9990cfb1Feb7f47297F54bef4d4EbeDf6c5463a3"

Available scripts: ${BridgeConfigurator.getAvailableScripts().join(', ')}
    `);
        process.exit(1);
    }
    // Parse arguments
    const config = {
        sourceChain: '',
        targetChain: '',
        rpcUrl: '',
        scriptName: 'IexecLayerZeroBridge',
        dryRun: false,
        forgeOptions: undefined
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--forge-options=')) {
            config.forgeOptions = arg.substring('--forge-options='.length);
            continue;
        }
        switch (arg) {
            case '--source-chain':
                if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
                    console.error('Error: --source-chain requires a value');
                    process.exit(1);
                }
                config.sourceChain = args[++i];
                break;
            case '--target-chain':
                if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
                    console.error('Error: --target-chain requires a value');
                    process.exit(1);
                }
                config.targetChain = args[++i];
                break;
            case '--rpc-url':
                if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
                    console.error('Error: --rpc-url requires a value');
                    process.exit(1);
                }
                config.rpcUrl = args[++i];
                break;
            case '--script':
                if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
                    console.error('Error: --script requires a value');
                    process.exit(1);
                }
                config.scriptName = args[++i];
                break;
            case '--forge-options':
                if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
                    console.error('Error: --forge-options requires a value');
                    process.exit(1);
                }
                config.forgeOptions = args[++i];
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--help':
                console.log('Help message already shown above');
                process.exit(0);
            default:
                console.error(`Unknown argument: ${arg}`);
                process.exit(1);
        }
    }
    // Validate required arguments
    if (!config.sourceChain || !config.targetChain || !config.rpcUrl) {
        console.error('Error: --source-chain, --target-chain, and --rpc-url are required');
        process.exit(1);
    }
    try {
        (0, config_1.validateEnvironment)();
        const configurator = new BridgeConfigurator();
        await configurator.configureBridge(config);
    }
    catch (error) {
        console.error('Configuration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=bridge-config.js.map