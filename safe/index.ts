/**
 * Safe Multisig Integration for RLC Multichain Bridge
 */

export { SafeManager } from './safe-manager';
export { getSafeConfig, getProposerConfig, validateEnvironment } from './config';
export type { SafeConfig, OwnerConfig } from './config';
export type { MetaTransactionData, OperationType } from '@safe-global/types-kit';
