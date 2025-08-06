# Safe Multisig Integration for RLC Multichain Bridge

A production-ready TypeScript application for integrating Safe multisig wallets with Foundry-based smart contract deployments and transaction execution. **Now available as a GitHub Action!**

## 🏗️ Architecture Overview

This project provides a comprehensive solution for:

- **Safe Multisig Integration**: Automated transaction proposal and execution through Safe multisig wallets
- **Foundry Integration**: Seamless integration with Foundry scripts and Anvil forking
- **Transaction Management**: Batch transaction processing with proper nonce management
- **Production Monitoring**: Comprehensive logging, error handling, and validation
- **GitHub Actions**: Reusable workflow for CI/CD automation

## 🚀 Features

### Core Functionality

- ✅ **Automated Transaction Execution**: Execute Foundry scripts and propose transactions to Safe multisig
- ✅ **Batch Transaction Processing**: Handle multiple transactions with sequential nonce management
- ✅ **Anvil Fork Support**: Automatic Anvil fork management for local testing
- ✅ **Dynamic Chain Detection**: Automatic chain ID detection from RPC endpoints
- ✅ **Comprehensive Validation**: Production-ready input validation and error handling

### Production Features

- ✅ **Structured Logging**: JSON-formatted logs with rotation and levels
- ✅ **Error Handling**: Custom error classes with detailed context
- ✅ **Configuration Management**: Environment-based configuration with validation
- ✅ **Type Safety**: Full TypeScript implementation with strict typing
- ✅ **Code Quality**: Prettier formatting and organized imports

### GitHub Action Features

- ✅ **Reusable Workflows**: Use as a GitHub Action in any repository
- ✅ **Multi-Network Support**: Support for all major networks
- ✅ **Secure Secret Management**: Proper handling of private keys and RPC URLs
- ✅ **Comprehensive Outputs**: Detailed transaction information and status
- ✅ **Error Reporting**: Automatic issue creation and PR comments on failures

## 🎯 Quick Start - GitHub Action

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
          proposer-private-key: ${{ secrets.PROPOSER_PRIVATE_KEY }}
          foundry-script-path: 'script/Deploy.s.sol'
          transaction-description: 'Deploy new contract version'
```

### Advanced Multi-Network Deployment

```yaml
- name: Deploy to Multiple Networks
  strategy:
    matrix:
      network: [mainnet, polygon, arbitrum]
  uses: gfournieriExec/multisig-automate-proposer@v1
  with:
    safe-address: ${{ vars[format('SAFE_ADDRESS_{0}', upper(matrix.network))] }}
    safe-network: ${{ matrix.network }}
    rpc-url: ${{ secrets[format('RPC_URL_{0}', upper(matrix.network))] }}
    proposer-private-key: ${{ secrets.PROPOSER_PRIVATE_KEY }}
    foundry-script-path: 'script/Deploy.s.sol'
```

📚 **[View Complete GitHub Action Documentation →](ACTION-README.md)**

## 📋 Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.0.0
- **Foundry** (for Anvil and Forge functionality)

### Dependencies

- `@safe-global/api-kit` - Safe transaction service integration
- `@safe-global/protocol-kit` - Safe protocol operations
- `ethers` v6 - Ethereum interaction library

## ⚙️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd safe-proposer-transaction

# Install dependencies
npm install

# Copy environment template
cp .env.safe.template .env.safe

# Configure environment variables (see Configuration section)
nano .env.safe

# Build the project
npm run build
```

## 🔧 Configuration

### Environment Variables

Create a `.env.safe` file with the following variables:

```bash
# Network Configuration
RPC_URL=https://your-rpc-endpoint.com
CHAIN_ID=11155111  # Sepolia testnet

# Safe Configuration
SAFE_ADDRESS=0x...  # Your Safe multisig address
SAFE_API_KEY=your_safe_api_key

# Proposer Configuration
PROPOSER_1_ADDRESS=0x...  # Address of transaction proposer
PROPOSER_1_PRIVATE_KEY=0x...  # Private key (keep secure!)

# Optional: Logging Configuration
LOG_LEVEL=INFO  # ERROR, WARN, INFO, DEBUG
NODE_ENV=production  # development, production
```

### Supported Networks

| Network          | Chain ID | RPC URL Example                               |
| ---------------- | -------- | --------------------------------------------- |
| Ethereum Mainnet | 1        | `https://eth-mainnet.public.blastapi.io`      |
| Sepolia Testnet  | 11155111 | `https://eth-sepolia.public.blastapi.io`      |
| Arbitrum Mainnet | 42161    | `https://arbitrum-mainnet.public.blastapi.io` |
| Arbitrum Sepolia | 421614   | `https://arbitrum-sepolia.public.blastapi.io` |

## 🎯 Usage

### Basic Transaction Execution

```bash
# Execute Foundry script with environment variables
npm run execute-tx -- --rpc-url https://sepolia.infura.io/v3/YOUR_KEY \
                     --env-vars "SOURCE_CHAIN=sepolia TARGET_CHAIN=arbitrum-sepolia"

# Execute specific Foundry script
npm run execute-tx -- --rpc-url https://arbitrum-sepolia.rpc.com \
                     --forge-script "script/Deploy.s.sol:Deploy" \
                     --smart-contract Deploy

# Dry run (preview transactions without executing)
npm run execute-tx -- --rpc-url https://sepolia.rpc.com \
                     --env-vars "KEY=value" \
                     --dry-run
```

### Transaction Management

