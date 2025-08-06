#!/bin/bash

# Release script for GitHub Action
# Usage: ./scripts/release.sh <version>

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Version is required"
    echo "Usage: $0 <version>"
    echo "Example: $0 v1.2.3"
    exit 1
fi

# Validate version format
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Invalid version format. Use vX.Y.Z (e.g., v1.2.3)"
    exit 1
fi

echo "🚀 Preparing release $VERSION"

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Must be on main branch to release. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# Check if working directory is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Run tests
echo "🧪 Running tests..."
npm test

# Run linting
echo "🧹 Running linter..."
npm run lint

# Run type checking
echo "🔍 Type checking..."
npm run typecheck

# Build the action
echo "🏗️ Building action..."
npm run build

# Verify action files exist
if [ ! -f "dist/action/main.js" ]; then
    echo "❌ Build failed - dist/action/main.js not found"
    exit 1
fi

# Update package.json version
echo "📝 Updating package.json version..."
npm version $VERSION --no-git-tag-version

# Add built files to git
git add -A

# Commit changes
echo "💾 Committing release changes..."
git commit -m "Release $VERSION

- Update package.json version
- Build action for release
- Generated dist files for GitHub Action"

# Create and push tag
echo "🏷️ Creating tag $VERSION..."
git tag -a $VERSION -m "Release $VERSION"

# Push changes and tag
echo "📤 Pushing changes and tag..."
git push origin main
git push origin $VERSION

# Create/update major version tag (e.g., v1)
MAJOR_VERSION=$(echo $VERSION | cut -d. -f1)
echo "🔄 Updating major version tag $MAJOR_VERSION..."

# Delete existing major version tag locally and remotely
git tag -d $MAJOR_VERSION 2>/dev/null || true
git push --delete origin $MAJOR_VERSION 2>/dev/null || true

# Create new major version tag
git tag -a $MAJOR_VERSION -m "Release $MAJOR_VERSION (latest: $VERSION)"
git push origin $MAJOR_VERSION

echo "✅ Release $VERSION completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Go to GitHub and create a release from tag $VERSION"
echo "2. Add release notes describing changes"
echo "3. Users can now reference this action with:"
echo "   - uses: gfournieriExec/multisig-automate-proposer@$VERSION"
echo "   - uses: gfournieriExec/multisig-automate-proposer@$MAJOR_VERSION"
echo "   - uses: gfournieriExec/multisig-automate-proposer@main"
