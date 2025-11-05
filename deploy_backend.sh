#!/bin/bash

# Adoras - Backend Deployment Script
# Creates proper Supabase edge function structure and deploys it

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           ADORAS - BACKEND DEPLOYMENT SCRIPT                   ║"
echo "║                                                                ║"
echo "║  This script will:                                             ║"
echo "║  1. Create supabase/functions/make-server-deded1eb/            ║"
echo "║  2. Convert .tsx files to .ts files                            ║"
echo "║  3. Fix all import statements                                  ║"
echo "║  4. Deploy to Supabase                                         ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "supabase/functions/server" ]; then
    echo -e "${RED}❌ Error: supabase/functions/server directory not found${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo -e "${YELLOW}Install it with: brew install supabase/tap/supabase${NC}"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 1: Creating Supabase edge function structure${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Remove old make-server-deded1eb folder if it exists
if [ -d "supabase/functions/make-server-deded1eb" ]; then
    echo -e "${YELLOW}Removing old make-server-deded1eb folder...${NC}"
    rm -rf supabase/functions/make-server-deded1eb
fi

# Create make-server-deded1eb folder
mkdir -p supabase/functions/make-server-deded1eb
echo -e "${GREEN}✓ Created supabase/functions/make-server-deded1eb/${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 2: Converting .tsx files to .ts files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Copy and convert files
file_count=0
for file in supabase/functions/server/*.tsx; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .tsx)
        cp "$file" "supabase/functions/make-server-deded1eb/${filename}.ts"
        echo "  ✓ Copied ${filename}.tsx -> ${filename}.ts"
        ((file_count++))
    fi
done

echo ""
echo -e "${GREEN}✓ Converted ${file_count} files${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 3: Fixing import statements${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Fix imports - change .tsx to .ts
echo "Fixing .tsx imports to .ts..."
find supabase/functions/make-server-deded1eb -name "*.ts" -type f -exec sed -i '' 's/from "\.\/\([^"]*\)\.tsx"/from ".\/\1.ts"/g' {} \;
find supabase/functions/make-server-deded1eb -name "*.ts" -type f -exec sed -i '' "s/from '\.\/\([^']*\)\.tsx'/from '.\/\1.ts'/g" {} \;

echo -e "${GREEN}✓ Fixed import statements${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 4: Deploying to Supabase${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Deploy to Supabase
echo "Deploying edge function to Supabase..."
supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

echo ""
echo -e "${GREEN}✓ Deployed to Supabase${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 5: Testing deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Testing backend health endpoint..."
sleep 2  # Wait for deployment to be ready
HEALTH_RESPONSE=$(curl -s https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health)
echo "Response: $HEALTH_RESPONSE"

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo ""
    echo -e "${GREEN}✅ Backend is responding correctly!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Backend health check returned unexpected response${NC}"
    echo -e "${YELLOW}Check Supabase logs: https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo/logs/edge-functions${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}"
echo "   ✅  BACKEND DEPLOYMENT COMPLETE!"
echo -e "${NC}${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Deployment Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}⚡ Backend URL:${NC}"
echo "   https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
echo ""
echo -e "${BLUE}📊 Supabase Dashboard:${NC}"
echo "   https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo "   https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo/logs/edge-functions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Your backend is now live! 🚀${NC}"
echo ""
