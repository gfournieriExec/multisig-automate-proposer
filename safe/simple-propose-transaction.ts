#!/usr/bin/env ts-node

import { SafeManager } from './safe-manager';
import { validateEnvironment } from './config';

interface ProposeTransactionArgs {
  to: string;
  value?: string;
  data?: string;
  operation?: 'call' | 'delegatecall';
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

Examples:
  npm run propose-tx -- --to 0x1234...5678 --value 1000000000000000000
  npm run propose-tx -- --to 0x1234...5678 --data 0xa9059cbb...
  npm run propose-tx -- --to 0x1234...5678 --data 0xa9059cbb... --operation delegatecall
    `);
    process.exit(1);
  }

  const parsedArgs: ProposeTransactionArgs = { to: '' };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--to':
        parsedArgs.to = value;
        break;
      case '--value':
        parsedArgs.value = value;
        break;
      case '--data':
        parsedArgs.data = value;
        break;
      case '--operation':
        parsedArgs.operation = value as 'call' | 'delegatecall';
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
    validateEnvironment();
    
    const safeManager = new SafeManager();
    
    const transactionData = parsedArgs.operation === 'delegatecall'
      ? safeManager.createDelegateCallTransaction(
          parsedArgs.to,
          parsedArgs.data || '0x'
        )
      : safeManager.createContractCallTransaction(
          parsedArgs.to,
          parsedArgs.data || '0x',
          parsedArgs.value || '0'
        );

    console.log('Proposing transaction with the following data:');
    console.log(JSON.stringify(transactionData, null, 2));
    console.log('');

    const safeTxHash = await safeManager.proposeTransaction(transactionData);
    
    console.log('Transaction proposed successfully!');
    console.log(`Safe Transaction Hash: ${safeTxHash}`);
    console.log('');
    console.log('Next steps:');
    console.log(`1. Review the transaction in the Safe web interface`);
    console.log(`2. Collect additional signatures from other owners using the Safe UI`);
    console.log(`3. Execute the transaction once threshold is reached through the Safe UI`);

  } catch (error) {
    console.error('Error proposing transaction:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
