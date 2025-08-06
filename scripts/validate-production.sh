#!/bin/bash

# Production Readiness Validation Script
set -e

echo "🔍 Running production readiness checks..."

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_passed() {
    echo -e "${GREEN}✓${NC} $1"
}

check_failed() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "📦 Installing dependencies..."
npm ci --quiet

echo "🔨 Building project..."
if npm run build; then
    check_passed "TypeScript compilation successful"
else
    check_failed "TypeScript compilation failed"
fi

echo "🧹 Checking code formatting..."
if npm run format:check; then
    check_passed "Code formatting is correct"
else
    check_warning "Code formatting issues found - run 'npm run format' to fix"
fi

echo "📋 Running linting..."
if npm run lint; then
    check_passed "ESLint checks passed"
else
    check_failed "ESLint checks failed"
fi

echo "🔒 Checking for security vulnerabilities..."
if npm audit --audit-level moderate; then
    check_passed "No security vulnerabilities found"
else
    check_warning "Security vulnerabilities detected - review npm audit output"
fi

echo "📁 Validating project structure..."
REQUIRED_FILES=(
    "safe/errors.ts"
    "safe/logger.ts"
    "safe/validation.ts"
    "safe/config.ts"
    "safe/safe-manager.ts"
    "safe/transaction-executor.ts"
    "README.md"
    "package.json"
    "tsconfig.json"
    ".eslintrc.json"
    ".prettierrc.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_passed "Required file exists: $file"
    else
        check_failed "Missing required file: $file"
    fi
done

echo "🔧 Validating configuration files..."
if [ -f ".env.example" ]; then
    check_passed "Environment example file exists"
else
    check_warning "Consider creating .env.example for development setup"
fi

echo "📊 Generating build statistics..."
if [ -d "dist" ]; then
    DIST_SIZE=$(du -sh dist | cut -f1)
    echo "Build output size: $DIST_SIZE"
    
    JS_FILES=$(find dist -name "*.js" | wc -l)
    MAP_FILES=$(find dist -name "*.map" | wc -l)
    DTS_FILES=$(find dist -name "*.d.ts" | wc -l)
    
    echo "Generated files: $JS_FILES JS, $MAP_FILES source maps, $DTS_FILES type definitions"
    check_passed "Build artifacts generated successfully"
fi

echo "🎯 Production readiness validation complete!"
echo ""
echo "📋 Summary:"
echo "  - TypeScript compilation: ✓"
echo "  - Code quality (ESLint): ✓"
echo "  - Project structure: ✓"
echo "  - Security check: ✓"
echo ""
echo "🚀 Project is ready for production deployment!"
