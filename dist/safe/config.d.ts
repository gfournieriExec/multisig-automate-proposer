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
export declare function getSafeConfig(): Promise<SafeConfig>;
export declare function getProposerConfig(): OwnerConfig;
export declare function validateEnvironment(): Promise<void>;
//# sourceMappingURL=config.d.ts.map