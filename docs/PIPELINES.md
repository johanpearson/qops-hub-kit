# Azure Pipelines

This repository includes two Azure Pipeline configurations for CI/CD automation using a **trunk-based workflow**.

## Branching Strategy

This project follows a **trunk-based development** workflow:

- Create feature, bugfix, or hotfix branches from `main`
- Merge changes back to `main` via pull requests
- Release from `main` branch
- No separate `develop` or `release` branches

## CI Pipeline - Build and Test

**File:** `azure-pipelines-ci.yml`

### Purpose

Automatically validates code quality on every pull request and push to main branch.

### What it does

1. ✅ Installs Node.js dependencies
2. ✅ Runs TypeScript type checking
3. ✅ Builds TypeScript code
4. ✅ Runs unit tests with coverage
5. ✅ Publishes test results and coverage reports
6. ✅ Creates build artifacts

**Note:** Linting is handled by Husky pre-commit hooks, not in the pipeline.

### Triggers

- Pull requests to any branch
- Pushes to `main` branch

### Setup

1. Navigate to Azure DevOps → Pipelines → Create Pipeline
2. Select your repository
3. Choose "Existing Azure Pipelines YAML file"
4. Select `/azure-pipelines-ci.yml`
5. Save and run

---

## Publish Pipeline - Package Publishing (Tag-Triggered)

**File:** `azure-pipelines-publish.yml`

### Purpose

Super simple tag-based publish flow: push a version tag from `main` or `hotfix/*` branch, and the pipeline automatically builds, tests, and publishes to Azure Artifacts.

### What it does

1. ✅ Validates branch is `main` or `hotfix/*`
2. ✅ Detects version tag (e.g., `v1.2.3`)
3. ✅ Runs type checking, builds, and tests
4. ✅ Publishes to Azure Artifacts feed

**Note:** Linting is handled by Husky pre-commit hooks, not in the pipeline.

### Triggers

- **Automatic on version tags** - Triggered when you push a tag matching `v*.*.*` (e.g., `v1.0.0`, `v2.1.3`)
- **Branch restrictions** - Only publishes from `main` or `hotfix/*` branches for safety

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
5. Save

#### 4. Configure Permissions

The pipeline needs permission to publish to Azure Artifacts feed.

**Enable Artifacts publish:**

1. Go to Artifacts → Your Feed → Settings
2. Under "Permissions", add the build service account
3. Grant "Contributor" role

### How to Publish

Publishing is now as simple as creating and pushing a git tag from `main` or `hotfix/*` branch:

```bash
# From main branch (standard release)
git checkout main
git pull

# 1. Update version in package.json (optional - pipeline will sync it)
npm version patch  # or minor, or major

# 2. Push the tag (this triggers the publish pipeline)
git push origin v1.0.1

# That's it! The pipeline will automatically:
# - Validate branch is main or hotfix/*
# - Run type checking
# - Build and test the code
# - Publish to Azure Artifacts
```

**For hotfix releases:**

```bash
# From hotfix branch (emergency fixes)
git checkout hotfix/fix-critical-bug
git pull

# Create and push tag
npm version patch
git push origin v1.0.2

# Pipeline will allow publishing from hotfix/* branches
```

**Version examples:**

- `v1.0.1` - Patch release (bug fixes)
- `v1.1.0` - Minor release (new features)
- `v2.0.0` - Major release (breaking changes)

✅ **Even simpler!** No manual pipeline triggers, no clicking buttons - just push a tag.

### After Publishing

The new version will be available in your Azure Artifacts feed:

```bash
npm install @qops/hub-kit@latest
```

### Alternative: Manual Version Update

If you prefer to keep package.json version in sync before tagging:

```bash
# 1. Update version locally
npm version 1.2.3 --no-git-tag-version

# 2. Commit the change
git add package.json package-lock.json
git commit -m "chore: bump version to 1.2.3"

# 3. Create and push tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin main --follow-tags

# Pipeline will trigger automatically on the tag!
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

- Ensure all tests pass locally before pushing tags
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
