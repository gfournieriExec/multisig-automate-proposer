"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnvilManager = void 0;
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
class AnvilManager {
    constructor() {
        this.anvilProcess = null;
        this.isStarted = false;
        this.currentConfig = null;
    }
    /**
     * Check if Anvil is available on the system
     */
    async checkAvailability() {
        return new Promise((resolve) => {
            const checkProcess = (0, child_process_1.spawn)('anvil', ['--version'], {
                stdio: 'pipe',
            });
            checkProcess.on('close', (code) => {
                resolve(code === 0);
            });
            checkProcess.on('error', () => {
                resolve(false);
            });
            // Timeout after 5 seconds
            setTimeout(() => {
                checkProcess.kill();
                resolve(false);
            }, 5000);
        });
    }
    /**
     * Start an Anvil fork from the given RPC URL
     */
    async startFork(config) {
        return new Promise((resolve, reject) => {
            const port = config.port || 8545;
            const host = config.host || '0.0.0.0';
            const timeout = config.timeout || 30000;
            const accounts = config.accounts || 10;
            const balance = config.balance || 10000;
            logger_1.logger.info(`Starting Anvil fork from: ${config.forkUrl}`);
            const anvilArgs = [
                '--fork-url',
                config.forkUrl,
                '--host',
                host,
                '--port',
                port.toString(),
                '--accounts',
                accounts.toString(),
                '--balance',
                balance.toString(),
            ];
            // Add auto-impersonate if we have accounts to unlock
            if (config.unlockAccounts && config.unlockAccounts.length > 0) {
                anvilArgs.push('--auto-impersonate');
                logger_1.logger.info(`Auto-impersonate enabled for ${config.unlockAccounts.length} account(s)`);
            }
            logger_1.logger.info(`Anvil command: anvil ${anvilArgs.join(' ')}`);
            this.anvilProcess = (0, child_process_1.spawn)('anvil', anvilArgs, {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
                env: { ...process.env },
            });
            let startupComplete = false;
            // Monitor stdout for startup confirmation
            this.anvilProcess.stdout?.on('data', (data) => {
                const output = String(data);
                logger_1.logger.info(`Anvil: ${output.trim()}`);
                // Look for the "Listening on" message to confirm startup
                if (output.includes('Listening on') && !startupComplete) {
                    startupComplete = true;
                    this.isStarted = true;
                    this.currentConfig = config;
                    logger_1.logger.info(`Anvil fork started successfully on ${host}:${port}`);
                    // Fund any unlock accounts after startup
                    if (config.unlockAccounts && config.unlockAccounts.length > 0) {
                        this.fundUnlockAccounts(config.unlockAccounts, balance, host, port).catch((error) => {
                            logger_1.logger.error(`Failed to fund unlock accounts: ${error.message}`);
                        });
                    }
                    if (this.anvilProcess) {
                        resolve(this.anvilProcess);
                    }
                    else {
                        reject(new Error('Anvil process is null after startup'));
                    }
                }
            });
            // Monitor stderr for errors
            this.anvilProcess.stderr?.on('data', (data) => {
                const errorOutput = String(data);
                logger_1.logger.error(`Anvil Error: ${errorOutput.trim()}`);
            });
            this.anvilProcess.on('error', (error) => {
                if (!startupComplete) {
                    this.cleanup();
                    reject(new Error(`Failed to start Anvil: ${error.message}`));
                }
            });
            this.anvilProcess.on('close', (code) => {
                this.isStarted = false;
                if (!startupComplete) {
                    this.cleanup();
                    reject(new Error(`Anvil process exited with code ${code} before startup`));
                }
            });
            // Timeout if Anvil doesn't start
            setTimeout(() => {
                if (!startupComplete) {
                    this.stop();
                    reject(new Error(`Anvil startup timeout after ${timeout / 1000} seconds`));
                }
            }, timeout);
        });
    }
    /**
     * Stop the Anvil fork process
     */
    stop() {
        if (this.anvilProcess && this.isStarted) {
            logger_1.logger.info('Stopping Anvil fork...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }
    /**
     * Stop the Anvil process due to an error
     */
    stopOnError() {
        if (this.anvilProcess) {
            logger_1.logger.info('Stopping Anvil fork due to error...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }
    /**
     * Clean up internal state
     */
    cleanup() {
        this.anvilProcess = null;
        this.isStarted = false;
        this.currentConfig = null;
    }
    /**
     * Check if Anvil is currently running
     */
    isRunning() {
        return this.isStarted && this.anvilProcess !== null;
    }
    /**
     * Get the current Anvil process
     */
    getProcess() {
        return this.anvilProcess;
    }
    /**
     * Fund unlock accounts using Anvil RPC calls
     */
    async fundUnlockAccounts(accounts, balance, host, port) {
        const rpcUrl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
        // Convert balance from ETH to Wei (18 decimals)
        const balanceWei = `0x${(BigInt(balance) * BigInt(10) ** BigInt(18)).toString(16)}`;
        logger_1.logger.info(`Funding ${accounts.length} unlock account(s) with ${balance} ETH each...`);
        for (const account of accounts) {
            try {
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'anvil_setBalance',
                        params: [account, balanceWei],
                        id: 1,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = (await response.json());
                if (result.error) {
                    throw new Error(`RPC error: ${result.error.message}`);
                }
                logger_1.logger.info(`Successfully funded account ${account} with ${balance} ETH`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to fund account ${account}: ${String(error)}`);
                throw error;
            }
        }
    }
    /**
     * Extract sender addresses from forge options string
     */
    static extractSenderFromForgeOptions(forgeOptions) {
        if (!forgeOptions) {
            return [];
        }
        const senders = [];
        const options = forgeOptions.trim().split(/\s+/);
        for (let i = 0; i < options.length; i++) {
            if (options[i] === '--sender' && i + 1 < options.length) {
                const sender = options[i + 1];
                if (sender && sender.startsWith('0x')) {
                    senders.push(sender);
                }
            }
        }
        return senders;
    }
    /**
     * Determine if a fork should be started based on RPC URL
     */
    static shouldStartFork(rpcUrl, skipAnvilFork = false) {
        if (skipAnvilFork) {
            return false;
        }
        // Don't start fork if already using localhost
        return !rpcUrl.includes('localhost') && !rpcUrl.includes('127.0.0.1');
    }
    /**
     * Get the appropriate RPC URL for forge script execution
     */
    static getForgeRpcUrl(rpcUrl, anvilRunning, anvilConfig) {
        if (anvilRunning && anvilConfig) {
            // Use the configured Anvil port if we started a fork
            const port = anvilConfig.port || 8545;
            const host = anvilConfig.host === '0.0.0.0' ? 'localhost' : anvilConfig.host || 'localhost';
            return `http://${host}:${port}`;
        }
        else if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
            // Use the original RPC URL if it's already localhost
            return rpcUrl;
        }
        // Default to localhost:8545
        return 'http://localhost:8545';
    }
}
exports.AnvilManager = AnvilManager;
//# sourceMappingURL=anvil-manager.js.map