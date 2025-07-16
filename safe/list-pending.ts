#!/usr/bin/env ts-node

import { SafeManager } from './safe-manager';
import { validateEnvironment } from './config';

interface ListPendingArgs {
  type?: 'pending' | 'all' | 'incoming' | 'multisig' | 'module';
  limit?: string;
}

async function main() {
  const args = process.argv.slice(2);
  
  const parsedArgs: ListPendingArgs = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--type':
        parsedArgs.type = value as 'pending' | 'all' | 'incoming' | 'multisig' | 'module';
        break;
      case '--limit':
        parsedArgs.limit = value;
        break;
      case '--help':
        console.log(`
Usage: npm run list-pending [options]

Options:
  --type <type>           Transaction type to list:
                          - pending: Pending transactions (default)
                          - all: All transactions
                          - incoming: Incoming transactions
                          - multisig: Multisig transactions
                          - module: Module transactions
  --limit <number>        Limit number of results

Examples:
  npm run list-pending
  npm run list-pending -- --type all
  npm run list-pending -- --type pending --limit 10
        `);
        process.exit(0);
      default:
        if (key.startsWith('--')) {
          console.error(`Unknown argument: ${key}`);
          process.exit(1);
        }
    }
  }

  try {
    validateEnvironment();
    
    const safeManager = new SafeManager();
    const transactionType = parsedArgs.type || 'pending';
    
    console.log(`Fetching ${transactionType} transactions...`);
    console.log('');

    let transactions: any;
    
    switch (transactionType) {
      case 'pending':
        transactions = await safeManager.getPendingTransactions();
        break;
      case 'all':
        transactions = await safeManager.getAllTransactions();
        break;
      case 'incoming':
        transactions = await safeManager.getIncomingTransactions();
        break;
      case 'multisig':
        transactions = await safeManager.getMultisigTransactions();
        break;
      case 'module':
        transactions = await safeManager.getModuleTransactions();
        break;
      default:
        console.error(`Unknown transaction type: ${transactionType}`);
        process.exit(1);
    }

    if (!transactions || !transactions.results || transactions.results.length === 0) {
      console.log(`No ${transactionType} transactions found.`);
      return;
    }

    const results = transactions.results;
    const limit = parsedArgs.limit ? parseInt(parsedArgs.limit) : results.length;
    const transactionsToShow = results.slice(0, limit);

    console.log(`Found ${results.length} ${transactionType} transaction(s) (showing ${transactionsToShow.length}):`);
    console.log('');

    transactionsToShow.forEach((tx: any, index: number) => {
      console.log(`Transaction ${index + 1}:`);
      console.log(`   Hash: ${tx.safeTxHash}`);
      console.log(`   To: ${tx.to}`);
      console.log(`   Value: ${tx.value} wei`);
      console.log(`   Data: ${tx.data ? tx.data.substring(0, 42) + '...' : 'None'}`);
      console.log(`   Confirmations: ${tx.confirmations?.length || 0}/${tx.confirmationsRequired || 'N/A'}`);
      console.log(`   Executable: ${tx.isExecuted ? 'Executed' : tx.confirmations?.length >= tx.confirmationsRequired ? 'Ready' : 'Pending'}`);
      console.log(`   Submission Date: ${tx.submissionDate ? new Date(tx.submissionDate).toLocaleString() : 'N/A'}`);
      
      if (tx.confirmations && tx.confirmations.length > 0) {
        console.log(`   Confirmed by:`);
        tx.confirmations.forEach((confirmation: any) => {
          console.log(`     - ${confirmation.owner}`);
        });
      }
      
      console.log('');
    });

    if (results.length > limit) {
      console.log(`... and ${results.length - limit} more transaction(s).`);
      console.log(`Use --limit ${results.length} to see all transactions.`);
    }

    console.log(`Total count: ${transactions.count || results.length}`);
    
    if (transactionType === 'pending' && transactionsToShow.length > 0) {
      console.log('');
      console.log('To confirm pending transactions, use the Safe web interface');
      console.log('   Visit: https://app.safe.global/');
    }

  } catch (error) {
    console.error('Error fetching transactions:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
