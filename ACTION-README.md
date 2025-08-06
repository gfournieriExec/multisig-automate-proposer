# Safe Multisig Transaction Proposer - GitHub Action

A reusable GitHub Action for proposing transactions through Safe multisig wallets with Foundry integration.

## 🚀 Features

- **Automated Transaction Proposals**: Execute Foundry scripts and automatically propose transactions to Safe multisig wallets
- **Multi-Network Support**: Works with Ethereum mainnet, testnets, and compatible chains
- **Comprehensive Logging**: Detailed execution logs with structured JSON output
- **Error Handling**: Production-ready error handling with meaningful error messages
- **Dry Run Support**: Test transactions without actual execution
- **Batch Processing**: Handle multiple transactions with proper nonce management

## 📋 Prerequisites

### Required Secrets
Store these as repository secrets:

- `PROPOSER_ADDRESS`: Address of a Safe owner account
- `PROPOSER_PRIVATE_KEY`: Private key of a Safe owner account
- `RPC_URL`: RPC endpoint for blockchain interaction

### Optional Secrets
- `SAFE_API_KEY`: API key for Safe API service (for enhanced rate limits)

### Required Variables
Configure these as repository variables:

- `SAFE_ADDRESS`: Address of the Safe multisig wallet

## 🔧 Usage

### Basic Usage

```yaml
name: Deploy Contract

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Propose Safe Transaction
        uses: gfournieriExec/multisig-automate-proposer@v1
        with:
          safe-address: ${{ vars.SAFE_ADDRESS }}
          safe-network: 'mainnet'
          rpc-url: ${{ secrets.RPC_URL }}
          proposer-address: ${{ secrets.PROPOSER_ADDRESS }}
          proposer-private-key: ${{ secrets.PROPOSER_PRIVATE_KEY }}
          safe-api-key: ${{ secrets.SAFE_API_KEY }}  # Optional: for enhanced rate limits
          foundry-script-path: 'script/Deploy.s.sol'
          transaction-description: 'Deploy new contract version'
```

### Advanced Usage with Multiple Networks

```yaml
name: Multi-Network Deployment

on:
  workflow_dispatch:
    inputs:
      networks:
        description: 'Target networks (comma-separated)'
        required: true
        default: 'mainnet,polygon'

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        network: ${{ fromJson(github.event.inputs.networks) }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to ${{ matrix.network }}
        uses: gfournieriExec/multisig-automate-proposer@v1
        with:
          safe-address: ${{ vars[format('SAFE_ADDRESS_{0}', upper(matrix.network))] }}
          safe-network: ${{ matrix.network }}
          rpc-url: ${{ secrets[format('RPC_URL_{0}', upper(matrix.network))] }}
          proposer-private-key: ${{ secrets.PROPOSER_PRIVATE_KEY }}
          foundry-script-path: 'script/Deploy.s.sol'
          foundry-script-args: '--network ${{ matrix.network }}'
          transaction-description: 'Deploy to ${{ matrix.network }}'
          environment: 'production'
```

### Reusable Workflow

Create a reusable workflow in `.github/workflows/safe-deploy.yml`:

```yaml
name: Safe Transaction Proposer

on:
  workflow_call:
    inputs:
      script-path:
        required: true
        type: string
      network:
        required: true
        type: string
      description:
        required: false
        type: string
        default: 'Automated deployment'
    secrets:
      proposer-private-key:
        required: true
      rpc-url:
        required: true
    outputs:
      transaction-hash:
        value: ${{ jobs.propose.outputs.transaction-hash }}

jobs:
  propose:
    runs-on: ubuntu-latest
    outputs:
      transaction-hash: ${{ steps.propose.outputs.transaction-hash }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Propose Transaction
        id: propose
        uses: gfournieriExec/multisig-automate-proposer@v1
        with:
          safe-address: ${{ vars.SAFE_ADDRESS }}
          safe-network: ${{ inputs.network }}
          rpc-url: ${{ secrets.rpc-url }}
          proposer-private-key: ${{ secrets.proposer-private-key }}
          foundry-script-path: ${{ inputs.script-path }}
          transaction-description: ${{ inputs.description }}
```

Then use it in other workflows:

