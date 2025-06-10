# Release Process

This document outlines the complete release process for claude-code-github to ensure consistency and completeness across all releases.

## Release Types

- **Patch (x.x.X)**: Bug fixes, minor documentation updates
- **Minor (x.X.x)**: New features, significant enhancements
- **Major (X.x.x)**: Breaking changes, major architectural changes

## Pre-Release Checklist

### 1. Code Quality
- [ ] All tests pass: `npm run test:unit`
- [ ] Linting passes: `npm run lint`
- [ ] TypeScript compilation succeeds: `npm run typecheck`
- [ ] Build succeeds: `npm run build`

### 2. Feature Completeness
- [ ] All planned features are implemented and tested
- [ ] Documentation is complete and up-to-date
- [ ] Configuration examples are provided
- [ ] Breaking changes are documented

### 3. Version Planning
- [ ] Determine release type (patch/minor/major)
- [ ] Plan version number following [Semantic Versioning](https://semver.org/)
- [ ] Review unreleased changes in CHANGELOG.md

## Release Steps

### 1. Version Bump
```bash
# Update package.json version manually or use npm version
npm version minor  # or patch/major
# OR manually edit package.json version field
```

### 2. Update Documentation

#### package.json
- [ ] Update version number
- [ ] Update description if major changes to functionality

#### README.md
- [ ] Update main description to reflect new capabilities
- [ ] Add/update feature highlights in Key Features section
- [ ] Update configuration examples with new options
- [ ] Add new usage examples for new features
- [ ] Update table of contents if new sections added

#### CHANGELOG.md
- [ ] Create new version section with current date
- [ ] Move unreleased items to appropriate categories:
  - **Added**: New features
  - **Enhanced**: Improvements to existing features
  - **Fixed**: Bug fixes
  - **Documentation**: Documentation updates
  - **Deprecated**: Features being phased out
  - **Removed**: Removed features
  - **Security**: Security improvements
- [ ] Use descriptive bullets with emojis for major features
- [ ] Include impact and benefits in descriptions

### 3. Commit Release Changes
```bash
git add package.json README.md CHANGELOG.md
git commit -m "chore: prepare release v1.x.x

- Update version to 1.x.x
- Update README with new features
- Update changelog with release notes"
```

### 4. Create and Push Release Branch (for major releases)
```bash
# For major releases, create a release branch
git checkout -b release/v1.x.x
git push origin release/v1.x.x
```

### 5. Test Build and Publish
```bash
# Build and test the package
npm run build

# Test installation locally
npm pack
npm install -g ./claude-code-github-1.x.x.tgz

# Verify the installation works
claude-code-github --help

# Clean up test installation
npm uninstall -g @jdrhyne/claude-code-github
```

### 6. Publish to NPM
```bash
# Ensure you're logged in to npm
npm whoami

# Publish the package
npm publish --access public

# Verify publication
npm view @jdrhyne/claude-code-github
```

### 7. Merge to Main (if using release branch)
```bash
git checkout main
git merge release/v1.x.x
git push origin main
```

### 8. Create GitHub Release
```bash
# Create and push git tag
git tag v1.x.x
git push origin v1.x.x

# Create GitHub release using gh CLI
gh release create v1.x.x \
  --title "v1.x.x: [Brief Release Title]" \
  --notes-file RELEASE_NOTES_v1.x.x.md \
  --latest
```

#### Release Notes Template
Create `RELEASE_NOTES_v1.x.x.md`:

```markdown
# v1.x.x: [Brief Release Title]

## 🎉 What's New

[2-3 sentence summary of major improvements]

### 🧠 [Major Feature Category]
- **[Feature Name]**: [Brief description with benefit]
- **[Feature Name]**: [Brief description with benefit]

### 🛡️ [Another Feature Category]
- **[Feature Name]**: [Brief description with benefit]

## 🚀 Getting Started

\`\`\`bash
npx @jdrhyne/claude-code-github@latest
\`\`\`

## 📖 Documentation

- [Configuration Guide](link)
- [Usage Examples](link)
- [Full Changelog](CHANGELOG.md)

## 🔄 Migration

[If applicable, include migration notes for breaking changes]

## 💬 Feedback

We'd love to hear your feedback! Please [open an issue](https://github.com/jdrhyne/claude-code-github/issues) or start a [discussion](https://github.com/jdrhyne/claude-code-github/discussions).

---

**Full Changelog**: [1.previous.x...1.x.x](https://github.com/jdrhyne/claude-code-github/compare/v1.previous.x...v1.x.x)
```

### 9. Post-Release Tasks
- [ ] Verify npm package is available: `npm view @jdrhyne/claude-code-github`
- [ ] Test installation from npm: `npx @jdrhyne/claude-code-github@latest`
- [ ] Update any external documentation or links
- [ ] Announce release on relevant channels
- [ ] Monitor for issues or user feedback

### 10. Clean Up
```bash
# Delete release branch if used
git branch -d release/v1.x.x
git push origin --delete release/v1.x.x

# Clean up local artifacts
rm *.tgz
rm RELEASE_NOTES_v1.x.x.md
```

## Emergency Hotfix Process

For critical bugs requiring immediate release:

1. Create hotfix branch from main: `git checkout -b hotfix/v1.x.y`
2. Fix the issue and add tests
3. Update CHANGELOG.md with patch notes
4. Update version in package.json
5. Follow steps 6-10 of normal release process
6. Merge hotfix back to main

## Tools and Automation

### Useful Commands
```bash
# Quick version check
npm view @jdrhyne/claude-code-github version

# List all versions
npm view @jdrhyne/claude-code-github versions --json

# Check package size
npm pack --dry-run

# Validate package before publish
npm publish --dry-run
```

### GitHub CLI Setup
```bash
# Install gh CLI
brew install gh  # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login
```

## Notes

- Always test in a clean environment before releasing
- Keep release notes user-focused (benefits, not technical details)
- Use semantic versioning strictly
- Coordinate major releases with documentation updates
- Consider backward compatibility for configuration changes