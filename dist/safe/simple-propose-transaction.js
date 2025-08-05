#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const safe_manager_1 = require("./safe-manager");
const config_1 = require("./config");
// Validation functions
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function isValidHexData(data) {
    return /^0x[a-fA-F0-9]*$/.test(data);
}
function isValidValue(value) {
    try {
        const num = BigInt(value);
        return num >= 0n;
    }
    catch {
        return false;
    }
}
function isValidOperation(operation) {
    return operation === 'call' || operation === 'delegatecall';
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`
Usage: npm run propose-tx -- --to <address> [options]

Options:
  --to <address>           Target address (required)
  --value <value>          ETH value to send in wei (default: 0)
  --data <data>            Transaction data (default: 0x)
  --operation <type>       Operation type: call or delegatecall (default: call)
  --debug                  Enable debug output

Examples:
  npm run propose-tx -- --to 0x1234...5678 --value 1000000000000000000
  npm run propose-tx -- --to 0x1234...5678 --data 0xa9059cbb...
  npm run propose-tx -- --to 0x1234...5678 --data 0xa9059cbb... --operation delegatecall
  npm run propose-tx -- --to 0x1234...5678 --debug
    `);
        process.exit(1);
    }
    const parsedArgs = { to: '', debug: false };
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (key === '--debug') {
            parsedArgs.debug = true;
            continue;
        }
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
            console.error(`Error: ${key} requires a value`);
            process.exit(1);
        }
        switch (key) {
            case '--to':
                if (!isValidAddress(value)) {
                    console.error(`Error: Invalid address format: ${value}`);
                    console.error('Address must be a valid Ethereum address (0x followed by 40 hex characters)');
                    process.exit(1);
                }
                parsedArgs.to = value;
                i++; // Skip the value on next iteration
                break;
            case '--value':
                if (!isValidValue(value)) {
                    console.error(`Error: Invalid value: ${value}`);
                    console.error('Value must be a non-negative integer in wei');
                    process.exit(1);
                }
                parsedArgs.value = value;
                i++; // Skip the value on next iteration
                break;
            case '--data':
                if (!isValidHexData(value)) {
                    console.error(`Error: Invalid data format: ${value}`);
                    console.error('Data must be valid hex data starting with 0x');
                    process.exit(1);
                }
                parsedArgs.data = value;
                i++; // Skip the value on next iteration
                break;
            case '--operation':
                if (!isValidOperation(value)) {
                    console.error(`Error: Invalid operation: ${value}`);
                    console.error('Operation must be either "call" or "delegatecall"');
                    process.exit(1);
                }
                parsedArgs.operation = value;
                i++; // Skip the value on next iteration
                break;
            default:
                console.error(`Unknown argument: ${key}`);
                process.exit(1);
        }
    }
    if (!parsedArgs.to) {
        console.error('Error: --to argument is required');
        process.exit(1);
    }
    try {
        if (parsedArgs.debug) {
            console.log('🐛 Debug mode enabled');
            console.log('📋 Parsed arguments:', parsedArgs);
            console.log('🌍 Environment variables:');
            console.log(`  - RPC_URL: ${process.env.RPC_URL}`);
            console.log(`  - CHAIN_ID: ${process.env.CHAIN_ID}`);
            console.log(`  - SAFE_ADDRESS: ${process.env.SAFE_ADDRESS}`);
            console.log(`  - PROPOSER_1_ADDRESS: ${process.env.PROPOSER_1_ADDRESS}`);
            console.log('');
        }
        console.log('🔍 Validating environment...');
        (0, config_1.validateEnvironment)();
        console.log('✅ Environment validation successful');
        console.log('🔧 Initializing Safe manager...');
        const safeManager = new safe_manager_1.SafeManager();
        const transactionData = parsedArgs.operation === 'delegatecall'
            ? safeManager.createDelegateCallTransaction(parsedArgs.to, parsedArgs.data || '0x')
            : safeManager.createContractCallTransaction(parsedArgs.to, parsedArgs.data || '0x', parsedArgs.value || '0');
        console.log('📝 Proposing transaction with the following data:');
        console.log(JSON.stringify(transactionData, null, 2));
        console.log('');
        console.log('🚀 Submitting transaction to Safe...');
        const safeTxHash = await safeManager.proposeTransaction(transactionData);
        console.log('✅ Transaction proposed successfully!');
        console.log(`🔗 Safe Transaction Hash: ${safeTxHash}`);
        console.log('');
        console.log('📋 Next steps:');
        console.log(`1. Review the transaction in the Safe web interface`);
        console.log(`2. Collect additional signatures from other owners using the Safe UI`);
        console.log(`3. Execute the transaction once threshold is reached through the Safe UI`);
    }
    catch (error) {
        console.error('❌ Error proposing transaction:', error);
        if (parsedArgs.debug) {
            console.error('\n🐛 Debug information:');
            console.error('Stack trace:', error);
        }
        // Provide more helpful error messages
        if (error instanceof Error) {
            if (error.message.includes('invalid address')) {
                console.error('\n💡 Tip: Make sure the address is a valid Ethereum address');
            }
            else if (error.message.includes('network')) {
                console.error('\n💡 Tip: Check your network connection and RPC_URL');
            }
            else if (error.message.includes('SAFE_ADDRESS') || error.message.includes('PROPOSER')) {
                console.error('\n💡 Tip: Check your .env.safe file configuration');
            }
        }
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=simple-propose-transaction.js.map