"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
exports.validateSchema = validateSchema;
const ethers_1 = require("ethers");
const errors_1 = require("./errors");
class Validator {
    /**
     * Validate Ethereum address
     */
    static validateAddress(address, fieldName = 'address') {
        if (!address) {
            throw new errors_1.ValidationError(`${fieldName} is required`, errors_1.ErrorCode.INVALID_ADDRESS, {
                field: fieldName,
                value: address,
            });
        }
        if (!ethers_1.ethers.isAddress(address)) {
            throw new errors_1.ValidationError(`Invalid ${fieldName}: ${address}`, errors_1.ErrorCode.INVALID_ADDRESS, { field: fieldName, value: address });
        }
    }
    /**
     * Validate private key format
     */
    static validatePrivateKey(privateKey, fieldName = 'private key') {
        if (!privateKey) {
            throw new errors_1.ValidationError(`${fieldName} is required`, errors_1.ErrorCode.INVALID_PRIVATE_KEY, {
                field: fieldName,
            });
        }
        // Remove 0x prefix if present
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        // Check length (64 characters for 32 bytes)
        if (cleanKey.length !== 64) {
            throw new errors_1.ValidationError(`Invalid ${fieldName} length. Expected 64 characters (32 bytes)`, errors_1.ErrorCode.INVALID_PRIVATE_KEY, { field: fieldName, length: cleanKey.length });
        }
        // Check if it's valid hex
        if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            throw new errors_1.ValidationError(`Invalid ${fieldName} format. Must be a valid hexadecimal string`, errors_1.ErrorCode.INVALID_PRIVATE_KEY, { field: fieldName });
        }
    }
    /**
     * Validate RPC URL
     */
    static validateRpcUrl(rpcUrl, fieldName = 'RPC URL') {
        if (!rpcUrl) {
            throw new errors_1.ValidationError(`${fieldName} is required`, errors_1.ErrorCode.INVALID_RPC_URL, {
                field: fieldName,
            });
        }
        try {
            const url = new URL(rpcUrl);
            if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
                throw new errors_1.ValidationError(`Invalid ${fieldName} protocol. Must be http, https, ws, or wss`, errors_1.ErrorCode.INVALID_RPC_URL, { field: fieldName, value: rpcUrl, protocol: url.protocol });
            }
        }
        catch (error) {
            throw new errors_1.ValidationError(`Invalid ${fieldName} format: ${rpcUrl}`, errors_1.ErrorCode.INVALID_RPC_URL, { field: fieldName, value: rpcUrl, originalError: error });
        }
    }
    /**
     * Validate chain ID
     */
    static validateChainId(chainId, fieldName = 'chain ID') {
        if (!chainId && chainId !== 0) {
            throw new errors_1.ValidationError(`${fieldName} is required`, errors_1.ErrorCode.INVALID_CONFIGURATION, {
                field: fieldName,
            });
        }
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
        if (isNaN(numericChainId) || numericChainId < 0) {
            throw new errors_1.ValidationError(`Invalid ${fieldName}: must be a non-negative number`, errors_1.ErrorCode.INVALID_CONFIGURATION, { field: fieldName, value: chainId });
        }
        // Validate against known chain IDs
        const knownChainIds = [1, 11155111, 42161, 421614, 31337, 1337];
        if (!knownChainIds.includes(numericChainId)) {
            // This is a warning, not an error
            console.warn(`Warning: Chain ID ${numericChainId} is not in the list of known networks. ` +
                `Known chains: ${knownChainIds.join(', ')}`);
        }
    }
    /**
     * Validate hex string
     */
    static validateHexString(hex, fieldName = 'hex value', expectedLength) {
        if (!hex) {
            throw new errors_1.ValidationError(`${fieldName} is required`, errors_1.ErrorCode.INVALID_HEX_VALUE, {
                field: fieldName,
            });
        }
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
            throw new errors_1.ValidationError(`Invalid ${fieldName}: must be a valid hexadecimal string`, errors_1.ErrorCode.INVALID_HEX_VALUE, { field: fieldName, value: hex });
        }
        if (expectedLength && cleanHex.length !== expectedLength) {
            throw new errors_1.ValidationError(`Invalid ${fieldName} length: expected ${expectedLength} characters, got ${cleanHex.length}`, errors_1.ErrorCode.INVALID_HEX_VALUE, { field: fieldName, value: hex, expectedLength, actualLength: cleanHex.length });
        }
    }
    /**
     * Validate transaction data
     */
    static validateTransactionData(txData) {
        this.validateAddress(txData.to, 'transaction recipient');
        // Validate value (should be numeric string or hex)
        if (txData.value && txData.value !== '0') {
            if (!/^\d+$/.test(txData.value) && !txData.value.startsWith('0x')) {
                throw new errors_1.ValidationError('Invalid transaction value format', errors_1.ErrorCode.INVALID_TRANSACTION_DATA, { field: 'value', value: txData.value });
            }
        }
        // Validate data (should be valid hex)
        if (txData.data && txData.data !== '0x') {
            this.validateHexString(txData.data, 'transaction data');
        }
        // Validate operation type
        if (txData.operation && !['call', 'delegatecall'].includes(txData.operation)) {
            throw new errors_1.ValidationError('Invalid operation type: must be "call" or "delegatecall"', errors_1.ErrorCode.INVALID_TRANSACTION_DATA, { field: 'operation', value: txData.operation });
        }
    }
    /**
     * Validate environment variables
     */
    static validateEnvironmentVariables(envVars) {
        const errors = [];
        const warnings = [];
        // Required variables
        const required = [
            'RPC_URL',
            'SAFE_ADDRESS',
            'SAFE_API_KEY',
            'PROPOSER_1_ADDRESS',
            'PROPOSER_1_PRIVATE_KEY',
        ];
        for (const envVar of required) {
            if (!envVars[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
        // Validate specific formats
        if (envVars.RPC_URL) {
            try {
                this.validateRpcUrl(envVars.RPC_URL);
            }
            catch (error) {
                errors.push(`Invalid RPC_URL: ${error.message}`);
            }
        }
        if (envVars.SAFE_ADDRESS) {
            try {
                this.validateAddress(envVars.SAFE_ADDRESS, 'SAFE_ADDRESS');
            }
            catch (error) {
                errors.push(`Invalid SAFE_ADDRESS: ${error.message}`);
            }
        }
        if (envVars.PROPOSER_1_ADDRESS) {
            try {
                this.validateAddress(envVars.PROPOSER_1_ADDRESS, 'PROPOSER_1_ADDRESS');
            }
            catch (error) {
                errors.push(`Invalid PROPOSER_1_ADDRESS: ${error.message}`);
            }
        }
        if (envVars.PROPOSER_1_PRIVATE_KEY) {
            try {
                this.validatePrivateKey(envVars.PROPOSER_1_PRIVATE_KEY, 'PROPOSER_1_PRIVATE_KEY');
            }
            catch (error) {
                errors.push(`Invalid PROPOSER_1_PRIVATE_KEY: ${error.message}`);
            }
        }
        if (envVars.CHAIN_ID) {
            try {
                this.validateChainId(envVars.CHAIN_ID);
            }
            catch (error) {
                errors.push(`Invalid CHAIN_ID: ${error.message}`);
            }
        }
        // Check for sensitive data in logs
        if (process.env.NODE_ENV === 'production') {
            if (envVars.PROPOSER_1_PRIVATE_KEY && envVars.PROPOSER_1_PRIVATE_KEY.length > 10) {
                warnings.push('Private key detected in environment - ensure logs are secure');
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Validate file path and permissions
     */
    static validateFilePath(filePath, requiredPermissions = 'read') {
        if (!filePath) {
            throw new errors_1.ValidationError('File path is required', errors_1.ErrorCode.FILE_PERMISSION_ERROR, {
                field: 'filePath',
            });
        }
        const fs = require('fs');
        const path = require('path');
        // Check if file exists for read operations
        if (requiredPermissions.includes('read') && !fs.existsSync(filePath)) {
            throw new errors_1.ValidationError(`File does not exist: ${filePath}`, errors_1.ErrorCode.BROADCAST_FILE_NOT_FOUND, { filePath });
        }
        // Check directory exists for write operations
        if (requiredPermissions.includes('write')) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                throw new errors_1.ValidationError(`Directory does not exist: ${dir}`, errors_1.ErrorCode.FILE_PERMISSION_ERROR, { directory: dir, filePath });
            }
        }
        // Check permissions
        try {
            if (requiredPermissions.includes('read') && fs.existsSync(filePath)) {
                fs.accessSync(filePath, fs.constants.R_OK);
            }
            if (requiredPermissions.includes('write')) {
                const dir = path.dirname(filePath);
                fs.accessSync(dir, fs.constants.W_OK);
            }
        }
        catch (error) {
            throw new errors_1.ValidationError(`Insufficient file permissions for ${filePath}`, errors_1.ErrorCode.FILE_PERMISSION_ERROR, { filePath, requiredPermissions, originalError: error });
        }
    }
    /**
     * Sanitize input to prevent injection attacks
     */
    static sanitizeInput(input, fieldName = 'input') {
        if (!input)
            return '';
        // Remove potentially dangerous characters
        const sanitized = input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/[;&|`$]/g, '') // Remove shell injection characters
            .trim();
        if (sanitized !== input) {
            console.warn(`Input sanitized for ${fieldName}: removed potentially dangerous characters`);
        }
        return sanitized;
    }
    /**
     * Validate numeric range
     */
    static validateNumericRange(value, min, max, fieldName = 'value') {
        if (value < min || value > max) {
            throw new errors_1.ValidationError(`${fieldName} must be between ${min} and ${max}, got ${value}`, errors_1.ErrorCode.INVALID_CONFIGURATION, { field: fieldName, value, min, max });
        }
    }
}
exports.Validator = Validator;
function validateSchema(data, schema) {
    const errors = [];
    const warnings = [];
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        // Check required fields
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
        }
        // Skip validation for optional empty fields
        if (!rules.required && (value === undefined || value === null || value === '')) {
            continue;
        }
        // Type validation
        try {
            switch (rules.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`${field} must be a string`);
                    }
                    break;
                case 'number':
                    if (typeof value !== 'number' && isNaN(Number(value))) {
                        errors.push(`${field} must be a number`);
                    }
                    break;
                case 'boolean':
                    if (typeof value !== 'boolean') {
                        errors.push(`${field} must be a boolean`);
                    }
                    break;
                case 'address':
                    Validator.validateAddress(value, field);
                    break;
                case 'hex':
                    Validator.validateHexString(value, field);
                    break;
                case 'url':
                    Validator.validateRpcUrl(value, field);
                    break;
            }
            // Length validation
            if (typeof value === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters long`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
                }
            }
            // Pattern validation
            if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
                errors.push(`${field} does not match required pattern`);
            }
            // Custom validation
            if (rules.custom) {
                rules.custom(value);
            }
        }
        catch (error) {
            errors.push(`${field}: ${error.message}`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
//# sourceMappingURL=validation.js.map