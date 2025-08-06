import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { ErrorCode, ValidationError } from './errors';

/**
 * Comprehensive validation utilities for production use
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class Validator {
    /**
     * Validate Ethereum address
     */
    static validateAddress(address: string, fieldName = 'address'): void {
        if (!address) {
            throw new ValidationError(`${fieldName} is required`, ErrorCode.INVALID_ADDRESS, {
                field: fieldName,
                value: address,
            });
        }

        if (!ethers.isAddress(address)) {
            throw new ValidationError(
                `Invalid ${fieldName}: ${String(address)}`,
                ErrorCode.INVALID_ADDRESS,
                { field: fieldName, value: address },
            );
        }
    }

    /**
     * Validate private key format
     */
    static validatePrivateKey(privateKey: string, fieldName: string = 'private key'): void {
        if (!privateKey) {
            throw new ValidationError(`${fieldName} is required`, ErrorCode.INVALID_PRIVATE_KEY, {
                field: fieldName,
            });
        }

        // Remove 0x prefix if present
        const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

        // Check length (64 characters for 32 bytes)
        if (cleanKey.length !== 64) {
            throw new ValidationError(
                `Invalid ${fieldName} length. Expected 64 characters (32 bytes)`,
                ErrorCode.INVALID_PRIVATE_KEY,
                { field: fieldName, length: cleanKey.length },
            );
        }

        // Check if it's valid hex
        if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
            throw new ValidationError(
                `Invalid ${fieldName} format. Must be a valid hexadecimal string`,
                ErrorCode.INVALID_PRIVATE_KEY,
                { field: fieldName },
            );
        }
    }

    /**
     * Validate RPC URL
     */
    static validateRpcUrl(rpcUrl: string, fieldName: string = 'RPC URL'): void {
        if (!rpcUrl) {
            throw new ValidationError(`${fieldName} is required`, ErrorCode.INVALID_RPC_URL, {
                field: fieldName,
            });
        }

        try {
            const url = new URL(rpcUrl);
            if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
                throw new ValidationError(
                    `Invalid ${fieldName} protocol. Must be http, https, ws, or wss`,
                    ErrorCode.INVALID_RPC_URL,
                    { field: fieldName, value: rpcUrl, protocol: url.protocol },
                );
            }
        } catch (error) {
            throw new ValidationError(
                `Invalid ${fieldName} format: ${rpcUrl}`,
                ErrorCode.INVALID_RPC_URL,
                { field: fieldName, value: rpcUrl, originalError: error },
            );
        }
    }

    /**
     * Validate chain ID
     */
    static validateChainId(chainId: string | number, fieldName: string = 'chain ID'): void {
        if (!chainId && chainId !== 0) {
            throw new ValidationError(`${fieldName} is required`, ErrorCode.INVALID_CONFIGURATION, {
                field: fieldName,
            });
        }

        const numericChainId = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;

        if (isNaN(numericChainId) || numericChainId < 0) {
            throw new ValidationError(
                `Invalid ${fieldName}: must be a non-negative number`,
                ErrorCode.INVALID_CONFIGURATION,
                { field: fieldName, value: chainId },
            );
        }

        // Validate against known chain IDs
        const knownChainIds = [1, 11155111, 42161, 421614, 31337, 1337];
        if (!knownChainIds.includes(numericChainId)) {
            // This is a warning, not an error
            process.stderr.write(
                `Warning: Chain ID ${numericChainId} is not in the list of known networks. ` +
                    `Known chains: ${knownChainIds.join(', ')}\n`,
            );
        }
    }

    /**
     * Validate hex string
     */
    static validateHexString(
        hex: string,
        fieldName: string = 'hex value',
        expectedLength?: number,
    ): void {
        if (!hex) {
            throw new ValidationError(`${fieldName} is required`, ErrorCode.INVALID_HEX_VALUE, {
                field: fieldName,
            });
        }

        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

        if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
            throw new ValidationError(
                `Invalid ${fieldName}: must be a valid hexadecimal string`,
                ErrorCode.INVALID_HEX_VALUE,
                { field: fieldName, value: hex },
            );
        }

        if (expectedLength && cleanHex.length !== expectedLength) {
            throw new ValidationError(
                `Invalid ${fieldName} length: expected ${expectedLength} characters, got ${cleanHex.length}`,
                ErrorCode.INVALID_HEX_VALUE,
                { field: fieldName, value: hex, expectedLength, actualLength: cleanHex.length },
            );
        }
    }

    /**
     * Validate transaction data
     */
    static validateTransactionData(txData: {
        to: string;
        value: string;
        data: string;
        operation?: string | number;
    }): void {
        this.validateAddress(txData.to, 'transaction recipient');
        this.validateTransactionValue(txData.value);
        this.validateTransactionData_Data(txData.data);
        this.validateTransactionOperation(txData.operation);
    }

    /**
     * Validate transaction value
     */
    private static validateTransactionValue(value: string): void {
        if (value && value !== '0') {
            if (!/^\d+$/.test(value) && !value.startsWith('0x')) {
                throw new ValidationError(
                    'Invalid transaction value format',
                    ErrorCode.INVALID_TRANSACTION_DATA,
                    { field: 'value', value },
                );
            }
        }
    }

    /**
     * Validate transaction data field
     */
    private static validateTransactionData_Data(data: string): void {
        if (data && data !== '0x') {
            this.validateHexString(data, 'transaction data');
        }
    }

    /**
     * Validate transaction operation
     */
    private static validateTransactionOperation(operation?: string | number): void {
        if (operation === undefined) {
            return;
        }

        if (typeof operation === 'string') {
            this.validateStringOperation(operation);
        } else if (typeof operation === 'number') {
            this.validateNumericOperation(operation);
        } else {
            throw new ValidationError(
                'Invalid operation type: must be string or number',
                ErrorCode.INVALID_TRANSACTION_DATA,
                { field: 'operation', value: operation, type: typeof operation },
            );
        }
    }

    /**
     * Validate string operation type
     */
    private static validateStringOperation(operation: string): void {
        if (!['call', 'delegatecall'].includes(operation)) {
            throw new ValidationError(
                'Invalid operation type: must be "call" or "delegatecall"',
                ErrorCode.INVALID_TRANSACTION_DATA,
                { field: 'operation', value: operation },
            );
        }
    }

    /**
     * Validate numeric operation type
     */
    private static validateNumericOperation(operation: number): void {
        if (![0, 1].includes(operation)) {
            throw new ValidationError(
                'Invalid operation type: must be 0 (Call) or 1 (DelegateCall)',
                ErrorCode.INVALID_TRANSACTION_DATA,
                { field: 'operation', value: operation },
            );
        }
    }

    /**
     * Validate environment variables
     */
    static validateEnvironmentVariables(envVars: Record<string, unknown>): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        this.validateRequiredEnvVars(envVars, errors);
        this.validateEnvVarFormats(envVars, errors);
        this.checkProductionSecurity(envVars, warnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate required environment variables
     */
    private static validateRequiredEnvVars(
        envVars: Record<string, unknown>,
        errors: string[],
    ): void {
        const required = [
            'RPC_URL',
            'SAFE_ADDRESS',
            'SAFE_API_KEY',
            'PROPOSER_PRIVATE_KEY',
        ];

        for (const envVar of required) {
            if (!envVars[envVar]) {
                errors.push(`Missing required environment variable: ${envVar}`);
            }
        }
    }

    /**
     * Validate environment variable formats
     */
    private static validateEnvVarFormats(envVars: Record<string, unknown>, errors: string[]): void {
        this.validateEnvVarFormat(
            envVars,
            'RPC_URL',
            (value) => this.validateRpcUrl(value as string),
            errors,
        );

        this.validateEnvVarFormat(
            envVars,
            'SAFE_ADDRESS',
            (value) => this.validateAddress(value as string, 'SAFE_ADDRESS'),
            errors,
        );

        this.validateEnvVarFormat(
            envVars,
            'PROPOSER_PRIVATE_KEY',
            (value) => this.validatePrivateKey(value as string, 'PROPOSER_PRIVATE_KEY'),
            errors,
        );

        this.validateEnvVarFormat(
            envVars,
            'CHAIN_ID',
            (value) => this.validateChainId(value as string | number),
            errors,
        );
    }

    /**
     * Validate a specific environment variable format
     */
    private static validateEnvVarFormat(
        envVars: Record<string, unknown>,
        varName: string,
        validator: (value: unknown) => void,
        errors: string[],
    ): void {
        if (envVars[varName]) {
            try {
                validator(envVars[varName]);
            } catch (error) {
                errors.push(`Invalid ${varName}: ${(error as Error).message}`);
            }
        }
    }

    /**
     * Check for production security issues
     */
    private static checkProductionSecurity(
        envVars: Record<string, unknown>,
        warnings: string[],
    ): void {
        if (process.env.NODE_ENV === 'production') {
            if (
                envVars.PROPOSER_PRIVATE_KEY &&
                (envVars.PROPOSER_PRIVATE_KEY as string).length > 10
            ) {
                warnings.push('Private key detected in environment - ensure logs are secure');
            }
        }
    }

    /**
     * Validate file path and permissions
     */
    static validateFilePath(
        filePath: string,
        requiredPermissions: 'read' | 'write' | 'readwrite' = 'read',
    ): void {
        if (!filePath) {
            throw new ValidationError('File path is required', ErrorCode.FILE_PERMISSION_ERROR, {
                field: 'filePath',
            });
        }

        // Check if file exists for read operations
        if (requiredPermissions.includes('read') && !fs.existsSync(filePath)) {
            throw new ValidationError(
                `File does not exist: ${filePath}`,
                ErrorCode.BROADCAST_FILE_NOT_FOUND,
                { filePath },
            );
        }

        // Check directory exists for write operations
        if (requiredPermissions.includes('write')) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                throw new ValidationError(
                    `Directory does not exist: ${dir}`,
                    ErrorCode.FILE_PERMISSION_ERROR,
                    { directory: dir, filePath },
                );
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
        } catch (error) {
            throw new ValidationError(
                `Insufficient file permissions for ${filePath}`,
                ErrorCode.FILE_PERMISSION_ERROR,
                { filePath, requiredPermissions, originalError: error },
            );
        }
    }

    /**
     * Sanitize input to prevent injection attacks
     */
    static sanitizeInput(input: string, fieldName: string = 'input'): string {
        if (!input) {
            return '';
        }

        // Remove potentially dangerous characters
        const sanitized = input
            .replace(/[<>]/g, '') // Remove HTML tags
            .replace(/[;&|`$]/g, '') // Remove shell injection characters
            .trim();

        if (sanitized !== input) {
            process.stderr.write(
                `Input sanitized for ${fieldName}: removed potentially dangerous characters\n`,
            );
        }

        return sanitized;
    }

    /**
     * Validate numeric range
     */
    static validateNumericRange(
        value: number,
        min: number,
        max: number,
        fieldName: string = 'value',
    ): void {
        if (value < min || value > max) {
            throw new ValidationError(
                `${fieldName} must be between ${min} and ${max}, got ${value}`,
                ErrorCode.INVALID_CONFIGURATION,
                { field: fieldName, value, min, max },
            );
        }
    }
}

/**
 * Schema-based validation for complex objects
 */
export interface ValidationSchema {
    [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'address' | 'hex' | 'url';
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
        custom?: (value: unknown) => void;
    };
}

function validateSchemaField(
    field: string,
    value: unknown,
    rules: ValidationSchema[string],
    errors: string[],
): void {
    if (isRequiredFieldMissing(value, rules)) {
        errors.push(`${field} is required`);
        return;
    }

    if (isOptionalFieldEmpty(value, rules)) {
        return;
    }

    try {
        validateFieldType(field, value, rules.type);
        validateFieldLength(field, value, rules);
        validateFieldPattern(field, value, rules.pattern);

        if (rules.custom) {
            rules.custom(value);
        }
    } catch (error) {
        errors.push(`${field}: ${(error as Error).message}`);
    }
}

function isRequiredFieldMissing(value: unknown, rules: ValidationSchema[string]): boolean {
    return !!rules.required && (value === undefined || value === null || value === '');
}

function isOptionalFieldEmpty(value: unknown, rules: ValidationSchema[string]): boolean {
    return !rules.required && (value === undefined || value === null || value === '');
}
function validateFieldType(field: string, value: unknown, type: string): void {
    const typeValidators: Record<string, () => void> = {
        string: () => validateStringType(field, value),
        number: () => validateNumberType(field, value),
        boolean: () => validateBooleanType(field, value),
        address: () => Validator.validateAddress(value as string, field),
        hex: () => Validator.validateHexString(value as string, field),
        url: () => Validator.validateRpcUrl(value as string, field),
    };

    const validator = typeValidators[type];
    if (validator) {
        validator();
    }
}

function validateStringType(field: string, value: unknown): void {
    if (typeof value !== 'string') {
        throw new Error(`${field} must be a string`);
    }
}

function validateNumberType(field: string, value: unknown): void {
    if (typeof value !== 'number' && isNaN(Number(value))) {
        throw new Error(`${field} must be a number`);
    }
}

function validateBooleanType(field: string, value: unknown): void {
    if (typeof value !== 'boolean') {
        throw new Error(`${field} must be a boolean`);
    }
}

function validateFieldLength(field: string, value: unknown, rules: ValidationSchema[string]): void {
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            throw new Error(`${field} must be at least ${rules.minLength} characters long`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            throw new Error(`${field} must be no more than ${rules.maxLength} characters long`);
        }
    }
}

function validateFieldPattern(field: string, value: unknown, pattern?: RegExp): void {
    if (pattern && typeof value === 'string' && !pattern.test(value)) {
        throw new Error(`${field} does not match required pattern`);
    }
}

export function validateSchema(
    data: Record<string, unknown>,
    schema: ValidationSchema,
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
        validateSchemaField(field, data[field], rules, errors);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}
