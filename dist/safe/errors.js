"use strict";
/**
 * Custom Error Classes for Production-Ready Error Handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.ErrorHandler = exports.FoundryError = exports.ValidationError = exports.FileSystemError = exports.SafeTransactionError = exports.NetworkError = exports.ConfigurationError = exports.AppError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    // Configuration Errors
    ErrorCode["MISSING_ENVIRONMENT_VARIABLE"] = "MISSING_ENVIRONMENT_VARIABLE";
    ErrorCode["INVALID_CONFIGURATION"] = "INVALID_CONFIGURATION";
    ErrorCode["INVALID_RPC_URL"] = "INVALID_RPC_URL";
    ErrorCode["INVALID_SAFE_ADDRESS"] = "INVALID_SAFE_ADDRESS";
    ErrorCode["INVALID_PRIVATE_KEY"] = "INVALID_PRIVATE_KEY";
    // Network Errors
    ErrorCode["RPC_CONNECTION_FAILED"] = "RPC_CONNECTION_FAILED";
    ErrorCode["CHAIN_ID_MISMATCH"] = "CHAIN_ID_MISMATCH";
    ErrorCode["NETWORK_TIMEOUT"] = "NETWORK_TIMEOUT";
    // Safe Transaction Errors
    ErrorCode["SAFE_TRANSACTION_FAILED"] = "SAFE_TRANSACTION_FAILED";
    ErrorCode["NONCE_CONFLICT"] = "NONCE_CONFLICT";
    ErrorCode["INSUFFICIENT_CONFIRMATIONS"] = "INSUFFICIENT_CONFIRMATIONS";
    ErrorCode["TRANSACTION_PROPOSAL_FAILED"] = "TRANSACTION_PROPOSAL_FAILED";
    // File System Errors
    ErrorCode["BROADCAST_FILE_NOT_FOUND"] = "BROADCAST_FILE_NOT_FOUND";
    ErrorCode["INVALID_BROADCAST_FILE"] = "INVALID_BROADCAST_FILE";
    ErrorCode["FILE_PERMISSION_ERROR"] = "FILE_PERMISSION_ERROR";
    // Foundry/Anvil Errors
    ErrorCode["FOUNDRY_NOT_FOUND"] = "FOUNDRY_NOT_FOUND";
    ErrorCode["ANVIL_START_FAILED"] = "ANVIL_START_FAILED";
    ErrorCode["FORGE_SCRIPT_FAILED"] = "FORGE_SCRIPT_FAILED";
    // Validation Errors
    ErrorCode["INVALID_TRANSACTION_DATA"] = "INVALID_TRANSACTION_DATA";
    ErrorCode["INVALID_HEX_VALUE"] = "INVALID_HEX_VALUE";
    ErrorCode["INVALID_ADDRESS"] = "INVALID_ADDRESS";
    // General Errors
    ErrorCode["OPERATION_TIMEOUT"] = "OPERATION_TIMEOUT";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AppError extends Error {
    constructor(message, code = ErrorCode.UNKNOWN_ERROR, statusCode = 500, isOperational = true, context) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date();
        this.context = context || {};
        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ConfigurationError extends AppError {
    constructor(message, context) {
        super(message, ErrorCode.INVALID_CONFIGURATION, 400, true, context);
    }
}
exports.ConfigurationError = ConfigurationError;
class NetworkError extends AppError {
    constructor(message, code, context) {
        super(message, code, 503, true, context);
    }
}
exports.NetworkError = NetworkError;
class SafeTransactionError extends AppError {
    constructor(message, code, context) {
        super(message, code, 422, true, context);
    }
}
exports.SafeTransactionError = SafeTransactionError;
class FileSystemError extends AppError {
    constructor(message, code, context) {
        super(message, code, 404, true, context);
    }
}
exports.FileSystemError = FileSystemError;
class ValidationError extends AppError {
    constructor(message, code, context) {
        super(message, code, 400, true, context);
    }
}
exports.ValidationError = ValidationError;
class FoundryError extends AppError {
    constructor(message, code, context) {
        super(message, code, 500, true, context);
    }
}
exports.FoundryError = FoundryError;
/**
 * Error Handler Utility Functions
 */
