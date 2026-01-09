# Azure Pipelines

This repository includes three Azure Pipeline configurations for CI/CD automation using a **trunk-based workflow**.

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

## Release Pipeline - Create Release Branch (Manual)

**File:** `azure-pipelines-release.yml`

### Purpose

Provides a simple manual way to create release branches with automatic version bumping. This pipeline allows you to select the version type (patch, minor, or major) and creates a release branch from main with the updated version.

### What it does

1. ✅ Prompts for version type selection (patch, minor, or major)
2. ✅ Checks out main branch
3. ✅ Bumps version in package.json and package-lock.json using `npm version`
4. ✅ Creates a release branch named `release/<version>`
5. ✅ Commits the version changes
6. ✅ Pushes the release branch to remote
7. ✅ Displays summary with next steps

### Triggers

- **Manual only** - Must be triggered manually from Azure DevOps UI
- **No automatic triggers** - Not triggered by commits or tags

### Setup

#### 1. Set up Pipeline in Azure DevOps

1. Navigate to Azure DevOps → Pipelines → Create Pipeline
2. Select your repository
3. Choose "Existing Azure Pipelines YAML file"
4. Select `/azure-pipelines-release.yml`
5. Save

#### 2. Configure Permissions

The pipeline needs permission to push branches to the repository.

**Enable branch push:**

1. Go to Project Settings → Repositories → Your Repository → Security
2. Find "Build Service" account (e.g., `[Project Name] Build Service`)
3. Set "Contribute" to "Allow"
4. Set "Create branch" to "Allow"

### How to Use

1. Navigate to Azure DevOps → Pipelines
2. Find "Create Release Branch" pipeline
3. Click "Run pipeline"
4. Select version bump type from dropdown:
   - **patch**: For bug fixes (1.0.0 → 1.0.1)
   - **minor**: For new features (1.0.0 → 1.1.0)
   - **major**: For breaking changes (1.0.0 → 2.0.0)
5. Click "Run"

The pipeline will:
- Create a release branch like `release/1.0.1`
- Update package.json and package-lock.json with the new version
- Push the branch to remote

### Next Steps After Release Branch Creation

Once the release branch is created, you can:

1. **Review the changes** in the release branch
2. **Create a PR** if you want to review before publishing
3. **Tag the release branch** to trigger the publish pipeline:
   ```bash
   git checkout release/1.0.1
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```
4. **Merge back to main** after successful publish (optional but recommended)

### Example Workflow

```bash
# Option 1: Use the manual pipeline (recommended)
# 1. Trigger "Create Release Branch" pipeline in Azure DevOps UI
# 2. Select "patch", "minor", or "major"
# 3. Wait for completion
# 4. Tag the release branch to publish:
git fetch
git checkout release/1.0.1
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

# Option 2: Create release branch manually (alternative)
git checkout main
git pull
git checkout -b release/1.0.1
npm version 1.0.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to 1.0.1"
git push origin release/1.0.1
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

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

Publishing is simple with git tags from `main` or `hotfix/*` branch:

**Option 1: Using npm version (recommended)**

```bash
# From main branch (standard release)
git checkout main
git pull

# Update version and create tag automatically
npm version patch  # or minor, or major
# This updates package.json and creates a git tag

# Push both commit and tag
git push --follow-tags

# Pipeline will automatically:
# - Validate branch is main or hotfix/*
# - Run type checking
# - Build and test the code
# - Publish to Azure Artifacts
```

**Option 2: Manual tag creation**

```bash
# From main branch
git checkout main
git pull

# Manually create tag
git tag -a v1.0.1 -m "Release v1.0.1"

# Push just the tag
git push origin v1.0.1

# Pipeline triggers automatically
```

**For hotfix releases:**

```bash
# From hotfix branch (emergency fixes)
git checkout hotfix/fix-critical-bug
git pull

# Create version and tag
npm version patch
git push --follow-tags

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

### Release Pipeline

- `nodeVersion`: Node.js version to use (default: 18.x)
- `versionType`: Parameter selected when running the pipeline (patch, minor, or major)

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

1. **Use the Release Pipeline for version management** - The manual release pipeline ensures version consistency
2. **Always run CI before publishing** - Ensure CI pipeline passes on your branch first
3. **Use semantic versioning** - Choose the right version bump:
   - patch: Bug fixes, documentation updates
   - minor: New features, backwards compatible
   - major: Breaking changes
4. **Review changes** - Check what's being published before triggering the pipeline
5. **Test locally** - Run `npm run build && npm test` before creating releases
6. **Update changelog** - Document changes in commits or CHANGELOG.md
7. **Merge release branches back to main** - Keep main branch in sync with published versions

---

## Additional Resources

- [Azure Pipelines Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/)
- [Azure Artifacts Documentation](https://docs.microsoft.com/en-us/azure/devops/artifacts/)
- [Semantic Versioning](https://semver.org/)
