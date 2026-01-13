# Pipeline Templates for Azure DevOps

This folder contains reusable Azure DevOps pipeline templates for building, testing, and deploying Azure Functions services that use the `@qops/hub-kit` library.

## Overview

These templates are designed to be **referenced from individual service repositories**. Each service will have its own pipeline that uses these shared templates for consistency across all services.

The pipeline templates are organized into modular components:

- **Steps**: Individual actions (install Node.js, run tests, etc.)
- **Jobs**: Groups of steps that run on a single agent
- **Stages**: Groups of jobs that represent phases in your pipeline
- **Examples**: Complete pipeline examples showing how to use the templates

## Structure

```
pipelines/
├── steps/
│   ├── prepare-node.yml          # Install Node.js, authenticate, install dependencies
│   ├── unit-test.yml              # Run unit tests with coverage
│   ├── automated-test.yml         # Clone and run automated tests
│   ├── build.yml                  # Build TypeScript code
│   └── deploy-function-app.yml    # Deploy to Azure Function App
├── jobs/
│   ├── build-and-test.yml         # Complete build and test job
│   └── deploy.yml                 # Deploy job
├── stages/
│   ├── ci.yml                     # Continuous Integration stage
│   └── deploy-environment.yml     # Deploy to environment stage
└── examples/
    ├── service-pipeline.yml       # Complete service pipeline
    └── multi-service-pipeline.yml # Pipeline for multiple services
```

## Quick Start

### Using Templates in Your Service Repository

1. **Reference this repository** in your service pipeline:

```yaml
resources:
  repositories:
    - repository: hubkit
      type: git
      name: qops-hub-kit  # Your Azure DevOps project/repo
      ref: refs/heads/main
```

2. **Use step templates** in your pipeline:

```yaml
steps:
  - template: pipelines/steps/prepare-node.yml@hubkit
    parameters:
      nodeVersion: '22.x'
      
  - template: pipelines/steps/unit-test.yml@hubkit
```

3. **See complete examples** in the `examples/` folder

### Example Service Pipeline

```yaml
# azure-pipelines.yml in your service repository
trigger:
  - main

resources:
  repositories:
    - repository: hubkit
      type: git
      name: qops-hub-kit

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - template: pipelines/steps/prepare-node.yml@hubkit
          - template: pipelines/steps/build.yml@hubkit
          - template: pipelines/steps/unit-test.yml@hubkit
          
  - stage: Deploy
    jobs:
      - deployment: DeployDev
        environment: dev
        strategy:
          runOnce:
            deploy:
              steps:
                - template: pipelines/steps/deploy-function-app.yml@hubkit
                  parameters:
                    azureSubscription: 'Azure-Connection'
                    functionAppName: 'func-myservice-dev'
```

## Step Templates

### prepare-node.yml

Prepares Node.js environment with authentication and dependencies.

**Parameters:**
- `nodeVersion` (default: '22.x'): Node.js version to install
- `workingDirectory` (optional): Working directory for npm commands
- `useNpmrc` (default: true): Authenticate with .npmrc

**Usage:**
```yaml
- template: pipelines/steps/prepare-node.yml
  parameters:
    nodeVersion: '22.x'
```

### unit-test.yml

Runs unit tests with coverage and publishes results.

**Parameters:**
- `workingDirectory` (optional): Working directory
- `testScript` (default: 'npm run test:coverage'): Test command
- `publishResults` (default: true): Publish test results
- `publishCoverage` (default: true): Publish coverage results

**Usage:**
```yaml
- template: pipelines/steps/unit-test.yml
  parameters:
    testScript: 'npm run test:coverage'
```

### automated-test.yml

Clones test repository and runs automated tests.

**Parameters:**
- `testRepoUrl` (required): Test repository URL
- `testRepoBranch` (default: 'main'): Branch to clone
- `testScript` (default: 'npm test'): Test command to run
- `workingDirectory` (optional): Directory to run tests in

**Usage:**
```yaml
- template: pipelines/steps/automated-test.yml
  parameters:
    testRepoUrl: 'https://github.com/org/test-repo.git'
    testScript: 'npm run test:e2e'
```

### build.yml

Builds TypeScript code.

**Parameters:**
- `workingDirectory` (optional): Working directory
- `buildScript` (default: 'npm run build'): Build command

**Usage:**
```yaml
- template: pipelines/steps/build.yml
  parameters:
    buildScript: 'npm run build'
```

### deploy-function-app.yml

Deploys code to Azure Function App.

**Parameters:**
- `azureSubscription` (required): Azure service connection name
- `functionAppName` (required): Name of the Function App
- `package` (default: '$(Build.ArtifactStagingDirectory)/*.zip'): Package to deploy
- `workingDirectory` (optional): Working directory

**Usage:**
```yaml
- template: pipelines/steps/deploy-function-app.yml
  parameters:
    azureSubscription: 'Azure-Dev'
    functionAppName: 'func-qops-profile-dev'
```

## Job Templates

### build-and-test.yml

Complete job for building and testing Node.js application.

