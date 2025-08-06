#!/usr/bin/env ts-node

import { validateEnvironment } from './config';
import { SafeManager } from './safe-manager';

interface ProposeTransactionArgs {
    to: string;
    value?: string;
    data?: string;
    operation?: 'call' | 'delegatecall';
    debug?: boolean;
}

// Validation functions
function isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidHexData(data: string): boolean {
    return /^0x[a-fA-F0-9]*$/.test(data);
}

function isValidValue(value: string): boolean {
    try {
        const num = BigInt(value);
        return num >= 0n;
    } catch {
        return false;
    }
}

function isValidOperation(operation: string): operation is 'call' | 'delegatecall' {
    return operation === 'call' || operation === 'delegatecall';
}

function showUsageAndExit(): void {
    process.stdout.write(`
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

function parseCommandLineArgs(): ProposeTransactionArgs {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showUsageAndExit();
    }

    const parsedArgs: ProposeTransactionArgs = { to: '', debug: false };

    for (let i = 0; i < args.length; i++) {
        const key = args[i];

        if (key === '--debug') {
            parsedArgs.debug = true;
            continue;
        }

        const value = args[i + 1];

        if (!value || value.startsWith('--')) {
            process.stderr.write(`Error: ${key} requires a value\n`);
            process.exit(1);
        }

        i++; // Skip the value on next iteration
        processArgument(key, value, parsedArgs);
    }

    if (!parsedArgs.to) {
        process.stderr.write('Error: --to argument is required\n');
        process.exit(1);
    }

    return parsedArgs;
}

function processArgument(key: string, value: string, parsedArgs: ProposeTransactionArgs): void {
    switch (key) {
        case '--to':
            validateAddress(value);
            parsedArgs.to = value;
            break;
        case '--value':
            validateValue(value);
            parsedArgs.value = value;
            break;
        case '--data':
            validateData(value);
            parsedArgs.data = value;
            break;
        case '--operation':
            validateOperation(value);
            parsedArgs.operation = value;
            break;
        default:
            process.stderr.write(`Unknown argument: ${key}\n`);
            process.exit(1);
    }
}
function validateAddress(value: string): void {
    if (!isValidAddress(value)) {
        process.stderr.write(`Error: Invalid address format: ${value}\n`);
        process.stderr.write(
            'Address must be a valid Ethereum address (0x followed by 40 hex characters)\n',
        );
        process.exit(1);
    }
}

function validateValue(value: string): void {
    if (!isValidValue(value)) {
        process.stderr.write(`Error: Invalid value: ${value}\n`);
        process.stderr.write('Value must be a non-negative integer in wei\n');
        process.exit(1);
    }
}

function validateData(value: string): void {
    if (!isValidHexData(value)) {
        process.stderr.write(`Error: Invalid data format: ${value}\n`);
        process.stderr.write('Data must be valid hex data starting with 0x\n');
        process.exit(1);
    }
}

function validateOperation(value: string): asserts value is 'call' | 'delegatecall' {
    if (!isValidOperation(value)) {
        process.stderr.write(`Error: Invalid operation: ${value}\n`);
        process.stderr.write('Operation must be either "call" or "delegatecall"\n');
        process.exit(1);
    }
}

function printDebugInfo(parsedArgs: ProposeTransactionArgs): void {
    if (!parsedArgs.debug) {
        return;
    }

    process.stdout.write('🐛 Debug mode enabled\n');
    process.stdout.write(`📋 Parsed arguments: ${JSON.stringify(parsedArgs)}\n`);
    process.stdout.write('🌍 Environment variables:\n');
    process.stdout.write(`  - RPC_URL: ${process.env.RPC_URL}\n`);
    process.stdout.write(`  - CHAIN_ID: ${process.env.CHAIN_ID}\n`);
    process.stdout.write(`  - SAFE_ADDRESS: ${process.env.SAFE_ADDRESS}\n`);
    process.stdout.write(`  - PROPOSER_1_ADDRESS: ${process.env.PROPOSER_1_ADDRESS}\n`);
    process.stdout.write('\n');
}

function handleError(error: unknown, debug: boolean): void {
    process.stderr.write(`❌ Error proposing transaction: ${String(error)}\n`);

    if (debug) {
        process.stderr.write('\n🐛 Debug information:\n');
        process.stderr.write(`Stack trace: ${String(error)}\n`);
    }

    // Provide more helpful error messages
    if (error instanceof Error) {
        if (error.message.includes('invalid address')) {
            process.stderr.write('\n💡 Tip: Make sure the address is a valid Ethereum address\n');
        } else if (error.message.includes('network')) {
            process.stderr.write('\n💡 Tip: Check your network connection and RPC_URL\n');
        } else if (error.message.includes('SAFE_ADDRESS') || error.message.includes('PROPOSER')) {
            process.stderr.write('\n� Tip: Check your .env.safe file configuration\n');
        }
    }

    process.exit(1);
}

async function main(): Promise<void> {
    const parsedArgs = parseCommandLineArgs();

    try {
        printDebugInfo(parsedArgs);

        process.stdout.write('�🔍 Validating environment...\n');
        validateEnvironment();
        process.stdout.write('✅ Environment validation successful\n');

        process.stdout.write('🔧 Initializing Safe manager...\n');
        const safeManager = new SafeManager();

        const transactionData =
            parsedArgs.operation === 'delegatecall'
                ? safeManager.createDelegateCallTransaction(parsedArgs.to, parsedArgs.data || '0x')
                : safeManager.createContractCallTransaction(
                      parsedArgs.to,
                      parsedArgs.data || '0x',
                      parsedArgs.value || '0',
                  );

        process.stdout.write('📝 Proposing transaction with the following data:\n');
        process.stdout.write(`${JSON.stringify(transactionData, null, 2)}\n`);
        process.stdout.write('\n');

        process.stdout.write('🚀 Submitting transaction to Safe...\n');
        const safeTxHash = await safeManager.proposeTransaction(transactionData);

        process.stdout.write('✅ Transaction proposed successfully!\n');
        process.stdout.write(`🔗 Safe Transaction Hash: ${safeTxHash}\n`);
        process.stdout.write('\n');
        process.stdout.write('📋 Next steps:\n');
        process.stdout.write('1. Review the transaction in the Safe web interface\n');
        process.stdout.write(
            '2. Collect additional signatures from other owners using the Safe UI\n',
        );
        process.stdout.write(
            '3. Execute the transaction once threshold is reached through the Safe UI\n',
        );
    } catch (error) {
        handleError(error, parsedArgs.debug || false);
    }
}

if (require.main === module) {
    main().catch((error) => {
        process.stderr.write(`Fatal error: ${error}\n`);
        process.exit(1);
    });
}