class ErrorHandler {
    /**
     * Format error for logging
     */
    static formatError(error) {
        const formatted = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
        };
        if (error instanceof AppError) {
            formatted.code = error.code;
            formatted.statusCode = error.statusCode;
            formatted.isOperational = error.isOperational;
            formatted.context = error.context;
        }
        return formatted;
    }
    /**
     * Determine if error is operational (expected) or programming error
     */
    static isOperationalError(error) {
        if (error instanceof AppError) {
            return error.isOperational;
        }
        return false;
    }
    /**
     * Extract meaningful error message for user display
     */
    static getUserMessage(error) {
        if (error instanceof AppError) {
            return error.message;
        }
        // Generic message for unexpected errors
        return 'An unexpected error occurred. Please check the logs for more details.';
    }
    /**
     * Wrap unknown errors in AppError
     */
    static wrapError(error, defaultMessage = 'Unknown error occurred') {
        if (error instanceof AppError) {
            return error;
        }
        if (error instanceof Error) {
            return new AppError(error.message, ErrorCode.UNKNOWN_ERROR, 500, false, {
                originalError: error.name,
                originalStack: error.stack,
            });
        }
        return new AppError(defaultMessage, ErrorCode.UNKNOWN_ERROR, 500, false, {
            originalError: String(error),
        });
    }
}
exports.ErrorHandler = ErrorHandler;
/**
 * Error Code to Human-Readable Message Mapping
 */
exports.ERROR_MESSAGES = {
    [ErrorCode.MISSING_ENVIRONMENT_VARIABLE]: 'Required environment variable is missing',
    [ErrorCode.INVALID_CONFIGURATION]: 'Invalid configuration provided',
    [ErrorCode.INVALID_RPC_URL]: 'Invalid or unreachable RPC URL',
    [ErrorCode.INVALID_SAFE_ADDRESS]: 'Invalid Safe multisig address',
    [ErrorCode.INVALID_PRIVATE_KEY]: 'Invalid private key format',
    [ErrorCode.RPC_CONNECTION_FAILED]: 'Failed to connect to RPC endpoint',
    [ErrorCode.CHAIN_ID_MISMATCH]: 'Chain ID mismatch between configuration and network',
    [ErrorCode.NETWORK_TIMEOUT]: 'Network operation timed out',
    [ErrorCode.SAFE_TRANSACTION_FAILED]: 'Safe transaction execution failed',
    [ErrorCode.NONCE_CONFLICT]: 'Transaction nonce conflict detected',
    [ErrorCode.INSUFFICIENT_CONFIRMATIONS]: 'Insufficient confirmations for transaction execution',
    [ErrorCode.TRANSACTION_PROPOSAL_FAILED]: 'Failed to propose transaction to Safe',
    [ErrorCode.BROADCAST_FILE_NOT_FOUND]: 'Foundry broadcast file not found',
    [ErrorCode.INVALID_BROADCAST_FILE]: 'Invalid or corrupted broadcast file',
    [ErrorCode.FILE_PERMISSION_ERROR]: 'File permission denied',
    [ErrorCode.FOUNDRY_NOT_FOUND]: 'Foundry toolkit not found or not installed',
    [ErrorCode.ANVIL_START_FAILED]: 'Failed to start Anvil fork',
    [ErrorCode.FORGE_SCRIPT_FAILED]: 'Forge script execution failed',
    [ErrorCode.INVALID_TRANSACTION_DATA]: 'Invalid transaction data format',
    [ErrorCode.INVALID_HEX_VALUE]: 'Invalid hexadecimal value',
    [ErrorCode.INVALID_ADDRESS]: 'Invalid Ethereum address',
    [ErrorCode.OPERATION_TIMEOUT]: 'Operation timed out',
    [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred',
};
//# sourceMappingURL=errors.js.map