**Parameters:**
- `nodeVersion` (default: '22.x'): Node.js version
- `workingDirectory` (optional): Working directory
- `vmImage` (default: 'ubuntu-latest'): Agent VM image
- `jobName` (default: 'BuildAndTest'): Job name

**Usage:**
```yaml
jobs:
  - template: pipelines/jobs/build-and-test.yml
    parameters:
      nodeVersion: '22.x'
      workingDirectory: 'services/profile'
```

### deploy.yml

Deployment job for Azure Function App.

**Parameters:**
- `environment` (required): Environment name (dev/test/prod)
- `azureSubscription` (required): Azure service connection
- `functionAppName` (required): Function App name
- `vmImage` (default: 'ubuntu-latest'): Agent VM image
- `dependsOn` (optional): Job dependencies

**Usage:**
```yaml
jobs:
  - template: pipelines/jobs/deploy.yml
    parameters:
      environment: 'dev'
      azureSubscription: 'Azure-Dev'
      functionAppName: 'func-qops-profile-dev'
```

## Stage Templates

### ci.yml

Continuous Integration stage with build and test.

**Parameters:**
- `nodeVersion` (default: '22.x'): Node.js version
- `workingDirectory` (optional): Working directory
- `stageName` (default: 'CI'): Stage name

**Usage:**
```yaml
stages:
  - template: pipelines/stages/ci.yml
    parameters:
      nodeVersion: '22.x'
```

### deploy-environment.yml

Deployment stage for a specific environment.

**Parameters:**
- `environment` (required): Environment name (dev/test/prod)
- `azureSubscription` (required): Azure service connection
- `functionAppName` (required): Function App name
- `dependsOn` (default: ['CI']): Stage dependencies
- `resourceGroupName` (optional): Resource group name
- `location` (default: 'swedencentral'): Azure region

**Usage:**
```yaml
stages:
  - template: pipelines/stages/deploy-environment.yml
    parameters:
      environment: 'dev'
      azureSubscription: 'Azure-Dev'
      functionAppName: 'func-qops-profile-dev'
      dependsOn: ['CI']
```

## Complete Examples

Check the `examples/` folder for complete, ready-to-use pipeline examples:

### service-pipeline.yml
Complete CI/CD pipeline for a service with:
- Build and test
- Deploy to Dev (automatic)
- Deploy to Test (with approval)
- Deploy to Prod (with approval)

**Use this when**: You have already deployed infrastructure and just need to deploy code.

### service-pipeline-with-infra.yml
Pipeline that deploys both infrastructure and code:
- Deploys Bicep templates
- Deploys application code
- Multi-environment support

**Use this when**: You want infrastructure deployment as part of your service pipeline.

### simple-pipeline.yml
Minimal example using only step templates.

**Use this when**: You're getting started or want maximum flexibility.

### deploy-infrastructure.yml
Standalone infrastructure deployment pipeline.

**Use this when**: You want to deploy infrastructure separately from code deployment.

## Best Practices

1. **Reference templates from service repos**: Each service should reference these templates via Azure Repos
2. **Use the @alias syntax**: Use `@hubkit` (or your chosen alias) to reference templates
3. **Parameterize service-specific values**: Service name, Function App name, etc.
4. **Enable approvals for production**: Configure environment approvals in Azure DevOps
5. **Store secrets in Variable Groups**: Use Azure DevOps Library for sensitive data
6. **Deploy infrastructure once**: Use `common-resources.bicep` once per environment
7. **Each service deploys independently**: Use `service.bicep` for each service's infrastructure

## Integration with Infrastructure

These pipeline templates work seamlessly with the Bicep templates in `/infra`:

### Option 1: Separate Infrastructure and Code Deployment
1. Deploy common resources once: `infra/common-resources.bicep`
2. Deploy service infrastructure: `infra/service.bicep` (manual or dedicated pipeline)
3. Use service pipeline to deploy code: Reference templates in your service repo

### Option 2: Combined Deployment
1. Service pipeline deploys infrastructure AND code
2. See `examples/service-pipeline-with-infra.yml`
3. Infrastructure is updated with each deployment

### Recommended Approach
- Deploy common resources manually (once per environment)
- Deploy service infrastructure via pipeline (updates as needed)
- Deploy service code frequently via CI/CD pipeline

## Variables

Common variables used across templates:

- `nodeVersion`: Node.js version (default: '22.x')
- `workingDirectory`: Root directory for operations
- `azureSubscription`: Azure service connection name
- `environment`: Environment name (dev/test/prod)

## Service Connections

Create these Azure DevOps service connections:

- `Azure-Dev`: Connection to development subscription
- `Azure-Test`: Connection to test subscription
- `Azure-Prod`: Connection to production subscription

## Secrets

Store these secrets in Azure DevOps Library:

- `JWT_SECRET`: JWT secret for authentication
- `SQL_ADMIN_PASSWORD`: SQL database admin password
- Any other service-specific secrets

## Support

For issues or questions:
- Review example pipelines in `examples/`
- Check Azure DevOps documentation
- Refer to the infrastructure README in `/infra`
