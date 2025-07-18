"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSafeConfig = getSafeConfig;
exports.getProposerConfig = getProposerConfig;
exports.validateEnvironment = validateEnvironment;
const tslib_1 = require("tslib");
const dotenv_1 = require("dotenv");
const path = tslib_1.__importStar(require("path"));
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const validation_1 = require("./validation");
// Load environment variables from .env.safe
(0, dotenv_1.config)({ path: path.join(__dirname, '../.env.safe') });
function getSafeConfig() {
    const chainId = process.env.CHAIN_ID || '11155111'; // Default to Sepolia
    const rpcUrl = process.env.RPC_URL;
    const safeAddress = process.env.SAFE_ADDRESS;
    const apiKey = process.env.SAFE_API_KEY;
    if (!rpcUrl) {
        logger_1.logger.error('Missing required environment variable: RPC_URL');
        throw new errors_1.ConfigurationError('RPC_URL is required in .env.safe', {
            missingVariable: 'RPC_URL',
        });
    }
    if (!safeAddress) {
        logger_1.logger.error('Missing required environment variable: SAFE_ADDRESS');
        throw new errors_1.ConfigurationError('SAFE_ADDRESS is required in .env.safe', {
            missingVariable: 'SAFE_ADDRESS',
        });
    }
    if (!apiKey) {
        logger_1.logger.error('Missing required environment variable: SAFE_API_KEY');
        throw new errors_1.ConfigurationError('SAFE_API_KEY is required in .env.safe', {
            missingVariable: 'SAFE_API_KEY',
        });
    }
    // Validate configuration
    try {
        validation_1.Validator.validateRpcUrl(rpcUrl);
        validation_1.Validator.validateAddress(safeAddress, 'SAFE_ADDRESS');
        validation_1.Validator.validateChainId(chainId);
        logger_1.logger.info('Safe configuration validated successfully', {
            chainId,
            rpcUrl: rpcUrl.substring(0, 20) + '...', // Log truncated URL for security
            safeAddress,
        });
    }
    catch (error) {
        logger_1.logger.error('Invalid Safe configuration', error);
        throw error;
    }
    return {
        rpcUrl,
        chainId: BigInt(chainId),
        safeAddress,
        apiKey,
    };
}
function getProposerConfig() {
    const address = process.env[`PROPOSER_1_ADDRESS`];
    const privateKey = process.env[`PROPOSER_1_PRIVATE_KEY`];
    if (!address || !privateKey) {
        logger_1.logger.error('Missing required proposer configuration');
        throw new errors_1.ConfigurationError(`PROPOSER_1_ADDRESS and PROPOSER_1_PRIVATE_KEY are required in .env.safe`, {
            missingAddress: !address,
            missingPrivateKey: !privateKey,
        });
    }
    // Validate proposer configuration
    try {
        validation_1.Validator.validateAddress(address, 'PROPOSER_1_ADDRESS');
        validation_1.Validator.validatePrivateKey(privateKey, 'PROPOSER_1_PRIVATE_KEY');
        logger_1.logger.info('Proposer configuration validated successfully', {
            address,
            privateKeyLength: privateKey.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Invalid proposer configuration', error);
        throw error;
    }
    return {
        address,
        privateKey,
    };
}
function validateEnvironment() {
    logger_1.logger.info('Validating environment configuration...');
    try {
        getSafeConfig();
        getProposerConfig();
        // Additional validation
        const envValidation = validation_1.Validator.validateEnvironmentVariables(process.env);
        if (!envValidation.isValid) {
            logger_1.logger.error('Environment validation failed', { errors: envValidation.errors });
            throw new errors_1.ConfigurationError(`Environment validation failed: ${envValidation.errors.join(', ')}`, { validationErrors: envValidation.errors });
        }
        if (envValidation.warnings.length > 0) {
            logger_1.logger.warn('Environment validation warnings', { warnings: envValidation.warnings });
        }
        logger_1.logger.info('Environment validation completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Environment validation failed', error);
        throw error;
    }
}
//# sourceMappingURL=config.js.map