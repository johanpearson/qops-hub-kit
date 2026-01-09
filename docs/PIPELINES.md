# Azure Pipelines

This repository includes two Azure Pipeline configurations for CI/CD automation using a **trunk-based workflow**.

## Branching Strategy

This project follows a **trunk-based development** workflow:

- Create feature, bugfix, or hotfix branches from `main`
- Merge changes back to `main` via pull requests
- Release from `main` branch using manual tag creation
- No separate `develop` or `release` branches

## Protected Branch Workflow

Since the `main` branch is protected, tags cannot be pushed directly via `git push --follow-tags`. Instead, create tags manually through the Azure DevOps UI:

1. Update version in `package.json` via PR and merge to `main`
2. Navigate to Azure DevOps → Repos → Tags
3. Click "New tag"
4. Enter tag name (e.g., `v1.2.3`)
5. Select `main` branch as the target
6. Click "Create"
7. Publish pipeline triggers automatically

---

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

With the **protected main branch**, publishing is done through pull requests and manual tag creation:

**Standard Release Process**

```bash
# 1. Create a feature/release branch
git checkout -b release/v1.2.3
git pull --ff-only origin main

# 2. Update version in package.json (no git tag needed)
npm version 1.2.3 --no-git-tag-version
# This updates package.json and package-lock.json

# 3. Commit the version change
git add package.json package-lock.json
git commit -m "chore: bump version to 1.2.3"

# 4. Push branch and create PR
git push origin release/v1.2.3

# 5. Get PR approved and merge to main

# 6. Create tag via Azure DevOps UI:
#    a. Navigate to Azure DevOps → Repos → Tags
#    b. Click "New tag"
#    c. Enter tag name: v1.2.3
#    d. Select branch: main
#    e. Click "Create"
#
# 7. Publish pipeline triggers automatically and publishes the package
```

**Alternative: Update version directly in feature PR**

```bash
# 1. Create feature branch for your changes
git checkout -b feature/my-feature

# 2. Make your code changes
# ... edit files ...

# 3. Before finalizing PR, update version
npm version patch --no-git-tag-version  # or minor, or major

# 4. Commit all changes including version bump
git add .
git commit -m "feat: add new feature and bump version"

# 5. Push and create PR
git push origin feature/my-feature

# 6. After PR is merged, create tag via Azure DevOps UI (see steps above)
```

**For hotfix releases:**

```bash
# Same process but from hotfix branch
git checkout -b hotfix/fix-critical-bug

# Make fixes and bump version
npm version patch --no-git-tag-version
git add .
git commit -m "fix: critical bug fix"

# Create PR to main
git push origin hotfix/fix-critical-bug

# After merge, create tag via Azure DevOps UI
```

**Version examples:**

- `1.0.1` - Patch release (bug fixes)
- `1.1.0` - Minor release (new features)
- `2.0.0` - Major release (breaking changes)

✅ **Key Benefits:**

- Simple and straightforward process
- Works with protected branches
- Full control over when to release
- No additional pipeline setup required

### After Publishing

The new version will be available in your Azure Artifacts feed:

```bash
npm install @qops/hub-kit@latest
```

### What Happens Behind the Scenes

1. **PR Merged** → Version change in `package.json` lands on `main`
2. **Manual Tag Creation** → Create tag (e.g., `v1.2.3`) via Azure DevOps UI
3. **Publish Pipeline** → Triggered by new tag, builds and publishes package
4. **Done** → New version available in Azure Artifacts feed

---

## Pipeline Variables

### CI Pipeline

- `nodeVersion`: Node.js version to use (default: 18.x)

### Publish Pipeline

- `nodeVersion`: Node.js version to use (default: 18.x)
- `artifactFeedName`: Your Azure Artifacts feed name (must be configured)

---

## Troubleshooting

### Tag Creation Issues

**Cannot push tags with git:**

- This is expected with protected branches
- Use Azure DevOps UI to create tags instead (Repos → Tags → New tag)

**Publish pipeline doesn't trigger:**

- Verify tag format matches `v*.*.*` pattern (e.g., `v1.2.3`, not `1.2.3`)
- Ensure tag was created from `main` or `hotfix/*` branch
- Check that publish pipeline is enabled in Azure DevOps

### Tests Fail

- Ensure all tests pass locally before merging PR
- Check test output in the pipeline logs
- Coverage must be ≥80% for all metrics

### Publish Fails - Permission Denied

- Verify Build Service has Contributor role on Artifacts feed (for publish pipeline)
- Check Azure DevOps pipeline logs for specific error messages

### Version Already Exists

- The version in package.json already exists in the feed
- Select a higher version bump (e.g., minor instead of patch)
- Update version in package.json through a new PR

---

## Best Practices

1. **Version bump in PR** - Always update version in `package.json` as part of your PR
2. **Run CI before merging** - Ensure CI pipeline passes before merging to main
3. **Use semantic versioning** - Choose the right version bump:
   - patch: Bug fixes, documentation updates
   - minor: New features, backwards compatible
   - major: Breaking changes
4. **Test locally** - Run `npm run build && npm test` before creating PR
5. **Review changes** - Ensure CI passes and get PR approval before merging
6. **Create tag after merge** - Use Azure DevOps UI to create tags from main
7. **Update changelog** - Document changes in commits or CHANGELOG.md

---

## Additional Resources

- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [Azure Artifacts Documentation](https://docs.microsoft.com/en-us/azure/devops/artifacts/)
- [Semantic Versioning](https://semver.org/)
