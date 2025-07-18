/**
 * Custom Error Classes for Production-Ready Error Handling
 */
export declare enum ErrorCode {
    MISSING_ENVIRONMENT_VARIABLE = "MISSING_ENVIRONMENT_VARIABLE",
    INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
    INVALID_RPC_URL = "INVALID_RPC_URL",
    INVALID_SAFE_ADDRESS = "INVALID_SAFE_ADDRESS",
    INVALID_PRIVATE_KEY = "INVALID_PRIVATE_KEY",
    RPC_CONNECTION_FAILED = "RPC_CONNECTION_FAILED",
    CHAIN_ID_MISMATCH = "CHAIN_ID_MISMATCH",
    NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
    SAFE_TRANSACTION_FAILED = "SAFE_TRANSACTION_FAILED",
    NONCE_CONFLICT = "NONCE_CONFLICT",
    INSUFFICIENT_CONFIRMATIONS = "INSUFFICIENT_CONFIRMATIONS",
    TRANSACTION_PROPOSAL_FAILED = "TRANSACTION_PROPOSAL_FAILED",
    BROADCAST_FILE_NOT_FOUND = "BROADCAST_FILE_NOT_FOUND",
    INVALID_BROADCAST_FILE = "INVALID_BROADCAST_FILE",
    FILE_PERMISSION_ERROR = "FILE_PERMISSION_ERROR",
    FOUNDRY_NOT_FOUND = "FOUNDRY_NOT_FOUND",
    ANVIL_START_FAILED = "ANVIL_START_FAILED",
    FORGE_SCRIPT_FAILED = "FORGE_SCRIPT_FAILED",
    INVALID_TRANSACTION_DATA = "INVALID_TRANSACTION_DATA",
    INVALID_HEX_VALUE = "INVALID_HEX_VALUE",
    INVALID_ADDRESS = "INVALID_ADDRESS",
    OPERATION_TIMEOUT = "OPERATION_TIMEOUT",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly timestamp: Date;
    readonly context?: Record<string, any>;
    constructor(message: string, code?: ErrorCode, statusCode?: number, isOperational?: boolean, context?: Record<string, any>);
}
export declare class ConfigurationError extends AppError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class NetworkError extends AppError {
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
}
export declare class SafeTransactionError extends AppError {
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
}
export declare class FileSystemError extends AppError {
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
}
export declare class ValidationError extends AppError {
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
}
export declare class FoundryError extends AppError {
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
}
/**
 * Error Handler Utility Functions
 */
export declare class ErrorHandler {
    /**
     * Format error for logging
     */
    static formatError(error: Error): Record<string, any>;
    /**
     * Determine if error is operational (expected) or programming error
     */
    static isOperationalError(error: Error): boolean;
    /**
     * Extract meaningful error message for user display
     */
    static getUserMessage(error: Error): string;
    /**
     * Wrap unknown errors in AppError
     */
    static wrapError(error: unknown, defaultMessage?: string): AppError;
}
/**
 * Error Code to Human-Readable Message Mapping
 */
export declare const ERROR_MESSAGES: Record<ErrorCode, string>;
//# sourceMappingURL=errors.d.ts.map