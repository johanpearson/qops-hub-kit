# Infrastructure and Pipeline Templates - Summary

## What Was Added

This PR adds reusable infrastructure and CI/CD templates to the qops-hub-kit repository, enabling individual service repositories to deploy Azure Functions with cost-optimized infrastructure.

## Structure

### Infrastructure Templates (`/infra`)
```
infra/
├── README.md                           # Comprehensive documentation
├── common-resources.bicep              # Shared resources (Key Vault)
├── service.bicep                       # Single service deployment
├── modules/                            # Modular Bicep templates
│   ├── resource-group.bicep
│   ├── storage-account.bicep          # Blob & Table storage (Standard_LRS)
│   ├── app-insights.bicep
│   ├── key-vault.bicep
│   └── function-app.bicep             # Serverless Functions (Consumption)
└── parameters/                         # Example parameter files
    ├── common-dev.json
    └── service-example.json
```

### Pipeline Templates (`/pipelines`)
```
pipelines/
├── README.md                           # Comprehensive documentation
├── steps/                              # Reusable step templates
│   ├── prepare-node.yml               # Node.js setup, auth, npm ci
│   ├── build.yml                      # Build TypeScript
│   ├── unit-test.yml                  # Run tests with coverage
│   ├── automated-test.yml             # E2E/integration tests
│   └── deploy-function-app.yml        # Deploy to Azure Functions
├── jobs/                               # Job templates
│   ├── build-and-test.yml
│   └── deploy.yml
├── stages/                             # Stage templates
│   ├── ci.yml
│   └── deploy-environment.yml
└── examples/                           # Complete pipeline examples
    ├── simple-pipeline.yml
    ├── service-pipeline.yml
    ├── service-pipeline-with-infra.yml
    └── deploy-infrastructure.yml
```

## Key Features

### Cost-Optimized for All Environments
- **Azure Functions**: Consumption plan (Y1) - Pay per execution
- **Storage**: Standard_LRS - Cheapest locally redundant storage
- **Includes**: Blob storage and Table storage
- **No databases**: Only blob and table storage for maximum simplicity
- **Cost**: ~$5-20/month per environment

### Designed for Individual Services
- Each service repository references these templates
- No multi-service orchestration
- Each service deploys independently
- Consistent patterns across all services

### Modular and Composable
- Infrastructure modules can be mixed and matched
- Pipeline steps can be used individually or combined
- All templates use cheapest SKUs
- Simple and generic - no service-specific configurations

### Comprehensive Documentation
- `/infra/README.md`: Infrastructure templates guide
- `/pipelines/README.md`: Pipeline templates reference
- `USAGE.md`: Complete end-to-end usage guide
- Multiple working examples for different scenarios

## Usage Pattern

### From a Service Repository

1. **Reference templates repository**:
```yaml
resources:
  repositories:
    - repository: hubkit
      type: git
      name: qops-hub-kit
      ref: refs/heads/main
```

2. **Use pipeline templates**:
```yaml
steps:
  - template: pipelines/steps/prepare-node.yml@hubkit
  - template: pipelines/steps/build.yml@hubkit
  - template: pipelines/steps/unit-test.yml@hubkit
```

3. **Deploy infrastructure**:
```bash
az deployment sub create \
  --template-file infra/service.bicep \
  --parameters environment=dev \
  --parameters serviceName=myservice
```

## Benefits

1. **Consistency**: All services use the same patterns and tools
2. **Efficiency**: Reusable templates reduce duplication
3. **Cost-effective**: Cheapest SKUs for all resources
4. **Easy to use**: Comprehensive examples and documentation
5. **Maintainable**: Changes to templates benefit all services
6. **Scalable**: Easy to add new services following the same pattern

## Storage Support

- **Blob Storage**: For file uploads and binary data
- **Table Storage**: For structured NoSQL data
- No Cosmos DB or SQL databases - keeping it simple and cost-effective

## Files Changed

- Added infrastructure templates and modules
- Added pipeline templates (steps, jobs, stages)
- Added comprehensive documentation
- Removed service-specific examples (profile, calendar, document)
- Removed database modules (Cosmos DB, SQL) - only storage

## Testing

All templates follow Azure best practices:
- Bicep templates use latest API versions
- Pipeline templates use standard Azure DevOps tasks
- Examples are based on working patterns
- Documentation includes troubleshooting guides
