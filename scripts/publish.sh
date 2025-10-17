#!/bin/bash

# Code Context Notes - Publishing Script
# Publishes to both VSCode Marketplace and Open VSX Registry

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check required tokens
if [ -z "$VSCE_PAT" ]; then
    echo -e "${RED}Error: VSCE_PAT not found in .env${NC}"
    exit 1
fi

if [ -z "$OVSX_PAT" ]; then
    echo -e "${RED}Error: OVSX_PAT not found in .env${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Publishing Code Context Notes Extension${NC}"
echo -e "${BLUE}==========================================${NC}"

# Get extension details from package.json
EXTENSION_NAME=$(node -p "require('./package.json').name")
PUBLISHER=$(node -p "require('./package.json').publisher")
VERSION=$(node -p "require('./package.json').version")
DISPLAY_NAME=$(node -p "require('./package.json').displayName")

echo -e "${YELLOW}Extension: ${DISPLAY_NAME}${NC}"
echo -e "${YELLOW}Publisher: ${PUBLISHER}${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo ""

# Step 1: Clean and compile
echo -e "${BLUE}📦 Step 1: Building extension...${NC}"
npm run compile
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 2: Run tests
echo -e "${BLUE}🧪 Step 2: Running tests...${NC}"
npm run test:unit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Tests passed${NC}"
echo ""

# Step 3: Package extension
echo -e "${BLUE}📦 Step 3: Packaging extension...${NC}"
vsce package --no-git-tag-version
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Packaging failed${NC}"
    exit 1
fi
PACKAGE_FILE="${EXTENSION_NAME}-${VERSION}.vsix"
echo -e "${GREEN}✅ Package created: ${PACKAGE_FILE}${NC}"
echo ""

# Step 4: Install ovsx if not present
echo -e "${BLUE}🔧 Step 4: Checking ovsx CLI...${NC}"
if ! command -v ovsx &> /dev/null; then
    echo -e "${YELLOW}Installing ovsx CLI...${NC}"
    npm install -g ovsx
fi
echo -e "${GREEN}✅ ovsx CLI ready${NC}"
echo ""

# Step 5: Publish to VSCode Marketplace
echo -e "${BLUE}🏪 Step 5: Publishing to VSCode Marketplace...${NC}"
echo "$VSCE_PAT" | vsce login $PUBLISHER
vsce publish --pat "$VSCE_PAT"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Published to VSCode Marketplace${NC}"
    VSCODE_URL="https://marketplace.visualstudio.com/items?itemName=${PUBLISHER}.${EXTENSION_NAME}"
    echo -e "${GREEN}📍 VSCode Marketplace URL: ${VSCODE_URL}${NC}"
else
    echo -e "${RED}❌ VSCode Marketplace publication failed${NC}"
    exit 1
fi
echo ""

# Step 6: Publish to Open VSX Registry
echo -e "${BLUE}🌐 Step 6: Publishing to Open VSX Registry...${NC}"
ovsx publish "$PACKAGE_FILE" --pat "$OVSX_PAT"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Published to Open VSX Registry${NC}"
    OPENVSX_URL="https://open-vsx.org/extension/${PUBLISHER}/${EXTENSION_NAME}"
    echo -e "${GREEN}📍 Open VSX URL: ${OPENVSX_URL}${NC}"
else
    echo -e "${RED}❌ Open VSX Registry publication failed${NC}"
    exit 1
fi
echo ""

# Step 7: Create Git tag
echo -e "${BLUE}🏷️  Step 7: Creating Git tag...${NC}"
git tag "v${VERSION}"
git push origin "v${VERSION}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git tag v${VERSION} created and pushed${NC}"
else
    echo -e "${YELLOW}⚠️  Git tag creation failed (non-critical)${NC}"
fi
echo ""

# Success summary
echo -e "${GREEN}🎉 PUBLICATION SUCCESSFUL! 🎉${NC}"
echo -e "${GREEN}=========================${NC}"
echo -e "${GREEN}Extension: ${DISPLAY_NAME} v${VERSION}${NC}"
echo ""
echo -e "${GREEN}📍 VSCode Marketplace:${NC}"
echo -e "${BLUE}   ${VSCODE_URL}${NC}"
echo ""
echo -e "${GREEN}📍 Open VSX Registry:${NC}"
echo -e "${BLUE}   ${OPENVSX_URL}${NC}"
echo ""
echo -e "${GREEN}📦 Package file: ${PACKAGE_FILE}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Verify extensions appear in both marketplaces"
echo -e "2. Test installation from both sources"
echo -e "3. Create GitHub release with changelog"
echo -e "4. Announce on social media"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"