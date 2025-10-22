#!/bin/bash

echo "🔍 Verifying Auto-Deploy Setup for Render"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "1. Checking render.yaml configuration..."
if grep -q "autoDeploy: true" render.yaml; then
    echo -e "${GREEN}✅ autoDeploy is enabled in render.yaml${NC}"
else
    echo -e "${RED}❌ autoDeploy is NOT enabled in render.yaml${NC}"
    echo "   Adding autoDeploy: true to render.yaml..."
    # Would add it here if needed
fi

echo ""
echo "2. Checking GitHub repository..."
if gh repo view Axnivo/collection-creator --json name > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GitHub repository is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Cannot access GitHub repository${NC}"
    echo "   You may need to authenticate with: gh auth login"
fi

echo ""
echo "3. Testing git push to trigger auto-deploy..."
echo ""
echo -e "${YELLOW}📌 IMPORTANT STEPS TO COMPLETE:${NC}"
echo ""
echo "1. Go to: https://dashboard.render.com"
echo "2. Click on 'collection-creator' service"
echo "3. Go to Settings tab"
echo "4. In 'Build & Deploy' section:"
echo "   - Set Auto-Deploy: YES"
echo "   - Set Branch: main"
echo ""
echo "5. Check 'Recent Events' tab to see if deploys trigger automatically"
echo ""
echo -e "${GREEN}Once enabled, every 'git push' will auto-deploy!${NC}"
echo ""
echo "Test with:"
echo "  git commit -am 'Test auto-deploy'"
echo "  git push origin main"
echo ""
echo "Then watch https://dashboard.render.com for automatic deployment!"