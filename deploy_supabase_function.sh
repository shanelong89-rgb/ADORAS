#!/bin/bash

# Adoras - Deploy Supabase Edge Function
# This script deploys the server to Supabase Edge Functions

set -e  # Exit on error

echo "🚀 Deploying Adoras Backend to Supabase..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

# Navigate to the local Git repo
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/GitHub/Adorasai

echo -e "${YELLOW}📂 Working directory: $(pwd)${NC}"
echo ""

# Check if make-server-deded1eb folder exists
if [ ! -d "supabase/functions/make-server-deded1eb" ]; then
    echo -e "${YELLOW}⚠️  make-server-deded1eb folder not found. Creating it...${NC}"
    
    # Create the directory
    mkdir -p supabase/functions/make-server-deded1eb
    
    # Copy and rename files from server to make-server-deded1eb
    for file in supabase/functions/server/*.tsx; do
        filename=$(basename "$file" .tsx)
        cp "$file" "supabase/functions/make-server-deded1eb/${filename}.ts"
        echo "  ✓ Copied $filename.tsx -> ${filename}.ts"
    done
    
    # Fix imports in the new .ts files to use .tsx extensions
    find supabase/functions/make-server-deded1eb -name "*.ts" -type f -exec sed -i '' 's/from "\.\/\(.*\)\.tsx"/from ".\/\1.ts"/g' {} \;
    
    echo -e "${GREEN}✓ Created make-server-deded1eb folder${NC}"
    echo ""
fi

# Deploy the function
echo -e "${YELLOW}📤 Deploying to Supabase...${NC}"
supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🔗 Function URL: https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
echo "🔍 Dashboard: https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo/functions"
echo ""
echo "Test the health endpoint:"
echo "curl https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health"
