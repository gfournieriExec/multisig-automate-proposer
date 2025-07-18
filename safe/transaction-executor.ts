#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import { AnvilConfig, AnvilManager } from './anvil-manager';
import { validateEnvironment } from './config';
import { SafeManager } from './safe-manager';
import {
    convertHexToDecimal,
    getAvailableScripts,
    getBroadcastFilePath,
    getChainIdFromRpc,
    parseEnvironmentVariables,
    readJsonFile,
    sleep,
} from './utils';

interface BroadcastTransaction {
    hash: string;
    transactionType: string;
    contractName: string | null;
    contractAddress: string;
    function: string;
    arguments: any[];
    transaction: {
        from: string;
        to: string;
        gas: string;
        value: string;
        input: string;
        nonce: string;
        chainId: string;
    };
    additionalContracts: any[];
    isFixedGasLimit: boolean;
}

interface BroadcastFile {
    transactions: BroadcastTransaction[];
    receipts: any[];
    libraries: any[];
    pending: any[];
    returns: any;
    timestamp: number;
    chain: number;
    multi: boolean;
    commit: string;
}
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

export class TransactionExecutor {
    private safeManager: SafeManager;
    private anvilManager: AnvilManager;

    constructor() {
        this.safeManager = new SafeManager();
        this.anvilManager = new AnvilManager();
    }

    /**
     * Execute transactions from Foundry script with automatic broadcast generation
     */
    async executeFromScript(config: ExecutionConfig): Promise<string[]> {
        if (config.forgeScript) {
            console.log(`Executing forge script directly: ${config.forgeScript}`);
        } else if (config.envVars) {
            console.log(`Executing forge script with environment variables: ${config.envVars}`);
        } else if (config.smartContract) {
            console.log(`Executing forge script for smart contract: ${config.smartContract}`);
        } else {
            throw new Error(
                'Either forgeScript, envVars, or smartContract configuration is required',
            );
        }

        try {
            const chainId = await this.runFoundryScript(config);

            // Execute transactions from broadcast file
            console.log('Executing transactions from broadcast file...');
            const scriptName = config.scriptName || 'IexecLayerZeroBridge';
            const transactions = await this.readBroadcastFile(scriptName, chainId);

            if (transactions.length === 0) {
                console.log('No transactions found in broadcast file');
                return [];
            }

            console.log(`Found ${transactions.length} transactions`);

            // Convert broadcast transactions to transaction inputs
            const transactionInputs = transactions.map((tx) => ({
                to: tx.transaction.to,
                value: convertHexToDecimal(tx.transaction.value),
                data: tx.transaction.input,
                operation: 'call' as const,
            }));

            return await this.executeTransactions(transactionInputs, config.dryRun);
        } catch (error) {
            console.error('Failed to run Foundry script:', error);
            console.log('Attempting to use existing broadcast file...');

            // Fallback: try to execute from existing broadcast file
            console.log('Executing transactions from broadcast file...');
            const chainId = await getChainIdFromRpc(config.rpcUrl);
            const scriptName = config.scriptName || 'IexecLayerZeroBridge';
            const transactions = await this.readBroadcastFile(scriptName, chainId);

            if (transactions.length === 0) {
                console.log('No transactions found in broadcast file');
                return [];
            }

            console.log(`Found ${transactions.length} transactions`);

            // Convert broadcast transactions to transaction inputs
            const transactionInputs = transactions.map((tx) => ({
                to: tx.transaction.to,
                value: convertHexToDecimal(tx.transaction.value),
                data: tx.transaction.input,
                operation: 'call' as const,
            }));

            return await this.executeTransactions(transactionInputs, config.dryRun);
        }
    }

