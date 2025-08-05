"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnvilManager = void 0;
const child_process_1 = require("child_process");
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
            console.log(`Starting Anvil fork from: ${config.forkUrl}`);
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
                console.log(`Auto-impersonate enabled for ${config.unlockAccounts.length} account(s)`);
            }
            console.log(`Anvil command: anvil ${anvilArgs.join(' ')}`);
            this.anvilProcess = (0, child_process_1.spawn)('anvil', anvilArgs, {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
                env: { ...process.env },
            });
            let startupComplete = false;
            // Monitor stdout for startup confirmation
            this.anvilProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log(`Anvil: ${output.trim()}`);
                // Look for the "Listening on" message to confirm startup
                if (output.includes('Listening on') && !startupComplete) {
                    startupComplete = true;
                    this.isStarted = true;
                    this.currentConfig = config;
                    console.log(`Anvil fork started successfully on ${host}:${port}`);
                    resolve(this.anvilProcess);
                }
            });
            // Monitor stderr for errors
            this.anvilProcess.stderr?.on('data', (data) => {
                const error = data.toString();
                console.error(`Anvil Error: ${error.trim()}`);
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
            console.log('Stopping Anvil fork...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }
    /**
     * Stop the Anvil process due to an error
     */
    stopOnError() {
        if (this.anvilProcess) {
            console.log('Stopping Anvil fork due to error...');
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