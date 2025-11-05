#!/bin/bash

# Adoras - Sync Server Files and Deploy to Supabase
# This script syncs the server files from Figma Make to your local repo and deploys

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Adoras Backend Deployment Script${NC}"
echo ""

# Define paths
LOCAL_REPO=~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/GitHub/Adorasai
FIGMA_SERVER_PATH="supabase/functions/server"
TARGET_PATH="supabase/functions/make-server-deded1eb"

# Navigate to local repo
cd "$LOCAL_REPO"
echo -e "${YELLOW}📂 Working directory: $(pwd)${NC}"
echo ""

# Step 1: Remove old make-server-deded1eb folder if it exists
if [ -d "$TARGET_PATH" ]; then
    echo -e "${YELLOW}🗑️  Removing old deployment folder...${NC}"
    rm -rf "$TARGET_PATH"
fi

# Step 2: Create new make-server-deded1eb folder
echo -e "${YELLOW}📁 Creating deployment folder...${NC}"
mkdir -p "$TARGET_PATH"

# Step 3: Copy and rename files from server to make-server-deded1eb
echo -e "${YELLOW}📋 Copying server files...${NC}"
for file in "$FIGMA_SERVER_PATH"/*.tsx; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .tsx)
        # Copy as .ts file
        cp "$file" "$TARGET_PATH/${filename}.ts"
        echo "  ✓ Copied ${filename}.tsx -> ${filename}.ts"
    fi
done

# Step 4: Fix imports in the .ts files (change .tsx to .ts)
echo ""
echo -e "${YELLOW}🔧 Fixing import statements...${NC}"
find "$TARGET_PATH" -name "*.ts" -type f | while read file; do
    # Use sed to replace .tsx with .ts in imports
    sed -i '' "s/from '\.\//from '.\//g" "$file"
    sed -i '' "s/from \"\.\//from \"\.\//g" "$file"
    sed -i '' 's/\.tsx['"'"'";]/\.ts"/g' "$file"
    sed -i '' "s/\.tsx'/\.ts'/g" "$file"
    echo "  ✓ Fixed imports in $(basename "$file")"
done

# Step 5: Deploy to Supabase
echo ""
echo -e "${BLUE}📤 Deploying to Supabase Edge Functions...${NC}"
echo ""
supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

# Step 6: Test the deployment
echo ""
echo -e "${BLUE}🧪 Testing deployment...${NC}"
echo ""
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health)
echo "Response: $HEALTH_RESPONSE"

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo ""
    echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
    echo ""
    echo "🔗 Function URL: https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
    echo "🔍 Dashboard: https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo/functions"
    echo ""
    echo "Next steps:"
    echo "1. Commit the make-server-deded1eb folder to git"
    echo "2. Push to trigger Vercel redeployment"
    echo "3. Check your live site for the backend status"
else
    echo ""
    echo -e "${RED}⚠️  Deployment completed but health check failed${NC}"
    echo "Check the Supabase dashboard for errors"
fi
