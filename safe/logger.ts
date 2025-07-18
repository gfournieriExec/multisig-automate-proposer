import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    metadata?: Record<string, any>;
    error?: Record<string, any>;
}

export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    logDirectory?: string;
    maxFileSize?: number; // in MB
    maxFiles?: number;
    format?: 'json' | 'text';
}

export class Logger {
    private config: LoggerConfig;
    private logFilePath?: string;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = {
            level: this.getLogLevelFromEnv(),
            enableConsole: true,
            enableFile: process.env.NODE_ENV === 'production',
            logDirectory: './logs',
            maxFileSize: 10, // 10MB
            maxFiles: 5,
            format: 'json',
            ...config,
        };

        if (this.config.enableFile) {
            this.initializeFileLogging();
        }
    }

    private getLogLevelFromEnv(): LogLevel {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        switch (envLevel) {
            case 'ERROR':
                return LogLevel.ERROR;
            case 'WARN':
                return LogLevel.WARN;
            case 'INFO':
                return LogLevel.INFO;
            case 'DEBUG':
                return LogLevel.DEBUG;
            default:
                return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
        }
    }

    private initializeFileLogging(): void {
        if (!this.config.logDirectory) return;

        // Create log directory if it doesn't exist
        if (!fs.existsSync(this.config.logDirectory)) {
            fs.mkdirSync(this.config.logDirectory, { recursive: true });
        }

        // Set up log file path
        const timestamp = new Date().toISOString().split('T')[0];
        this.logFilePath = path.join(this.config.logDirectory, `app-${timestamp}.log`);

        // Rotate logs if needed
        this.rotateLogsIfNeeded();
    }

    private rotateLogsIfNeeded(): void {
        if (!this.logFilePath || !fs.existsSync(this.logFilePath)) return;

        const stats = fs.statSync(this.logFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > (this.config.maxFileSize || 10)) {
            this.rotateLogs();
        }
    }

    private rotateLogs(): void {
        if (!this.config.logDirectory) return;

        const logFiles = fs
            .readdirSync(this.config.logDirectory)
            .filter((file) => file.startsWith('app-') && file.endsWith('.log'))
            .sort()
            .reverse();

        // Remove old log files if we exceed maxFiles
        const maxFiles = this.config.maxFiles || 5;
        if (logFiles.length >= maxFiles) {
            const filesToRemove = logFiles.slice(maxFiles - 1);
            filesToRemove.forEach((file) => {
                fs.unlinkSync(path.join(this.config.logDirectory!, file));
            });
        }

        // Create new log file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFilePath = path.join(this.config.logDirectory, `app-${timestamp}.log`);
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this.config.level;
    }

    private formatMessage(
        level: LogLevel,
        message: string,
        metadata?: Record<string, any>,
    ): string {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];

        if (this.config.format === 'json') {
            const logEntry: LogEntry = {
                timestamp,
                level: levelName,
                message,
                ...(metadata && { metadata: this.sanitizeMetadata(metadata) }),
            };
            return JSON.stringify(logEntry);
        } else {
            const metadataStr = metadata ? ` ${JSON.stringify(this.sanitizeMetadata(metadata))}` : '';
            return `[${timestamp}] ${levelName}: ${message}${metadataStr}`;
        }
    }

    /**
     * Sanitize metadata to handle non-serializable values like BigInt
     */
    private sanitizeMetadata(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }
        
        if (typeof obj === 'bigint') {
            return obj.toString();
        }
        
        if (typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeMetadata(item));
        }
        
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = this.sanitizeMetadata(value);
        }
        
        return sanitized;
    }

    private writeToFile(formattedMessage: string): void {
        if (!this.config.enableFile || !this.logFilePath) return;

        try {
            fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
            this.rotateLogsIfNeeded();
        } catch (error) {
            // Fallback to console if file writing fails
            console.error('Failed to write to log file:', error);
        }
    }

    private writeToConsole(level: LogLevel, formattedMessage: string): void {
        if (!this.config.enableConsole) return;

        const colors = {
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.INFO]: '\x1b[36m', // Cyan
            [LogLevel.DEBUG]: '\x1b[37m', // White
        };

        const reset = '\x1b[0m';
        const colorCode = colors[level] || '';

        if (this.config.format === 'json') {
            console.log(formattedMessage);
        } else {
            console.log(`${colorCode}${formattedMessage}${reset}`);
        }
    }

    private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message, metadata);

        this.writeToConsole(level, formattedMessage);
        this.writeToFile(formattedMessage);
    }

    error(message: string, error?: Error | Record<string, any>): void {
        const metadata: Record<string, any> = {};

        if (error) {
            if (error instanceof Error) {
                metadata.error = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                };
            } else {
                metadata.error = error;
            }
        }

        this.log(LogLevel.ERROR, message, metadata);
    }

    warn(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, metadata);
    }

    info(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, metadata);
    }

    debug(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    // Convenience methods for specific use cases
    transaction(hash: string, action: string, metadata?: Record<string, any>): void {
        this.info(`Transaction ${action}: ${hash}`, metadata);
    }

    network(action: string, metadata?: Record<string, any>): void {
        this.info(`Network ${action}`, metadata);
    }

    safe(action: string, metadata?: Record<string, any>): void {
        this.info(`Safe ${action}`, metadata);
    }

    foundry(action: string, metadata?: Record<string, any>): void {
        this.info(`Foundry ${action}`, metadata);
    }

    // Performance logging
    performance(operation: string, duration: number, metadata?: Record<string, any>): void {
        this.info(`Performance: ${operation} completed in ${duration}ms`, metadata);
    }

    // Audit logging for sensitive operations
    audit(action: string, user: string, metadata?: Record<string, any>): void {
        this.info(`Audit: ${user} performed ${action}`, {
            audit: true,
            user,
            action,
            ...metadata,
        });
    }
}

// Singleton logger instance
export const logger = new Logger();

// Helper function to create child loggers with context
export function createLogger(context: Record<string, any>): Logger {
    return new Logger({
        ...context,
    });
}

// Performance measurement utility
export function measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    loggerInstance: Logger = logger,
): Promise<T> {
    return new Promise(async (resolve, reject) => {
        const start = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - start;
            loggerInstance.performance(operation, duration);
            resolve(result);
        } catch (error) {
            const duration = Date.now() - start;
            loggerInstance.error(
                `Performance: ${operation} failed after ${duration}ms`,
                error as Error,
            );
            reject(error);
        }
    });
}
