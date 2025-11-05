#!/bin/bash

# Adoras - Simple Supabase Edge Function Deployment
# This script renames .tsx to .ts and deploys to Supabase

set -e  # Exit on error

echo "🚀 Deploying Adoras Backend to Supabase..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Rename .tsx to .ts in server folder
echo -e "${YELLOW}📝 Step 1: Converting .tsx files to .ts...${NC}"
cd supabase/functions/make-server-deded1eb

for file in *.tsx; do
  if [ -f "$file" ]; then
    base="${file%.tsx}"
    mv "$file" "${base}.ts"
    echo "  ✓ Renamed: $file -> ${base}.ts"
  fi
done

echo ""

# Step 2: Update imports
echo -e "${YELLOW}🔧 Step 2: Updating import statements...${NC}"
for file in *.ts; do
  if [ -f "$file" ]; then
    sed -i '' 's/\.tsx"/\.ts"/g' "$file"
    sed -i '' "s/\.tsx'/\.ts'/g" "$file"
    echo "  ✓ Updated: $file"
  fi
done

cd ../../..
echo ""

# Step 3: Deploy
echo -e "${YELLOW}📤 Step 3: Deploying to Supabase...${NC}"
supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🔗 Function URL: https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
echo "🔍 Dashboard: https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo/functions"
echo ""
echo "Next: Set environment secrets with:"
echo "  supabase secrets set SUPABASE_URL=https://cyaaksjydpegofrldxbo.supabase.co"
echo "  supabase secrets set SUPABASE_ANON_KEY=<your-anon-key>"
echo "  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