    /**
     * Execute multiple transactions with proper nonce management
     */
    async executeTransactions(
        transactions: TransactionInput[],
        dryRun: boolean = false,
    ): Promise<string[]> {
        if (transactions.length === 0) {
            console.log('No transactions to execute');
            return [];
        }

        console.log(`${dryRun ? 'Dry run: ' : ''}Executing ${transactions.length} transaction(s)`);

        if (dryRun) {
            this.displayTransactions(transactions);
            return [];
        }

        // Convert transaction inputs to MetaTransactionData
        const transactionsData = transactions.map((tx) =>
            tx.operation === 'delegatecall'
                ? this.safeManager.createDelegateCallTransaction(tx.to, tx.data)
                : this.safeManager.createContractCallTransaction(tx.to, tx.data, tx.value),
        );

        // Display transaction details
        transactions.forEach((tx, index) => {
            console.log(`\nTransaction ${index + 1}/${transactions.length}:`);
            console.log(`   To: ${tx.to}`);
            console.log(`   Value: ${tx.value}`);
            console.log(`   Operation: ${tx.operation || 'call'}`);
        });

        console.log('\nProposing transactions with sequential nonces...');

        try {
            // Try using the new sequential nonce method
            const proposedHashes =
                await this.safeManager.proposeTransactionsWithSequentialNonces(transactionsData);

            console.log('\nAll transactions executed successfully!');
            console.log('\nSafe Transaction Hashes:');
            proposedHashes.forEach((hash, index) => {
                console.log(`   ${index + 1}. ${hash}`);
            });

            return proposedHashes;
        } catch (error) {
            console.error('Sequential nonce method failed:', error);
            console.log('Falling back to individual transaction proposal...');

            // Fallback to individual transaction proposal
            const proposedHashes: string[] = [];

            for (let i = 0; i < transactionsData.length; i++) {
                console.log(
                    `\nProposing transaction ${i + 1}/${transactionsData.length} (individual):`,
                );

                try {
                    const hash = await this.safeManager.proposeTransaction(transactionsData[i]);
                    proposedHashes.push(hash);
                    console.log(`   Success! Hash: ${hash}`);

                    // Small delay between transactions
                    if (i < transactionsData.length - 1) {
                        await sleep(1000);
                    }
                } catch (individualError) {
                    console.error(`   Failed to propose transaction ${i + 1}:`, individualError);
                    throw individualError;
                }
            }

            console.log('\nAll transactions executed successfully (fallback method)!');
            console.log('\nSafe Transaction Hashes:');
            proposedHashes.forEach((hash, index) => {
                console.log(`   ${index + 1}. ${hash}`);
            });

            return proposedHashes;
        }
    }

    /**
     * Run the Foundry script and return the chain ID
     */
    private async runFoundryScript(config: ExecutionConfig): Promise<string> {
        let anvilConfig: AnvilConfig | undefined;

        try {
            // Start Anvil fork if needed
            if (AnvilManager.shouldStartFork(config.rpcUrl, false)) {
                console.log('Checking Anvil availability...');
                const anvilAvailable = await this.anvilManager.checkAvailability();

                if (!anvilAvailable) {
                    console.warn(
                        'Warning: Anvil is not available. Please install Foundry to use fork functionality.',
                    );
                    console.log('Continuing without fork.');
                } else {
                    anvilConfig = {
                        forkUrl: config.rpcUrl,
                        port: undefined,
                        host: undefined,
                    };

                    await this.anvilManager.startFork(anvilConfig);

                    // Wait a bit for Anvil to start
                    await sleep(3000);
                }
            }

            return new Promise((resolve, reject) => {
                let command: string = 'forge';
                let args: string[];
                let env = { ...process.env };

                // Determine the RPC URL to use for forge script
                const forgeRpcUrl = AnvilManager.getForgeRpcUrl(
                    config.rpcUrl,
                    this.anvilManager.isRunning(),
                    anvilConfig,
                );

                // Build forge script command
                const forgeScript = `${config.forgeScript || 'script/bridges/layerZero/IexecLayerZeroBridge.s.sol'}:${config.smartContract || 'Configure'}`;
                args = ['script', forgeScript, '--rpc-url', forgeRpcUrl, '--broadcast', '-vvv'];

                // Add forge options if provided
                if (config.forgeOptions) {
                    const options = config.forgeOptions.trim().split(/\s+/);
                    args.push(...options);
                }

                // Set environment variables for the forge script
                if (config.envVars) {
                    const parsedEnvVars = parseEnvironmentVariables(config.envVars);
                    Object.assign(env, parsedEnvVars);
                }

                console.log(`Running command: ${command} ${args.join(' ')}`);

                const childProcess = spawn(command, args, {
                    cwd: process.cwd(),
                    stdio: 'inherit',
                    env,
                });

                childProcess.on('close', async (code) => {
                    // Clean up Anvil process
                    this.anvilManager.stop();

                    if (code === 0) {
                        try {
                            const chainId = await getChainIdFromRpc(config.rpcUrl);
                            resolve(chainId);
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error(`${command} process exited with code ${code}`));
                    }
                });

                childProcess.on('error', (error) => {
                    // Clean up Anvil process on error
                    this.anvilManager.stopOnError();
                    reject(error);
                });
            });
        } catch (error) {
            // Clean up Anvil process if fork startup failed
            this.anvilManager.stopOnError();
            throw error;
        }
    }

