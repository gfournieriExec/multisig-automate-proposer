#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleUsage = exampleUsage;
const transaction_executor_1 = require("./transaction-executor");
const config_1 = require("./config");
/**
 * Example usage of the TransactionExecutor class
 * This file demonstrates how to use the abstracted transaction execution logic
 */
async function exampleUsage() {
    try {
        // Validate environment variables are set
        (0, config_1.validateEnvironment)();
        // Create executor instance
        const executor = new transaction_executor_1.TransactionExecutor();
        console.log('=== TransactionExecutor Example Usage ===\n');
        // // Example 1: Execute a single transaction
        // console.log('1. Executing a single transaction...');
        // const singleTxHash = await executor.executeSingleTransaction(
        //   '0x316A389d7f0Ac46B19FCbE7076f125566f09CEBc', // Example address
        //   '0', // No ETH value
        //   '0x', // No data
        //   'call', // Call operation
        //   true // Dry run - set to false to actually execute
        // );
        // if (singleTxHash) {
        //   console.log(`Single transaction hash: ${singleTxHash}\n`);
        // }
        // Example 2: Execute from Foundry script (requires proper setup)
        console.log('2. Executing from Foundry script...');
        try {
            const scriptHashes = await executor.executeFromScript({
                envVars: 'SOURCE_CHAIN=sepolia TARGET_CHAIN=arbitrum-sepolia CUSTOM_VAR=customValue',
                forgeOptions: '--unlocked --sender 0x9990cfb1Feb7f47297F54bef4d4EbeDf6c5463a3',
                dryRun: true, // Set to false to actually execute
                rpcUrl: 'http://localhost:8545',
                scriptName: 'IexecLayerZeroBridge',
            });
            console.log(`Script execution completed with ${scriptHashes.length} transactions\n`);
        }
        catch (error) {
            console.log('Script execution skipped (likely no broadcast file available)\n');
        }
        // Example 3: Execute from existing broadcast file
        // console.log('3. Executing from existing broadcast file...');
        // try {
        //   const broadcastHashes = await executor.executeFromBroadcast({
        //     scriptName: 'IexecLayerZeroBridge',
        //     chainId: '11155111', // Sepolia
        //     dryRun: true // Set to false to actually execute
        //   });
        //   console.log(`Broadcast execution completed with ${broadcastHashes.length} transactions\n`);
        // } catch (error) {
        //   console.log('Broadcast execution skipped (likely no broadcast file available)\n');
        // }
        // Example 4: Execute multiple custom transactions
        // console.log('4. Executing multiple custom transactions...');
        // const multipleHashes = await executor.executeTransactions([
        //   {
        //     to: '0x316A389d7f0Ac46B19FCbE7076f125566f09CEBc',
        //     value: '0',
        //     data: '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b8d4c9db4c0ec2c2ce0000000000000000000000000000000000000000000000000de0b6b3a7640000', // ERC20 transfer example
        //     operation: 'call'
        //   },
        //   {
        //     to: '0x316A389d7f0Ac46B19FCbE7076f125566f09CEBc',
        //     value: '1000000000000000', // 1 ETH
        //     data: '0x',
        //     operation: 'call'
        //   }
        // ], false); // Dry run
        // console.log(`Multiple transactions completed with ${multipleHashes.length} transactions\n`);
        // Show available scripts and chains
        // console.log('5. Available resources:');
        // const availableScripts = TransactionExecutor.getAvailableScripts();
        // console.log(`Available scripts: ${availableScripts.join(', ') || 'None found'}`);
        // if (availableScripts.length > 0) {
        //   const availableChains = TransactionExecutor.getAvailableChains(availableScripts[0]);
        //   console.log(`Available chains for ${availableScripts[0]}: ${availableChains.join(', ') || 'None found'}`);
        // }
    }
    catch (error) {
        console.error('Example execution failed:', error);
    }
}
// Run the example if this file is executed directly
if (require.main === module) {
    exampleUsage();
}
//# sourceMappingURL=transaction-executor-example.js.map