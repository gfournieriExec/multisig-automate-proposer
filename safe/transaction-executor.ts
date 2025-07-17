#!/usr/bin/env ts-node

import { SafeManager } from './safe-manager';
import { validateEnvironment } from './config';
import { MetaTransactionData } from '@safe-global/types-kit';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
  rpcUrl?: string;
  forgeOptions?: string;
  chainId?: string;
}

export class TransactionExecutor {
  private safeManager: SafeManager;

  constructor() {
    this.safeManager = new SafeManager();
  }

  /**
   * Execute transactions from a Foundry broadcast file
   */
  async executeFromBroadcast(config: ExecutionConfig): Promise<string[]> {
    console.log('Executing transactions from broadcast file...');
    
    let chainId = config.chainId;
    
    // If no chain ID provided, try to determine it from RPC URL
    if (!chainId && config.rpcUrl) {
      chainId = this.getChainIdFromRpc(config.rpcUrl);
    }
    
    if (!chainId) {
      throw new Error('Chain ID must be provided or derivable from RPC URL');
    }

    const scriptName = config.scriptName || 'IexecLayerZeroBridge';
    const transactions = await this.readBroadcastFile(scriptName, chainId);
    
    if (transactions.length === 0) {
      console.log('No transactions found in broadcast file');
      return [];
    }

    console.log(`Found ${transactions.length} transactions`);
    
    // Convert broadcast transactions to transaction inputs
    const transactionInputs = transactions.map(tx => ({
      to: tx.transaction.to,
      value: this.convertHexToDecimal(tx.transaction.value),
      data: tx.transaction.input,
      operation: 'call' as const
    }));

    return await this.executeTransactions(transactionInputs, config.dryRun);
  }

  /**
   * Execute transactions from Foundry script with automatic broadcast generation
   */
  async executeFromScript(
    sourceChain: string,
    targetChain: string,
    config: ExecutionConfig
  ): Promise<string[]> {
    console.log(`Executing script for ${sourceChain} -> ${targetChain}`);
    
    try {
      const chainId = await this.runFoundryScript(sourceChain, targetChain, config);
      
      const updatedConfig = { ...config, chainId };
      return await this.executeFromBroadcast(updatedConfig);
      
    } catch (error) {
      console.error('Failed to run Foundry script:', error);
      
      // Try to use existing broadcast file if script execution fails
      if (config.chainId || config.rpcUrl) {
        console.log('Attempting to use existing broadcast file...');
        return await this.executeFromBroadcast(config);
      }
      
      throw error;
    }
  }

  /**
   * Execute a single transaction
   */
  async executeSingleTransaction(
    to: string,
    value: string = '0',
    data: string = '0x',
    operation: 'call' | 'delegatecall' = 'call',
    dryRun: boolean = false
  ): Promise<string> {
    const transactionInput: TransactionInput = {
      to,
      value,
      data,
      operation
    };

    const results = await this.executeTransactions([transactionInput], dryRun);
    return results[0];
  }

