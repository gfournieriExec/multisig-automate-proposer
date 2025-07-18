export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
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
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'text';
}
export declare class Logger {
    private config;
    private logFilePath?;
    constructor(config?: Partial<LoggerConfig>);
    private getLogLevelFromEnv;
    private initializeFileLogging;
    private rotateLogsIfNeeded;
    private rotateLogs;
    private shouldLog;
    private formatMessage;
    /**
     * Sanitize metadata to handle non-serializable values like BigInt
     */
    private sanitizeMetadata;
    private writeToFile;
    private writeToConsole;
    private log;
    error(message: string, error?: Error | Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    debug(message: string, metadata?: Record<string, any>): void;
    transaction(hash: string, action: string, metadata?: Record<string, any>): void;
    network(action: string, metadata?: Record<string, any>): void;
    safe(action: string, metadata?: Record<string, any>): void;
    foundry(action: string, metadata?: Record<string, any>): void;
    performance(operation: string, duration: number, metadata?: Record<string, any>): void;
    audit(action: string, user: string, metadata?: Record<string, any>): void;
}
export declare const logger: Logger;
export declare function createLogger(context: Record<string, any>): Logger;
export declare function measurePerformance<T>(operation: string, fn: () => Promise<T>, loggerInstance?: Logger): Promise<T>;
//# sourceMappingURL=logger.d.ts.map