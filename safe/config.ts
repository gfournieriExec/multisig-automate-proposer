import { config } from 'dotenv';
import * as path from 'path';

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
    throw new Error('RPC_URL is required in .env.safe');
  }

  if (!safeAddress) {
    throw new Error('SAFE_ADDRESS is required in .env.safe');
  }

  if (!apiKey) {
    throw new Error('SAFE_API_KEY is required in .env.safe');
  }

  return {
    rpcUrl,
    chainId: BigInt(chainId),
    safeAddress,
    apiKey
  };
}

export function getProposerConfig(): OwnerConfig {
  const address = process.env[`PROPOSER_1_ADDRESS`];
  const privateKey = process.env[`PROPOSER_1_PRIVATE_KEY`];

  if (!address || !privateKey) {
    throw new Error(`PROPOSER_1_ADDRESS and PROPOSER_1_PRIVATE_KEY are required in .env.safe`);
  }

  return {
    address,
    privateKey
  };
}

export function validateEnvironment(): void {
  getSafeConfig();
  getProposerConfig();
}
