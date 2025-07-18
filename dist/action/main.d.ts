#!/usr/bin/env node
declare class GitHubActionRunner {
    private inputs;
    constructor();
    private parseInputs;
    private setupEnvironment;
    private validateInputs;
    private executeAction;
    private proposeTransaction;
    private executeTransaction;
    private listPendingTransactions;
    run(): Promise<void>;
}
export { GitHubActionRunner };
//# sourceMappingURL=main.d.ts.map