    /**
     * Read the broadcast file and extract transactions
     */
    private async readBroadcastFile(
        scriptName: string,
        chainId: string,
    ): Promise<BroadcastTransaction[]> {
        const broadcastPath = getBroadcastFilePath(scriptName, chainId);
        const broadcastData: BroadcastFile = readJsonFile(broadcastPath);
        return broadcastData.transactions.filter((tx) => tx.transactionType === 'CALL');
    }

    /**
     * Display transactions in a readable format
     */
    private displayTransactions(transactions: TransactionInput[]): void {
        console.log('\nTransactions to be executed:');
        transactions.forEach((tx, index) => {
            console.log(`\nTransaction ${index + 1}:`);
            console.log(`   To: ${tx.to}`);
            console.log(`   Value: ${tx.value}`);
            console.log(`   Data: ${tx.data}`);
            console.log(`   Operation: ${tx.operation || 'call'}`);
        });
    }

    /**
     * Get the current nonce for the Safe
     */
    async getCurrentNonce(): Promise<number> {
        return await this.safeManager.getCurrentNonce();
    }
}

// CLI functionality
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Transaction Executor

Usage: npm run execute-tx -- [options]

Script execution options:
  --rpc-url <url>         RPC URL (default: http://localhost:8545)
  --script <name>         Script name for broadcast file (default: IexecLayerZeroBridge)
  --forge-script <path>   Forge script path (default: script/bridges/layerZero/IexecLayerZeroBridge.s.sol:Configure)
  --smart-contract <name> Smart contract name (default: Configure)
  --env-vars <vars>       Environment variables as string: "KEY1=value1 KEY2=value2"
  --forge-options <opts>  Additional forge options
  --dry-run              Show transactions without executing

Examples:
  npm run execute-tx -- --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY --env-vars "SOURCE_CHAIN=sepolia TARGET_CHAIN=arbitrum-sepolia"
  npm run execute-tx -- --rpc-url https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY --smart-contract Deploy
  npm run execute-tx -- --rpc-url http://localhost:8545 --forge-script "script/bridges/layerZero/IexecLayerZeroBridge.s.sol:Configure"

Available scripts: ${getAvailableScripts().join(', ')}
    `);
        process.exit(1);
    }

    try {
        validateEnvironment();

        const executor = new TransactionExecutor();
        await executeScriptCommand(executor, args);
    } catch (error) {
        console.error('Execution failed:', error);
        process.exit(1);
    }
}

async function executeScriptCommand(executor: TransactionExecutor, args: string[]) {
    const config: any = { dryRun: false, rpcUrl: 'http://localhost:8545' };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--forge-options=')) {
            config.forgeOptions = arg.substring('--forge-options='.length);
            continue;
        }

        switch (arg) {
            case '--rpc-url':
                config.rpcUrl = args[++i];
                break;
            case '--script':
                config.scriptName = args[++i];
                break;
            case '--forge-options':
                config.forgeOptions = args[++i];
                break;
            case '--forge-script':
                config.forgeScript = args[++i];
                break;
            case '--smart-contract':
                config.smartContract = args[++i];
                break;
            case '--env-vars':
                config.envVars = args[++i];
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
        }
    }

    // Check if we have the required configuration
    let hasValidConfig = false;

    // Check if forge script is explicitly provided
    if (config.forgeScript) {
        hasValidConfig = true;
    }

    // Check if smart contract is provided
    if (config.smartContract) {
        hasValidConfig = true;
    }

    // Check if environment variables are provided
    if (config.envVars) {
        hasValidConfig = true;
    }

    if (!hasValidConfig) {
        console.error('Error: Either --forge-script, --smart-contract, or --env-vars is required');
        process.exit(1);
    }

    await executor.executeFromScript(config);
}

if (require.main === module) {
    main();
}
