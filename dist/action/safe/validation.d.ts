/**
 * Comprehensive validation utilities for production use
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class Validator {
    /**
     * Validate Ethereum address
     */
    static validateAddress(address: string, fieldName?: string): void;
    /**
     * Validate private key format
     */
    static validatePrivateKey(privateKey: string, fieldName?: string): void;
    /**
     * Validate RPC URL
     */
    static validateRpcUrl(rpcUrl: string, fieldName?: string): void;
    /**
     * Validate chain ID
     */
    static validateChainId(chainId: string | number, fieldName?: string): void;
    /**
     * Validate hex string
     */
    static validateHexString(hex: string, fieldName?: string, expectedLength?: number): void;
    /**
     * Validate transaction data
     */
    static validateTransactionData(txData: {
        to: string;
        value: string;
        data: string;
        operation?: string;
    }): void;
    /**
     * Validate environment variables
     */
    static validateEnvironmentVariables(envVars: Record<string, any>): ValidationResult;
    /**
     * Validate file path and permissions
     */
    static validateFilePath(filePath: string, requiredPermissions?: 'read' | 'write' | 'readwrite'): void;
    /**
     * Sanitize input to prevent injection attacks
     */
    static sanitizeInput(input: string, fieldName?: string): string;
    /**
     * Validate numeric range
     */
    static validateNumericRange(value: number, min: number, max: number, fieldName?: string): void;
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
        custom?: (value: any) => void;
    };
}
export declare function validateSchema(data: Record<string, any>, schema: ValidationSchema): ValidationResult;
//# sourceMappingURL=validation.d.ts.map