```yaml
name: Deploy Contract

on:
  push:
    branches: [main]

jobs:
  deploy:
    uses: ./.github/workflows/safe-deploy.yml
    with:
      script-path: 'script/Deploy.s.sol'
      network: 'mainnet'
      description: 'Deploy new contract version'
    secrets:
      proposer-private-key: ${{ secrets.PROPOSER_PRIVATE_KEY }}
      rpc-url: ${{ secrets.RPC_URL }}
```

## 📊 Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `safe-address` | Safe multisig wallet address | ✅ | - |
| `safe-network` | Network name (mainnet, sepolia, polygon, etc.) | ✅ | `mainnet` |
| `rpc-url` | RPC URL for blockchain interaction | ✅ | - |
| `proposer-address` | Address of the proposer account (Safe owner) | ✅ | - |
| `proposer-private-key` | Private key of Safe owner | ✅ | - |
| `safe-api-key` | API key for Safe API service | ✅ | - |
| `foundry-script-path` | Path to Foundry script | ✅ | - |
| `foundry-script-args` | Additional script arguments | ❌ | `''` |
| `action-mode` | Action to perform (propose/list-pending) | ❌ | `propose` |
| `transaction-description` | Description for the transaction | ❌ | `'Automated transaction proposal'` |
| `environment` | Environment (production/staging/development) | ❌ | `production` |
| `gas-limit` | Gas limit for transactions | ❌ | - |
| `anvil-fork` | Use Anvil fork for testing | ❌ | `false` |
| `dry-run` | Perform dry run without execution | ❌ | `false` |

## 📤 Outputs

| Output | Description |
|--------|-------------|
| `transaction-hash` | Hash of the first proposed transaction |
| `transaction-hashes` | JSON array of all transaction hashes |
| `transaction-count` | Number of transactions processed |
| `pending-transactions` | JSON object with pending transactions (list-pending mode) |
| `status` | Operation status (success/failed/pending) |

## 🔧 Action Modes

### 1. Propose Mode (Default)
Executes Foundry script and proposes transactions to Safe:

```yaml
- uses: gfournieriExec/multisig-automate-proposer@v1
  with:
    action-mode: 'propose'
    # ... other inputs
```

### 2. List Pending Mode
Lists all pending transactions in the Safe:

```yaml
- uses: gfournieriExec/multisig-automate-proposer@v1
  with:
    action-mode: 'list-pending'
    # ... other inputs
```

## 🌐 Supported Networks

- **Ethereum**: `mainnet`, `goerli`, `sepolia`
- **Polygon**: `polygon`, `mumbai`
- **Arbitrum**: `arbitrum`, `arbitrum-goerli`
- **Optimism**: `optimism`, `optimism-goerli`
- **Gnosis**: `gnosis`
- **Avalanche**: `avalanche`, `fuji`

## 🔒 Security Best Practices

### 1. Secret Management
- Store private keys as repository secrets, never in code
- Use environment-specific secrets for different networks
- Rotate keys regularly

### 2. Safe Configuration
- Use multi-signature requirements (minimum 2-of-3)
- Verify all owners are trusted entities
- Enable transaction confirmations

### 3. Network Security
- Use reputable RPC providers
- Verify contract addresses before deployment
- Test on testnets before mainnet

## 🚨 Error Handling

The action provides comprehensive error handling:

```yaml
- name: Propose Transaction
  id: propose
  uses: gfournieriExec/multisig-automate-proposer@v1
  with:
    # ... inputs
  continue-on-error: true

- name: Handle Failure
  if: steps.propose.outputs.status == 'failed'
  run: |
    echo "Transaction proposal failed"
    echo "Check logs for details"
    exit 1
```

## 📝 Example Foundry Scripts

### Basic Deployment Script

```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MyContract.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        
        MyContract myContract = new MyContract();
        
        vm.stopBroadcast();
    }
}
```

### Upgrade Script with Parameters

```solidity
// script/Upgrade.s.sol
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MyContractV2.sol";

contract UpgradeScript is Script {
    function run() external {
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        
        vm.startBroadcast();
        
        MyContractV2 implementation = new MyContractV2();
        
        // Upgrade proxy to new implementation
        IProxy(proxyAddress).upgrade(address(implementation));
        
        vm.stopBroadcast();
    }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- [GitHub Issues](https://github.com/gfournieriExec/multisig-automate-proposer/issues)
- [Documentation](https://github.com/gfournieriExec/multisig-automate-proposer#readme)
- [iExec Support](https://iex.ec/support)
