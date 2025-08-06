#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const safe_manager_1 = require("./safe-manager");
const utils_1 = require("./utils");
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const parsedArgs = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        switch (key) {
            case '--type':
                parsedArgs.type = value;
                break;
            case '--limit':
                parsedArgs.limit = value;
                break;
            case '--help':
                showHelpAndExit();
                break;
            default:
                if (key.startsWith('--')) {
                    console.error(`Unknown argument: ${key}`);
                    process.exit(1);
                }
        }
    }
    return parsedArgs;
}
function showHelpAndExit() {
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
}
async function fetchTransactions(safeManager, transactionType) {
    switch (transactionType) {
        case 'pending':
            return await safeManager.getPendingTransactions();
        case 'all':
            return await safeManager.getAllTransactions();
        case 'incoming':
            return await safeManager.getIncomingTransactions();
        case 'multisig':
            return await safeManager.getMultisigTransactions();
        case 'module':
            return await safeManager.getModuleTransactions();
        default:
            console.error(`Unknown transaction type: ${transactionType}`);
            process.exit(1);
    }
}
function displayTransaction(tx, index) {
    console.log(`Transaction ${index + 1}:`);
    console.log(`   Hash: ${tx.safeTxHash || 'N/A'}`);
    console.log(`   To: ${tx.to || 'N/A'}`);
    console.log(`   Value: ${(0, utils_1.formatWeiToEther)(tx.value || '0')} ETH (${tx.value || '0'} wei)`);
    console.log(`   Data: ${(0, utils_1.truncateData)(tx.data || '')}`);
    console.log(`   Confirmations: ${tx.confirmations?.length || 0}/${tx.confirmationsRequired || 'N/A'}`);
    const isExecutable = determineExecutionStatus(tx);
    console.log(`   Executable: ${isExecutable}`);
    console.log(`   Submission Date: ${(0, utils_1.formatDate)(tx.submissionDate || '')}`);
    displayConfirmations(tx.confirmations);
    console.log('');
}
function displayConfirmations(confirmations) {
    if (confirmations && confirmations.length > 0) {
        console.log(`   Confirmed by:`);
        confirmations.forEach((confirmation) => {
            console.log(`     - ${confirmation.owner || 'Unknown'}`);
        });
    }
}
function determineExecutionStatus(tx) {
    if (tx.isExecuted) {
        return 'Executed';
    }
    const confirmationsCount = tx.confirmations?.length || 0;
    const requiredConfirmations = tx.confirmationsRequired || 0;
    return confirmationsCount >= requiredConfirmations ? 'Ready' : 'Pending';
}
function displayTransactionsSummary(results, transactionsToShow, transactions, transactionType, limit) {
    console.log(`Found ${results.length} ${transactionType} transaction(s) (showing ${transactionsToShow.length}):`);
    console.log('');
    transactionsToShow.forEach(displayTransaction);
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
}
async function main() {
    const parsedArgs = parseCommandLineArgs();
    try {
        await (0, config_1.validateEnvironment)();
        const safeManager = await safe_manager_1.SafeManager.create();
        const transactionType = parsedArgs.type || 'pending';
        console.log(`Fetching ${transactionType} transactions...`);
        console.log('');
        const transactions = await fetchTransactions(safeManager, transactionType);
        if (!transactions ||
            !Array.isArray(transactions.results) ||
            transactions.results.length === 0) {
            console.log(`No ${transactionType} transactions found.`);
            return;
        }
        const results = transactions.results;
        const limit = parsedArgs.limit ? parseInt(parsedArgs.limit) : results.length;
        const transactionsToShow = results.slice(0, limit);
        displayTransactionsSummary(results, transactionsToShow, transactions, transactionType, limit);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    void main();
}
//# sourceMappingURL=list-pending.js.map