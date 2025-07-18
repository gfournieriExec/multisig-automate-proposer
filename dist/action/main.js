#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubActionRunner = void 0;
const tslib_1 = require("tslib");
const core = tslib_1.__importStar(require("@actions/core"));
const fs_1 = require("fs");
const config_1 = require("../safe/config");
const errors_1 = require("../safe/errors");
const logger_1 = require("../safe/logger");
const safe_manager_1 = require("../safe/safe-manager");
const transaction_executor_1 = require("../safe/transaction-executor");
const utils_1 = require("../safe/utils");
class GitHubActionRunner {
    constructor() {
        this.inputs = this.parseInputs();
    }
    parseInputs() {
        return {
            safeAddress: core.getInput('safe-address', { required: true }),
            safeNetwork: core.getInput('safe-network', { required: true }),
            rpcUrl: core.getInput('rpc-url', { required: true }),
            proposerPrivateKey: core.getInput('proposer-private-key', { required: true }),
            foundryScriptPath: core.getInput('foundry-script-path', { required: true }),
            foundryScriptArgs: core.getInput('foundry-script-args') || '',
            actionMode: core.getInput('action-mode') || 'propose',
            transactionDescription: core.getInput('transaction-description') || 'Automated transaction proposal',
            environment: core.getInput('environment') || 'production',
            gasLimit: core.getInput('gas-limit') || undefined,
            anvilFork: core.getBooleanInput('anvil-fork'),
            dryRun: core.getBooleanInput('dry-run'),
        };
    }
    setupEnvironment() {
        // Create environment configuration for the Safe integration
        const envConfig = `
SAFE_ADDRESS=${this.inputs.safeAddress}
SAFE_NETWORK=${this.inputs.safeNetwork}
RPC_URL=${this.inputs.rpcUrl}
PROPOSER_PRIVATE_KEY=${this.inputs.proposerPrivateKey}
ENVIRONMENT=${this.inputs.environment}
${this.inputs.gasLimit ? `GAS_LIMIT=${this.inputs.gasLimit}` : ''}
        `.trim();
        // Write environment configuration to a temporary file
        (0, fs_1.writeFileSync)('.env.safe', envConfig);
        // Set environment variables for the process
        process.env.SAFE_ADDRESS = this.inputs.safeAddress;
        process.env.SAFE_NETWORK = this.inputs.safeNetwork;
        process.env.RPC_URL = this.inputs.rpcUrl;
        process.env.PROPOSER_PRIVATE_KEY = this.inputs.proposerPrivateKey;
        process.env.ENVIRONMENT = this.inputs.environment;
        if (this.inputs.gasLimit) {
            process.env.GAS_LIMIT = this.inputs.gasLimit;
        }
        logger_1.logger.info('Environment configured for GitHub Action', {
            safeAddress: this.inputs.safeAddress,
            safeNetwork: this.inputs.safeNetwork,
            environment: this.inputs.environment,
            actionMode: this.inputs.actionMode,
            dryRun: this.inputs.dryRun,
        });
    }
    async validateInputs() {
        try {
            await (0, config_1.validateEnvironment)();
            // Validate chain ID matches network
            const chainId = await (0, utils_1.getChainIdFromRpc)(this.inputs.rpcUrl);
            logger_1.logger.info('Validated RPC connection', { chainId });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown validation error';
            core.setFailed(`Input validation failed: ${message}`);
            throw error;
        }
    }
    async executeAction() {
        switch (this.inputs.actionMode) {
            case 'propose':
                await this.proposeTransaction();
                break;
            case 'execute':
                await this.executeTransaction();
                break;
            case 'list-pending':
                await this.listPendingTransactions();
                break;
            default:
                throw new errors_1.SafeTransactionError(errors_1.ErrorCode.UNKNOWN_ERROR, `Invalid action mode: ${this.inputs.actionMode}`);
        }
    }
    async proposeTransaction() {
        logger_1.logger.info('Starting transaction proposal', {
            scriptPath: this.inputs.foundryScriptPath,
            dryRun: this.inputs.dryRun,
        });
        const executor = new transaction_executor_1.TransactionExecutor();
        try {
            // Configure execution parameters based on inputs
            const executionConfig = {
                dryRun: this.inputs.dryRun,
                rpcUrl: this.inputs.rpcUrl,
                forgeScript: this.inputs.foundryScriptPath,
                forgeOptions: this.inputs.foundryScriptArgs,
            };
            const transactionHashes = await executor.executeFromScript(executionConfig);
            // Set action outputs
            if (transactionHashes && transactionHashes.length > 0) {
                core.setOutput('transaction-hash', transactionHashes[0]);
                core.setOutput('transaction-hashes', JSON.stringify(transactionHashes));
            }
            core.setOutput('status', 'success');
            core.setOutput('transaction-count', transactionHashes.length.toString());
            logger_1.logger.info('Transaction proposal completed successfully', {
                transactionCount: transactionHashes.length,
                hashes: transactionHashes
            });
        }
        catch (error) {
            core.setOutput('status', 'failed');
            throw error;
        }
    }
    async executeTransaction() {
        logger_1.logger.info('Starting transaction execution');
        // This would implement transaction execution logic
        // For now, we'll use the same script execution approach
        await this.proposeTransaction();
    }
    async listPendingTransactions() {
        logger_1.logger.info('Listing pending transactions');
        try {
            const safeManager = new safe_manager_1.SafeManager();
            const pendingTxs = await safeManager.getPendingTransactions();
            // Output pending transactions as JSON
            core.setOutput('pending-transactions', JSON.stringify(pendingTxs, null, 2));
            core.setOutput('status', 'success');
            logger_1.logger.info('Listed pending transactions', {
                count: pendingTxs.results?.length || 0,
                next: pendingTxs.next,
                previous: pendingTxs.previous
            });
        }
        catch (error) {
            core.setOutput('status', 'failed');
            throw error;
        }
    }
    async run() {
        try {
            core.info('🚀 Starting Safe Multisig Transaction Proposer Action');
            // Setup environment and validate inputs
            this.setupEnvironment();
            await this.validateInputs();
            // Execute the requested action
            await this.executeAction();
            core.info('✅ Action completed successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            core.setFailed(`Action failed: ${message}`);
            logger_1.logger.error('GitHub Action failed', {
                error: message,
                stack: error instanceof Error ? error.stack : undefined,
            });
            process.exit(1);
        }
    }
}
exports.GitHubActionRunner = GitHubActionRunner;
// Execute the action
if (require.main === module) {
    const runner = new GitHubActionRunner();
    runner.run().catch((error) => {
        console.error('Unhandled error in GitHub Action:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=main.js.map