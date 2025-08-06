import { ChildProcess, spawn } from 'child_process';
import { logger } from './logger';

export interface AnvilConfig {
    port?: number;
    host?: string;
    forkUrl: string;
    timeout?: number;
    accounts?: number;
    balance?: number;
    unlockAccounts?: string[];
}

export class AnvilManager {
    private anvilProcess: ChildProcess | null = null;
    private isStarted: boolean = false;
    private currentConfig: AnvilConfig | null = null;

    /**
     * Check if Anvil is available on the system
     */
    async checkAvailability(): Promise<boolean> {
        return new Promise((resolve) => {
            const checkProcess = spawn('anvil', ['--version'], {
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
    async startFork(config: AnvilConfig): Promise<ChildProcess> {
        return new Promise((resolve, reject) => {
            const port = config.port || 8545;
            const host = config.host || '0.0.0.0';
            const timeout = config.timeout || 30000;
            const accounts = config.accounts || 10;
            const balance = config.balance || 10000;

            logger.info(`Starting Anvil fork from: ${config.forkUrl}`);

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
                logger.info(
                    `Auto-impersonate enabled for ${config.unlockAccounts.length} account(s)`,
                );
            }

            logger.info(`Anvil command: anvil ${anvilArgs.join(' ')}`);

            this.anvilProcess = spawn('anvil', anvilArgs, {
                cwd: process.cwd(),
                stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
                env: { ...process.env },
            });

            let startupComplete = false;

            // Monitor stdout for startup confirmation
            this.anvilProcess.stdout?.on('data', (data: Buffer) => {
                const output = String(data);
                logger.info(`Anvil: ${output.trim()}`);

                // Look for the "Listening on" message to confirm startup
                if (output.includes('Listening on') && !startupComplete) {
                    startupComplete = true;
                    this.isStarted = true;
                    this.currentConfig = config;
                    logger.info(`Anvil fork started successfully on ${host}:${port}`);

                    // Fund any unlock accounts after startup
                    if (config.unlockAccounts && config.unlockAccounts.length > 0) {
                        this.fundUnlockAccounts(config.unlockAccounts, balance, host, port).catch(
                            (error: Error) => {
                                logger.error(`Failed to fund unlock accounts: ${error.message}`);
                            },
                        );
                    }

                    if (this.anvilProcess) {
                        resolve(this.anvilProcess);
                    } else {
                        reject(new Error('Anvil process is null after startup'));
                    }
                }
            });

            // Monitor stderr for errors
            this.anvilProcess.stderr?.on('data', (data: Buffer) => {
                const errorOutput = String(data);
                logger.error(`Anvil Error: ${errorOutput.trim()}`);
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
    stop(): void {
        if (this.anvilProcess && this.isStarted) {
            logger.info('Stopping Anvil fork...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }

    /**
     * Stop the Anvil process due to an error
     */
    stopOnError(): void {
        if (this.anvilProcess) {
            logger.info('Stopping Anvil fork due to error...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }

    /**
     * Clean up internal state
     */
    private cleanup(): void {
        this.anvilProcess = null;
        this.isStarted = false;
        this.currentConfig = null;
    }

    /**
     * Check if Anvil is currently running
     */
    isRunning(): boolean {
        return this.isStarted && this.anvilProcess !== null;
    }

    /**
     * Get the current Anvil process
     */
    getProcess(): ChildProcess | null {
        return this.anvilProcess;
    }

    /**
     * Fund unlock accounts using Anvil RPC calls
     */
    private async fundUnlockAccounts(
        accounts: string[],
        balance: number,
        host: string,
        port: number,
    ): Promise<void> {
        const rpcUrl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;

        // Convert balance from ETH to Wei (18 decimals)
        const balanceWei = `0x${(BigInt(balance) * BigInt(10) ** BigInt(18)).toString(16)}`;

        logger.info(`Funding ${accounts.length} unlock account(s) with ${balance} ETH each...`);

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

                const result = (await response.json()) as { error?: { message: string } };

                if (result.error) {
                    throw new Error(`RPC error: ${result.error.message}`);
                }

                logger.info(`Successfully funded account ${account} with ${balance} ETH`);
            } catch (error: unknown) {
                logger.error(`Failed to fund account ${account}: ${String(error)}`);
                throw error;
            }
        }
    }

    /**
     * Extract sender addresses from forge options string
     */
    static extractSenderFromForgeOptions(forgeOptions?: string): string[] {
        if (!forgeOptions) {
            return [];
        }

        const senders: string[] = [];
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
    static shouldStartFork(rpcUrl: string, skipAnvilFork: boolean = false): boolean {
        if (skipAnvilFork) {
            return false;
        }

        // Don't start fork if already using localhost
        return !rpcUrl.includes('localhost') && !rpcUrl.includes('127.0.0.1');
    }

    /**
     * Get the appropriate RPC URL for forge script execution
     */
    static getForgeRpcUrl(
        rpcUrl: string,
        anvilRunning: boolean,
        anvilConfig?: AnvilConfig,
    ): string {
        if (anvilRunning && anvilConfig) {
            // Use the configured Anvil port if we started a fork
            const port = anvilConfig.port || 8545;
            const host =
                anvilConfig.host === '0.0.0.0' ? 'localhost' : anvilConfig.host || 'localhost';
            return `http://${host}:${port}`;
        } else if (rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')) {
            // Use the original RPC URL if it's already localhost
            return rpcUrl;
        }

        // Default to localhost:8545
        return 'http://localhost:8545';
    }
}
