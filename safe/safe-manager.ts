import SafeApiKit from '@safe-global/api-kit';
import Safe from '@safe-global/protocol-kit';
import { MetaTransactionData, OperationType, SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import { getSafeConfig, getProposerConfig, OwnerConfig } from './config';

export class SafeManager {
  private apiKit: SafeApiKit;
  private safeConfig: ReturnType<typeof getSafeConfig>;

  constructor() {
    this.safeConfig = getSafeConfig();
    
    this.apiKit = new SafeApiKit({
      chainId: this.safeConfig.chainId
    });
  }

  /**
   * Create a Protocol Kit instance for a specific owner
   */
  private async createProtocolKit(ownerConfig: OwnerConfig): Promise<Safe> {
    return await Safe.init({
      provider: this.safeConfig.rpcUrl,
      signer: ownerConfig.privateKey,
      safeAddress: this.safeConfig.safeAddress
    });
  }

    /*//////////////////////////////////////////////////////////////
                  CREATE TRANSACTION - PROPOSE AND Bridge
    //////////////////////////////////////////////////////////////*/
 
  /**
   * Propose a transaction to the Safe
   */
  async proposeTransaction(
    transactionData: MetaTransactionData,
  ): Promise<string> {
    const ownerConfig = getProposerConfig();
    const protocolKit = await this.createProtocolKit(ownerConfig);

    // Create transaction
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [transactionData]
    });

    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const signature = await protocolKit.signHash(safeTxHash);

    // Propose transaction to the service
    await this.apiKit.proposeTransaction({
      safeAddress: this.safeConfig.safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress: ownerConfig.address,
      senderSignature: signature.data
    });

    return safeTxHash;
  }

  /**
   * Helper method to create a contract call transaction
   */
  createContractCallTransaction(
    to: string,
    data: string,
    value: string = '0'
  ): MetaTransactionData {
    return {
      to,
      value,
      data,
      operation: OperationType.Call
    };
  }

  /**
   * Helper method to create a delegate call transaction
   */
  createDelegateCallTransaction(
    to: string,
    data: string
  ): MetaTransactionData {
    return {
      to,
      value: '0',
      data,
      operation: OperationType.DelegateCall
    };
  }

  /**
   * Get a specific transaction by hash
   */
  async getTransaction(safeTxHash: string): Promise<any> {
    return await this.apiKit.getTransaction(safeTxHash);
  }

    /*//////////////////////////////////////////////////////////////
                            LIST-TRANSACTION
    //////////////////////////////////////////////////////////////*/

  /**
   * Get pending transactions
   */
  async getPendingTransactions() {
    return await this.apiKit.getPendingTransactions(this.safeConfig.safeAddress);
  }

  /**
   * Get all transactions
   */
  async getAllTransactions() {
    return await this.apiKit.getAllTransactions(this.safeConfig.safeAddress);
  }

  /**
   * Get incoming transactions
   */
  async getIncomingTransactions() {
    return await this.apiKit.getIncomingTransactions(this.safeConfig.safeAddress);
  }

  /**
   * Get multisig transactions
   */
  async getMultisigTransactions() {
    return await this.apiKit.getMultisigTransactions(this.safeConfig.safeAddress);
  }

  /**
   * Get module transactions
   */
  async getModuleTransactions() {
    return await this.apiKit.getModuleTransactions(this.safeConfig.safeAddress);
  }
}
