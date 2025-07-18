import { ChildProcess, spawn } from 'child_process';

export interface AnvilConfig {
    port?: number;
    host?: string;
    forkUrl: string;
    timeout?: number;
}

export class AnvilManager {
    private anvilProcess: ChildProcess | null = null;
    private isStarted: boolean = false;

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

            console.log(`Starting Anvil fork from: ${config.forkUrl}`);

            const anvilArgs = [
                '--fork-url',
                config.forkUrl,
                '--host',
                host,
                '--port',
                port.toString(),
            ];

            console.log(`Anvil command: anvil ${anvilArgs.join(' ')}`);

            this.anvilProcess = spawn('anvil', anvilArgs, {
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
                    console.log(`Anvil fork started successfully on ${host}:${port}`);
                    resolve(this.anvilProcess!);
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
    stop(): void {
        if (this.anvilProcess && this.isStarted) {
            console.log('Stopping Anvil fork...');
            this.anvilProcess.kill('SIGTERM');
            this.cleanup();
        }
    }

    /**
     * Stop the Anvil process due to an error
     */
    stopOnError(): void {
        if (this.anvilProcess) {
            console.log('Stopping Anvil fork due to error...');
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
