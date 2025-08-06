# Deployment Guide

## Production Deployment Checklist

### Pre-deployment Validation

```bash
# Run full production validation
npm run validate:production

# Build for production
npm run build

# Run security audit
npm audit --audit-level moderate
```

### Environment Setup

1. **Copy environment template**:

    ```bash
    cp .env.example .env
    ```

2. **Configure production values**:
    - Set `NODE_ENV=production`
    - Configure real RPC URLs (no localhost)
    - Set appropriate log level (`LOG_LEVEL=info`)
    - Ensure all private keys are properly secured

3. **Validate configuration**:
    ```bash
    npm run config:validate
    ```

### Docker Deployment

#### Build Docker Image

```bash
docker build -t safe-proposer:latest .
```

#### Run Container

```bash
docker run -d \
  --name safe-proposer \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/broadcast:/app/broadcast \
  safe-proposer:latest
```

### Security Considerations

#### Environment Variables

- Never commit `.env` files to version control
- Use secrets management systems in production
- Rotate private keys regularly
- Use read-only RPC endpoints when possible

#### Network Security

- Run behind a firewall
- Use VPN for sensitive operations
- Monitor network traffic
- Implement rate limiting

#### Monitoring

- Set up log aggregation
- Monitor error rates
- Track transaction success rates
- Set up alerting for failures

### CI/CD Pipeline

#### GitHub Actions Example

```yaml
name: Production Deploy
on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: '18'
            - run: npm ci
            - run: npm run validate:production
            - run: npm run build
            - name: Deploy to production
              run: |
                  # Your deployment script here
```

### Health Checks

#### Application Health

```bash
# Check if services are running
curl http://localhost:3000/health

# Check logs for errors
tail -f logs/app.log | grep ERROR

# Validate Safe connection
npm run safe:status
```

#### Performance Monitoring

- Monitor memory usage
- Track CPU utilization
- Monitor disk space for logs
- Track transaction processing time

### Backup and Recovery

#### Backup Strategy

- Backup transaction broadcast files
- Export Safe transaction history
- Backup configuration (encrypted)
- Regular database snapshots if applicable

#### Recovery Procedures

1. Restore from backup
2. Validate configuration
3. Test with small transactions
4. Resume normal operations

### Scaling Considerations

#### Horizontal Scaling

- Multiple proposer instances
- Load balancing for RPC calls
- Distributed transaction processing

#### Vertical Scaling

- Increase memory allocation
- Optimize for CPU usage
- SSD storage for better I/O

### Troubleshooting

#### Common Issues

1. **RPC Connection Failures**
    - Check network connectivity
    - Verify RPC endpoint status
    - Check API key limits

2. **Transaction Failures**
    - Verify Safe configuration
    - Check proposer permissions
    - Review gas estimation

3. **High Memory Usage**
    - Review log rotation settings
    - Check for memory leaks
    - Optimize batch processing

#### Debug Mode

```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug

# Run with verbose output
npm run start -- --verbose
```

### Production Best Practices

1. **Use process managers** (PM2, systemd)
2. **Implement graceful shutdowns**
3. **Set up log rotation**
4. **Monitor resource usage**
5. **Implement circuit breakers**
6. **Use connection pooling**
7. **Cache frequently accessed data**
8. **Implement retry mechanisms**

### Compliance and Auditing

#### Audit Trail

- Log all transactions
- Track proposer actions
- Monitor configuration changes
- Record deployment events

#### Compliance Features

- Transaction approval workflows
- Multi-signature requirements
- Access control logging
- Regulatory reporting

For more detailed information, refer to the main README.md file.
