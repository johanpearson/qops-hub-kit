# Azure Pipelines

This repository includes two Azure Pipeline configurations for CI/CD automation.

## CI Pipeline - Build and Test

**File:** `azure-pipelines-ci.yml`

### Purpose

Automatically validates code quality on every pull request and push to main/develop branches.

### What it does

1. ✅ Installs Node.js dependencies
2. ✅ Runs ESLint to check code style
3. ✅ Builds TypeScript code
4. ✅ Runs unit tests with coverage
5. ✅ Publishes test results and coverage reports
6. ✅ Creates build artifacts

### Triggers

- Pull requests to any branch
- Pushes to `main` or `develop` branches

### Setup

1. Navigate to Azure DevOps → Pipelines → Create Pipeline
2. Select your repository
3. Choose "Existing Azure Pipelines YAML file"
4. Select `/azure-pipelines-ci.yml`
5. Save and run

---

## Publish Pipeline - Package Publishing

**File:** `azure-pipelines-publish.yml`

### Purpose

Publishes the npm package to Azure Artifacts with automatic versioning.

### What it does

1. ✅ Bumps package version (patch/minor/major)
2. ✅ Runs linting and tests
3. ✅ Builds the package
4. ✅ Commits version change to repository
5. ✅ Publishes to Azure Artifacts feed
6. ✅ Creates Git tag for the release

### Triggers

- **Manual only** - User selects version bump type when triggering

### Version Bump Options

When you trigger the pipeline, you can select:

- **patch** - Bug fixes and minor updates (1.0.0 → 1.0.1)
- **minor** - New features, backward compatible (1.0.0 → 1.1.0)
- **major** - Breaking changes (1.0.0 → 2.0.0)

### Setup

#### 1. Create Azure Artifacts Feed

1. Navigate to Azure DevOps → Artifacts
2. Create a new feed (e.g., `qops-feed`)
3. Note the feed name for the next step

#### 2. Configure Pipeline

1. Update `azure-pipelines-publish.yml`:
   ```yaml
   variables:
     artifactFeedName: 'your-feed-name' # Replace with your feed name
   ```

#### 3. Set up Pipeline in Azure DevOps

1. Navigate to Azure DevOps → Pipelines → Create Pipeline
2. Select your repository
3. Choose "Existing Azure Pipelines YAML file"
4. Select `/azure-pipelines-publish.yml`
5. Save (don't run yet)

#### 4. Configure Permissions

The pipeline needs permission to:

- Push to the repository (for version commits and tags)
- Publish to Azure Artifacts feed

**Enable repository write access:**

1. Go to Project Settings → Repositories → Your Repo
2. Under "Security" tab, find "Build Service"
3. Grant "Contribute" and "Create tag" permissions

**Enable Artifacts publish:**

1. Go to Artifacts → Your Feed → Settings
2. Under "Permissions", add the build service account
3. Grant "Contributor" role

### How to Publish

1. Navigate to Pipelines → Select the Publish pipeline
2. Click "Run pipeline"
3. Select the version bump type:
   - **patch** for bug fixes
   - **minor** for new features
   - **major** for breaking changes
4. Click "Run"

The pipeline will:

1. Bump the version in `package.json`
2. Run tests to ensure everything works
3. Commit and push the version change
4. Publish to Azure Artifacts
5. Create a Git tag (e.g., `v1.2.3`)

### After Publishing

The new version will be available in your Azure Artifacts feed:

```bash
npm install @qops/hub-kit@latest
```

---

## Pipeline Variables

### CI Pipeline

- `nodeVersion`: Node.js version to use (default: 18.x)

### Publish Pipeline

- `nodeVersion`: Node.js version to use (default: 18.x)
- `artifactFeedName`: Your Azure Artifacts feed name (must be configured)

---

## Troubleshooting

### Tests Fail

- Ensure all tests pass locally before triggering pipeline
- Check test output in the pipeline logs
- Coverage must be ≥80% for all metrics

### Publish Fails - Permission Denied

- Verify Build Service has Contribute permission on repository
- Verify Build Service has Contributor role on Artifacts feed

### Version Already Exists

- The version in package.json already exists in the feed
- Select a higher version bump (e.g., minor instead of patch)
- Or manually update version in package.json

### Git Push Fails

- Check that Build Service has permission to push to the branch
- Ensure branch policies don't block Build Service pushes

---

## Best Practices

1. **Always run CI before publishing** - Ensure CI pipeline passes on your branch first
2. **Use semantic versioning** - Choose the right version bump:
   - patch: Bug fixes, documentation updates
   - minor: New features, backwards compatible
   - major: Breaking changes
3. **Review changes** - Check what's being published before triggering the pipeline
4. **Test locally** - Run `npm run build && npm test` before publishing
5. **Update changelog** - Document changes in commits or CHANGELOG.md

---

## Additional Resources

- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [Azure Artifacts Documentation](https://docs.microsoft.com/en-us/azure/devops/artifacts/)
- [Semantic Versioning](https://semver.org/)
