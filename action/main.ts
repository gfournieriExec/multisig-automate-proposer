#!/usr/bin/env node

import * as core from '@actions/core';
import { writeFileSync } from 'fs';
import { validateEnvironment } from '../safe/config';
import { ErrorCode, SafeTransactionError } from '../safe/errors';
import { logger } from '../safe/logger';
import { SafeManager } from '../safe/safe-manager';
import { TransactionExecutor } from '../safe/transaction-executor';
import { getChainIdFromRpc } from '../safe/utils';

interface ActionInputs {
    safeAddress: string;
    safeNetwork: string;
    rpcUrl: string;
    proposerAddress: string;
    proposerPrivateKey: string;
    safeApiKey: string;
    foundryScriptPath: string;
    foundryScriptArgs: string;
    actionMode: 'propose' | 'list-pending';
    transactionDescription: string;
    environment: string;
    gasLimit?: string;
    anvilFork: boolean;
    dryRun: boolean;
}

class GitHubActionRunner {
    private inputs: ActionInputs;

    constructor() {
        this.inputs = this.parseInputs();
    }

    private parseInputs(): ActionInputs {
        return {
            safeAddress: core.getInput('safe-address', { required: true }),
            safeNetwork: core.getInput('safe-network', { required: true }),
            rpcUrl: core.getInput('rpc-url', { required: true }),
            proposerAddress: core.getInput('proposer-address', { required: true }),
            proposerPrivateKey: core.getInput('proposer-private-key', { required: true }),
            safeApiKey: core.getInput('safe-api-key'),
            foundryScriptPath: core.getInput('foundry-script-path', { required: true }),
            foundryScriptArgs: core.getInput('foundry-script-args') || '',
            actionMode: (core.getInput('action-mode') as 'propose' | 'list-pending') || 'propose',
            transactionDescription:
                core.getInput('transaction-description') || 'Automated transaction proposal',
            environment: core.getInput('environment') || 'production',
            gasLimit: core.getInput('gas-limit') || undefined,
            anvilFork: core.getBooleanInput('anvil-fork'),
            dryRun: core.getBooleanInput('dry-run'),
        };
    }

    private setupEnvironment(): void {
        // Create environment configuration for the Safe integration
        const envConfig = `
SAFE_ADDRESS=${this.inputs.safeAddress}
SAFE_NETWORK=${this.inputs.safeNetwork}
RPC_URL=${this.inputs.rpcUrl}
PROPOSER_ADDRESS=${this.inputs.proposerAddress}
PROPOSER_PRIVATE_KEY=${this.inputs.proposerPrivateKey}
SAFE_API_KEY=${this.inputs.safeApiKey}
ENVIRONMENT=${this.inputs.environment}
${this.inputs.gasLimit ? `GAS_LIMIT=${this.inputs.gasLimit}` : ''}
        `.trim();

        // Write environment configuration to a temporary file
        writeFileSync('.env.safe', envConfig);

        // Set environment variables for the process
        process.env.SAFE_ADDRESS = this.inputs.safeAddress;
        process.env.SAFE_NETWORK = this.inputs.safeNetwork;
        process.env.RPC_URL = this.inputs.rpcUrl;
        process.env.PROPOSER_ADDRESS = this.inputs.proposerAddress;
        process.env.PROPOSER_PRIVATE_KEY = this.inputs.proposerPrivateKey;
        process.env.ENVIRONMENT = this.inputs.environment;
        process.env.SAFE_API_KEY = this.inputs.safeApiKey;
        if (this.inputs.gasLimit) {
            process.env.GAS_LIMIT = this.inputs.gasLimit;
        }

        logger.info('Environment configured for GitHub Action', {
            safeAddress: this.inputs.safeAddress,
            safeNetwork: this.inputs.safeNetwork,
            environment: this.inputs.environment,
            actionMode: this.inputs.actionMode,
            dryRun: this.inputs.dryRun,
        });
    }

    private async validateInputs(): Promise<void> {
        try {
            validateEnvironment();

            // Validate chain ID matches network
            const chainId = await getChainIdFromRpc(this.inputs.rpcUrl);
            logger.info('Validated RPC connection', { chainId });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown validation error';
            core.setFailed(`Input validation failed: ${message}`);
            throw error;
        }
    }

    private async executeAction(): Promise<void> {
        switch (this.inputs.actionMode) {
            case 'propose':
                await this.proposeTransaction();
                break;
            case 'list-pending':
                await this.listPendingTransactions();
                break;
            default:
                throw new SafeTransactionError(
                    `Invalid action mode: ${String(this.inputs.actionMode)}`,
                    ErrorCode.UNKNOWN_ERROR,
                );
        }
    }

    private async proposeTransaction(): Promise<void> {
        logger.info('Starting transaction proposal', {
            scriptPath: this.inputs.foundryScriptPath,
            dryRun: this.inputs.dryRun,
        });

        const executor = new TransactionExecutor();

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

            logger.info('Transaction proposal completed successfully', {
                transactionCount: transactionHashes.length,
                hashes: transactionHashes,
            });
        } catch (error) {
            core.setOutput('status', 'failed');
            throw error;
        }
    }

    private async listPendingTransactions(): Promise<void> {
        logger.info('Listing pending transactions');

        try {
            const safeManager = new SafeManager();
            const pendingTxs = await safeManager.getPendingTransactions();

            // Output pending transactions as JSON
            core.setOutput('pending-transactions', JSON.stringify(pendingTxs, null, 2));
            core.setOutput('status', 'success');

            logger.info('Listed pending transactions', {
                count: pendingTxs.results?.length || 0,
                next: pendingTxs.next,
                previous: pendingTxs.previous,
            });
        } catch (error) {
            core.setOutput('status', 'failed');
            throw error;
        }
    }

    async run(): Promise<void> {
        try {
            core.info('🚀 Starting Safe Multisig Transaction Proposer Action');

            // Setup environment and validate inputs
            this.setupEnvironment();
            await this.validateInputs();

            // Execute the requested action
            await this.executeAction();

            core.info('✅ Action completed successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            core.setFailed(`Action failed: ${message}`);

            logger.error('GitHub Action failed', {
                error: message,
                stack: error instanceof Error ? error.stack : undefined,
            });

            process.exit(1);
        }
    }
}

// Execute the action
if (require.main === module) {
    const runner = new GitHubActionRunner();
    runner.run().catch((error: unknown) => {
        logger.error(
            'Unhandled error in GitHub Action:',
            error instanceof Error ? error : new Error(String(error)),
        );
        process.exit(1);
    });
}

export { GitHubActionRunner };
