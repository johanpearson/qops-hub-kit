# Release Process

This document explains how to release new versions of `@qops/hub-kit` with a **protected main branch**.

## Overview

Since the `main` branch is protected and doesn't allow direct pushes (including tags), we use an **automated tagging workflow**:

1. Developer updates version in `package.json` via PR
2. PR is reviewed and merged to `main`
3. Auto-tag pipeline detects version change and creates tag
4. Publish pipeline is triggered by the tag
5. Package is published to Azure Artifacts

## Quick Start

### Standard Release

```bash
# 1. Create release branch
git checkout -b release/v1.2.3
git pull origin main

# 2. Update version (without creating git tag)
npm version 1.2.3 --no-git-tag-version

# 3. Commit version change
git add package.json package-lock.json
git commit -m "chore: bump version to 1.2.3"

# 4. Push and create PR
git push origin release/v1.2.3

# 5. Create PR, get approval, and merge

# 6. Auto-tag pipeline will:
#    ✅ Detect version change
#    ✅ Create tag v1.2.3
#    ✅ Trigger publish pipeline
#    ✅ Publish to Azure Artifacts
```

### Including Version Bump in Feature PR

```bash
# 1. Create feature branch
git checkout -b feature/my-new-feature

# 2. Make your changes
# ... edit code ...

# 3. Before finalizing, update version
npm version patch --no-git-tag-version  # or minor, major

# 4. Commit everything including version
git add .
git commit -m "feat: add new feature"

# 5. Push and create PR
git push origin feature/my-new-feature

# After merge, automatic tagging and publishing will occur
```

## Semantic Versioning Guide

Choose the appropriate version bump based on your changes:

### Patch Release (1.0.0 → 1.0.1)

**Use for:**
- Bug fixes
- Documentation updates
- Minor internal improvements
- Security patches

**Command:**
```bash
npm version patch --no-git-tag-version
```

### Minor Release (1.0.0 → 1.1.0)

**Use for:**
- New features (backwards compatible)
- New functionality
- Enhancements to existing features
- Deprecating features (not removing)

**Command:**
```bash
npm version minor --no-git-tag-version
```

### Major Release (1.0.0 → 2.0.0)

**Use for:**
- Breaking changes
- Removing deprecated features
- Changing public APIs
- Major architectural changes

**Command:**
```bash
npm version major --no-git-tag-version
```

### Specific Version

```bash
npm version 1.2.3 --no-git-tag-version
```

## Pre-Release Checklist

Before creating your release PR, ensure:

- [ ] All tests pass locally (`npm test`)
- [ ] Code coverage is ≥ 80% (`npm run test:coverage`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation is updated if needed
- [ ] CHANGELOG or commit messages document changes
- [ ] CI pipeline passes on your branch

## Hotfix Releases

For critical bugs that need immediate release:

```bash
# 1. Create hotfix branch from main
git checkout -b hotfix/fix-critical-issue
git pull origin main

# 2. Make the fix
# ... edit code ...

# 3. Bump version (patch)
npm version patch --no-git-tag-version

# 4. Commit and push
git add .
git commit -m "fix: critical issue description"
git push origin hotfix/fix-critical-issue

# 5. Create PR to main, get expedited review

# 6. After merge, auto-tag and publish pipelines run
```

## Pipeline Architecture

### 1. CI Pipeline (`azure-pipelines-ci.yml`)

**Triggers:** PR to any branch, pushes to `main`

**Actions:**
- Install dependencies
- Type check
- Build
- Run tests with coverage
- Publish test results

### 2. Auto-Tag Pipeline (`azure-pipelines-tag.yml`)

**Triggers:** Pushes to `main` that modify `package.json`

**Actions:**
- Compare version in `package.json` to latest git tag
- If version changed, create new tag (e.g., `v1.2.3`)
- Push tag to repository

**Requirements:**
- Build service needs "Contribute" permission on repository

### 3. Publish Pipeline (`azure-pipelines-publish.yml`)

**Triggers:** Tags matching `v*.*.*` from `main` or `hotfix/*` branches

**Actions:**
- Type check
- Build
- Run tests
- Publish to Azure Artifacts feed

**Requirements:**
- Build service needs "Contributor" role on Artifacts feed

## Troubleshooting

### Auto-tag pipeline doesn't create tag

**Check:**
1. Version in `package.json` is different from latest tag
2. `package.json` was modified in the commit
3. Build service has "Contribute" permission on repository

**How to fix:**
```bash
# Check latest tag
git describe --tags --abbrev=0

# Check version in package.json
node -p "require('./package.json').version"

# Ensure they're different
```

### Publish pipeline doesn't trigger

**Check:**
1. Tag format is correct (e.g., `v1.2.3`, not `1.2.3`)
2. Tag was created from `main` or `hotfix/*` branch
3. Publish pipeline is enabled in Azure DevOps

### Version already exists in feed

**Solution:**
Create a new PR with a higher version number:
```bash
npm version patch --no-git-tag-version  # or minor, major
git add package.json package-lock.json
git commit -m "chore: bump to next version"
```

### Tests fail in pipeline

**Solution:**
1. Run tests locally: `npm test`
2. Fix any failing tests
3. Push fixes to PR branch
4. Re-run CI pipeline

## Manual Tag Creation (Emergency Only)

If you need to manually create a tag (e.g., auto-tag pipeline is broken):

**Via Azure DevOps Web UI:**
1. Navigate to Repos → Tags
2. Click "New tag"
3. Enter tag name (e.g., `v1.2.3`)
4. Select target branch (`main`)
5. Click "Create"
6. Publish pipeline will trigger automatically

**Not recommended:** Manual git tag push won't work with protected branches.

## Verifying Release

After the publish pipeline completes:

### 1. Check Azure Artifacts Feed

```bash
# View feed in Azure DevOps
# Navigate to Artifacts → Your Feed → @qops/hub-kit

# Or install the new version
npm install @qops/hub-kit@1.2.3
```

### 2. Verify Git Tags

```bash
# List tags
git tag -l

# View specific tag
git show v1.2.3
```

### 3. Check Pipeline Runs

- Navigate to Pipelines in Azure DevOps
- Verify auto-tag pipeline ran successfully
- Verify publish pipeline completed
- Check logs for any warnings

## Best Practices

1. **One version bump per release** - Don't include multiple version changes in one PR
2. **Update version last** - Make all code changes first, then bump version
3. **Descriptive commit messages** - Clearly describe what changed
4. **Test before merging** - Ensure CI passes before merge
5. **Review pipeline logs** - Check for any issues or warnings
6. **Coordinate major releases** - Communicate breaking changes to users
7. **Keep CHANGELOG updated** - Document notable changes

## FAQ

**Q: Can I push tags directly to main?**  
A: No, the main branch is protected. Use the PR workflow instead.

**Q: What if I need to re-release the same version?**  
A: You can't republish the same version. Bump to the next patch version.

**Q: How do I roll back a release?**  
A: You can't delete versions from Azure Artifacts. Release a new patch version with the fix.

**Q: Can I test the publish pipeline before releasing?**  
A: Yes, create a tag manually in Azure DevOps UI from a test branch to verify the pipeline works.

**Q: How long does the release process take?**  
A: Typically 5-10 minutes after PR merge (auto-tag + publish pipelines).

## Support

For issues with the release process:
1. Check Azure DevOps pipeline logs
2. Review troubleshooting section above
3. Contact the repository maintainers
4. Create an issue in the repository
