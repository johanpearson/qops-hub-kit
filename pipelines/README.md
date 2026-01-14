# Pipeline Templates

Reusable Azure DevOps pipeline templates for building and deploying Function Apps.

## Available Templates

### Step Templates (`steps/`)

- `prepare-node.yml` - Install Node.js 22, auth with npmrc, run npm ci
- `build.yml` - Build TypeScript code
- `unit-test.yml` - Run tests with coverage
- `deploy-function-app.yml` - Deploy to Azure Function App

### Job Templates (`jobs/`)

- `build-and-test.yml` - Complete build and test job
- `deploy.yml` - Deployment job

### Stage Templates (`stages/`)

- `ci.yml` - CI stage
- `deploy-environment.yml` - Deploy to environment

## Example

See `examples/function-app-pipeline.yml` for a complete working example.

## Usage in Your Service

```yaml
resources:
  repositories:
    - repository: hubkit
      type: git
      name: qops-hub-kit

steps:
  - template: pipelines/steps/prepare-node.yml@hubkit
  - template: pipelines/steps/build.yml@hubkit
  - template: pipelines/steps/unit-test.yml@hubkit
```