  /**
   * Execute multiple transactions with proper nonce management
   */
  async executeTransactions(
    transactions: TransactionInput[],
    dryRun: boolean = false
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
    const transactionsData = transactions.map(tx => 
      tx.operation === 'delegatecall'
        ? this.safeManager.createDelegateCallTransaction(tx.to, tx.data)
        : this.safeManager.createContractCallTransaction(tx.to, tx.data, tx.value)
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
      const proposedHashes = await this.safeManager.proposeTransactionsWithSequentialNonces(transactionsData);
      
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
        console.log(`\nProposing transaction ${i + 1}/${transactionsData.length} (individual):`);
        
        try {
          const hash = await this.safeManager.proposeTransaction(transactionsData[i]);
          proposedHashes.push(hash);
          console.log(`   Success! Hash: ${hash}`);
          
          // Small delay between transactions
          if (i < transactionsData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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
  private async runFoundryScript(
    sourceChain: string,
    targetChain: string,
    config: ExecutionConfig
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const makeArgs = [
        'configure-bridge',
        `SOURCE_CHAIN=${sourceChain}`,
        `TARGET_CHAIN=${targetChain}`,
        `RPC_URL=${config.rpcUrl || 'http://localhost:8545'}`
      ];

      if (config.forgeOptions) {
        const options = config.forgeOptions.trim().split(/\s+/);
        makeArgs.push(`FORGE_OPTIONS=${options.join(' ')}`);
      }

      const makeProcess = spawn('make', makeArgs, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env }
      });

      makeProcess.on('close', (code) => {
        if (code === 0) {
          const chainId = this.getChainIdFromRpc(config.rpcUrl || 'http://localhost:8545');
          resolve(chainId);
        } else {
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
  private getChainIdFromRpc(rpcUrl: string): string {
    const chainMappings: Record<string, string> = {
      'sepolia': '11155111',
      'arbitrum-sepolia': '421614',
      'ethereum': '1',
      'arbitrum': '42161',
      'localhost': '31337',
      '127.0.0.1': '31337',
      'hardhat': '31337'
    };

    const url = rpcUrl.toLowerCase();
    for (const [network, chainId] of Object.entries(chainMappings)) {
      if (url.includes(network)) {
        return chainId;
      }
    }

    // Default to Sepolia if cannot determine
    return '11155111';
  }

  /**
   * Read the broadcast file and extract transactions
   */
  private async readBroadcastFile(scriptName: string, chainId: string): Promise<BroadcastTransaction[]> {
    const broadcastPath = path.join(
      process.cwd(),
      'broadcast',
      `${scriptName}.s.sol`,
      chainId,
      'run-latest.json'
    );

    if (!fs.existsSync(broadcastPath)) {
      throw new Error(`Broadcast file not found: ${broadcastPath}`);
    }

    const broadcastContent = fs.readFileSync(broadcastPath, 'utf8');
    const broadcastData: BroadcastFile = JSON.parse(broadcastContent);

    return broadcastData.transactions.filter(tx => tx.transactionType === 'CALL');
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
   * Convert hex string to decimal string
   */
  private convertHexToDecimal(hexValue: string): string {
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
   * Get available scripts from broadcast directory
   */
  static getAvailableScripts(): string[] {
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
  static getAvailableChains(scriptName: string): string[] {
    const scriptDir = path.join(process.cwd(), 'broadcast', `${scriptName}.s.sol`);
    if (!fs.existsSync(scriptDir)) {
      return [];
    }

    return fs.readdirSync(scriptDir)
      .filter(item => fs.statSync(path.join(scriptDir, item)).isDirectory());
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

Usage: npm run execute-tx -- [command] [options]

Commands:
  single              Execute a single transaction
  script              Execute transactions from Foundry script
  broadcast           Execute transactions from existing broadcast file

Single transaction options:
  --to <address>           Target address (required)
  --value <value>          ETH value to send in wei (default: 0)
  --data <data>            Transaction data (default: 0x)
  --operation <type>       Operation type: call or delegatecall (default: call)
  --dry-run               Show transaction without executing

Script execution options:
  --source-chain <chain>   Source chain name (required)
  --target-chain <chain>   Target chain name (required)
  --rpc-url <url>         RPC URL (default: http://localhost:8545)
  --script <name>         Script name (default: IexecLayerZeroBridge)
  --forge-options <opts>  Additional forge options
  --dry-run              Show transactions without executing

Broadcast execution options:
  --script <name>         Script name (required)
  --chain-id <id>         Chain ID (required)
  --dry-run              Show transactions without executing

Examples:
  npm run execute-tx -- single --to 0x1234...5678 --value 1000000000000000000
  npm run execute-tx -- script --source-chain sepolia --target-chain arbitrum-sepolia
  npm run execute-tx -- broadcast --script IexecLayerZeroBridge --chain-id 11155111 --dry-run

Available scripts: ${TransactionExecutor.getAvailableScripts().join(', ')}
    `);
    process.exit(1);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    validateEnvironment();
    
    const executor = new TransactionExecutor();
    
    switch (command) {
      case 'single':
        await executeSingleCommand(executor, commandArgs);
        break;
      case 'script':
        await executeScriptCommand(executor, commandArgs);
        break;
      case 'broadcast':
        await executeBroadcastCommand(executor, commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
    
  } catch (error) {
    console.error('Execution failed:', error);
    process.exit(1);
  }
}

async function executeSingleCommand(executor: TransactionExecutor, args: string[]) {
  const config: any = { dryRun: false };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--to':
        config.to = args[++i];
        break;
      case '--value':
        config.value = args[++i];
        break;
      case '--data':
        config.data = args[++i];
        break;
      case '--operation':
        config.operation = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
    }
  }
  
  if (!config.to) {
    console.error('Error: --to is required for single transaction');
    process.exit(1);
  }
  
  await executor.executeSingleTransaction(
    config.to,
    config.value || '0',
    config.data || '0x',
    config.operation || 'call',
    config.dryRun
  );
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
      case '--source-chain':
        config.sourceChain = args[++i];
        break;
      case '--target-chain':
        config.targetChain = args[++i];
        break;
      case '--rpc-url':
        config.rpcUrl = args[++i];
        break;
      case '--script':
        config.scriptName = args[++i];
        break;
      case '--forge-options':
        config.forgeOptions = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
    }
  }
  
  if (!config.sourceChain || !config.targetChain) {
    console.error('Error: --source-chain and --target-chain are required');
    process.exit(1);
  }
  
  await executor.executeFromScript(config.sourceChain, config.targetChain, config);
}

async function executeBroadcastCommand(executor: TransactionExecutor, args: string[]) {
  const config: any = { dryRun: false };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--script':
        config.scriptName = args[++i];
        break;
      case '--chain-id':
        config.chainId = args[++i];
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
    }
  }
  
  if (!config.scriptName || !config.chainId) {
    console.error('Error: --script and --chain-id are required');
    process.exit(1);
  }
  
  await executor.executeFromBroadcast(config);
}

if (require.main === module) {
  main();
}