```bash
# List pending transactions
npm run list-pending

# List all transactions with limit
npm run list-pending -- --type all --limit 10

# List specific transaction types
npm run list-pending -- --type pending
npm run list-pending -- --type incoming
npm run list-pending -- --type multisig
```

### Development Commands

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Build project
npm run build

# Development mode with hot reload
npm run dev
```

## 🏗️ Architecture Details

### Project Structure

```
safe/
├── anvil-manager.ts      # Anvil fork management
├── config.ts             # Configuration and environment validation
├── errors.ts             # Custom error classes and error handling
├── logger.ts             # Production logging system
├── safe-manager.ts       # Safe multisig integration
├── transaction-executor.ts # Main transaction execution logic
├── utils.ts              # Shared utility functions
├── validation.ts         # Input validation and sanitization
└── index.ts              # Public API exports
```

### Key Components

#### TransactionExecutor

- Orchestrates Foundry script execution
- Manages Anvil fork lifecycle
- Handles transaction batching and nonce management
- Provides CLI interface

#### SafeManager

- Integrates with Safe API and Protocol Kit
- Handles transaction proposal and signing
- Manages sequential nonce operations
- Provides transaction query functionality

#### AnvilManager

- Manages Anvil fork processes
- Handles automatic fork detection
- Provides process lifecycle management
- Configures RPC URL routing

#### Logger

- Structured JSON logging
- Log rotation and file management
- Multiple log levels (ERROR, WARN, INFO, DEBUG)
- Performance and audit logging

#### Error Handling

- Custom error classes with context
- Operational vs programming error distinction
- Comprehensive error codes
- User-friendly error messages

## 🔒 Security Considerations

### Private Key Management

- Store private keys in environment variables, never in code
- Use `.env.safe` file with proper permissions (600)
- Consider using hardware wallets or key management services for production

### Network Security

- Use HTTPS RPC endpoints in production
- Validate all RPC responses
- Implement rate limiting for API calls

### Transaction Security

- Always use dry-run mode for testing
- Validate transaction data before proposal
- Implement multi-signature requirements
- Log all transaction operations for audit trails

## 📊 Monitoring & Logging

### Log Structure

```json
{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "level": "INFO",
    "message": "Transaction proposed successfully",
    "metadata": {
        "hash": "0x...",
        "nonce": 5,
        "chainId": "11155111"
    }
}
```

### Key Metrics

- Transaction success/failure rates
- Network response times
- Anvil fork startup times
- Safe API response times

### Error Monitoring

- Structured error logging with context
- Error categorization (network, validation, system)
- Performance metrics for operations
- Audit trails for sensitive operations

## 🧪 Testing

### Development Testing

Currently, the project focuses on manual testing and validation:

```bash
# Validate code quality and build
npm run validate

# Build and check for errors
npm run build

# Test with dry-run mode
npm run execute-tx -- --dry-run --rpc-url https://sepolia.rpc.com
```

## 🚀 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Log directory permissions set
- [ ] Network connectivity verified
- [ ] Safe multisig configured with proper thresholds
- [ ] Foundry toolkit installed and accessible
- [ ] Error monitoring configured
- [ ] Backup and recovery procedures documented

### Environment Setup

```bash
# Production environment
export NODE_ENV=production
export LOG_LEVEL=INFO

# Start application
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env.safe ./

CMD ["node", "dist/safe/transaction-executor.js"]
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Install dependencies: `npm install`
4. Make changes and add validation
5. Run checks: `npm run format && npm run build && npm run validate`
6. Commit with conventional commits: `git commit -m "feat: add new feature"`
7. Push and create pull request

### Code Standards

- **TypeScript**: Strict typing enabled
- **Formatting**: Prettier with 4-space tabs
- **Linting**: ESLint with recommended rules
- **Validation**: Comprehensive validation pipeline
- **Documentation**: JSDoc comments for all public APIs

### Pull Request Process

1. Ensure all validation passes
2. Update documentation for new features
3. Add changelog entry
4. Ensure no security vulnerabilities
5. Request review from maintainers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

| Issue                   | Solution                                               |
| ----------------------- | ------------------------------------------------------ | ----- |
| "Foundry not found"     | Install Foundry: `curl -L https://foundry.paradigm.xyz | bash` |
| "Safe API key invalid"  | Verify API key at https://app.safe.global/             |
| "RPC connection failed" | Check network connectivity and RPC URL                 |
| "Private key invalid"   | Ensure 64-character hex format (32 bytes)              |

### Getting Help

- 📖 **Documentation**: Check this README and inline code comments
- 🐛 **Bug Reports**: Create an issue with reproduction steps
- 💡 **Feature Requests**: Create an issue with detailed requirements
- 💬 **Discussions**: Use GitHub Discussions for questions

### Contact

- **Project Maintainer**: [Your Name]
- **Email**: [your.email@domain.com]
- **GitHub**: [@yourusername]

---

## 📈 Roadmap

### Current Version (v1.0.0)

- ✅ Core transaction execution
- ✅ Safe multisig integration
- ✅ Foundry integration
- ✅ Production logging and error handling

### Future Versions

#### v1.1.0

- [ ] Web UI for transaction management
- [ ] Enhanced monitoring dashboard
- [ ] Multi-network transaction batching
- [ ] Advanced retry mechanisms

#### v1.2.0

- [ ] Plugin system for custom transaction types
- [ ] Integration with additional Safe features
- [ ] Enhanced security features
- [ ] Performance optimizations

#### v2.0.0

- [ ] Support for multiple Safe instances
- [ ] Advanced workflow automation
- [ ] Integration with external monitoring systems
- [ ] Enterprise features and support
