import { config } from 'dotenv';
import { ethers } from 'ethers';
import * as path from 'path';
import { ConfigurationError } from './errors';
import { logger } from './logger';
import { Validator } from './validation';

// Load environment variables from .env.safe
config({ path: path.join(__dirname, '../.env.safe') });

export interface SafeConfig {
    rpcUrl: string;
    chainId: bigint;
    safeAddress: string;
    apiKey: string;
}

export interface OwnerConfig {
    address: string;
    privateKey: string;
}

export function getSafeConfig(): SafeConfig {
    const chainId = process.env.CHAIN_ID || '11155111'; // Default to Sepolia
    const rpcUrl = process.env.RPC_URL;
    const safeAddress = process.env.SAFE_ADDRESS;
    const apiKey = process.env.SAFE_API_KEY;

    if (!rpcUrl) {
        logger.error('Missing required environment variable: RPC_URL');
        throw new ConfigurationError('RPC_URL is required in .env.safe', {
            missingVariable: 'RPC_URL',
        });
    }

    if (!safeAddress) {
        logger.error('Missing required environment variable: SAFE_ADDRESS');
        throw new ConfigurationError('SAFE_ADDRESS is required in .env.safe', {
            missingVariable: 'SAFE_ADDRESS',
        });
    }

    if (!apiKey) {
        logger.error('Missing required environment variable: SAFE_API_KEY');
        throw new ConfigurationError('SAFE_API_KEY is required in .env.safe', {
            missingVariable: 'SAFE_API_KEY',
        });
    }

    // Validate configuration
    try {
        Validator.validateRpcUrl(rpcUrl);
        Validator.validateAddress(safeAddress, 'SAFE_ADDRESS');
        Validator.validateChainId(chainId);

        logger.info('Safe configuration validated successfully', {
            chainId,
            rpcUrl: rpcUrl.substring(0, 20) + '...', // Log truncated URL for security
            safeAddress,
        });
    } catch (error) {
        logger.error('Invalid Safe configuration', error as Error);
        throw error;
    }

    return {
        rpcUrl,
        chainId: BigInt(chainId),
        safeAddress,
        apiKey,
    };
}

export function getProposerConfig(): OwnerConfig {
    const privateKey = process.env[`PROPOSER_PRIVATE_KEY`];

    if (!privateKey) {
        logger.error('Missing required proposer configuration');
        throw new ConfigurationError(
            `PROPOSER_PRIVATE_KEY is required in .env.safe`,
            {
                missingPrivateKey: !privateKey,
            },
        );
    }

    // Validate private key configuration
    try {
        Validator.validatePrivateKey(privateKey, 'PROPOSER_PRIVATE_KEY');

        // Derive address from private key using ethers
        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;

        logger.info('Proposer configuration validated successfully', {
            address,
            privateKeyLength: privateKey.length,
        });

        return {
            address,
            privateKey,
        };
    } catch (error) {
        logger.error('Invalid proposer configuration', error as Error);
        throw error;
    }
}

export function validateEnvironment(): void {
    logger.info('Validating environment configuration...');

    try {
        getSafeConfig();
        getProposerConfig();

        // Additional validation
        const envValidation = Validator.validateEnvironmentVariables(process.env);

        if (!envValidation.isValid) {
            logger.error('Environment validation failed', { errors: envValidation.errors });
            throw new ConfigurationError(
                `Environment validation failed: ${envValidation.errors.join(', ')}`,
                { validationErrors: envValidation.errors },
            );
        }

        if (envValidation.warnings.length > 0) {
            logger.warn('Environment validation warnings', { warnings: envValidation.warnings });
        }

        logger.info('Environment validation completed successfully');
    } catch (error) {
        logger.error('Environment validation failed', error as Error);
        throw error;
    }
}
