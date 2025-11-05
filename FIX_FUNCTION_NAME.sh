#!/bin/bash

# Fix Supabase Function Name
# This script renames the function folder from "server" to "make-server-deded1eb"

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🔧 Fixing Supabase Function Name${NC}"
echo ""

# Check if old folder exists
if [ ! -d "supabase/functions/server" ]; then
  echo -e "${RED}❌ Error: supabase/functions/server folder not found${NC}"
  echo "Current directory: $(pwd)"
  echo "Contents of supabase/functions/:"
  ls -la supabase/functions/ || echo "supabase/functions/ not found"
  exit 1
fi

# Check if new folder already exists
if [ -d "supabase/functions/make-server-deded1eb" ]; then
  echo -e "${YELLOW}⚠️  Warning: make-server-deded1eb folder already exists${NC}"
  echo "Do you want to replace it? (y/n)"
  read -r response
  if [[ "$response" != "y" ]]; then
    echo "Aborted"
    exit 0
  fi
  rm -rf supabase/functions/make-server-deded1eb
fi

# Rename the folder
echo -e "${YELLOW}📁 Renaming folder: server → make-server-deded1eb${NC}"
mv supabase/functions/server supabase/functions/make-server-deded1eb

echo -e "${GREEN}✅ Folder renamed successfully${NC}"
echo ""

# List the contents to verify
echo -e "${BLUE}📂 New folder contents:${NC}"
ls -la supabase/functions/make-server-deded1eb/

echo ""
echo -e "${GREEN}✅ Function name fixed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy the function:"
echo "   ${BLUE}supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo${NC}"
echo ""
echo "2. Or use the deploy script:"
echo "   ${BLUE}./sync_and_deploy.sh${NC}"
echo ""
