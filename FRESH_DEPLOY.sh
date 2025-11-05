#!/bin/bash

# Adoras - Fresh Deployment Script
# Deploys Adoras from Figma Make to GitHub + Vercel + Supabase

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║               ADORAS - FRESH DEPLOYMENT SCRIPT                 ║"
echo "║                                                                ║"
echo "║  This script will deploy Adoras from scratch:                  ║"
echo "║  1. Create fresh Git repo                                      ║"
echo "║  2. Copy files from Figma Make                                 ║"
echo "║  3. Create Supabase edge function structure                    ║"
echo "║  4. Push to GitHub                                             ║"
echo "║  5. Deploy to Vercel                                           ║"
echo "║  6. Deploy Supabase edge function                              ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Prompt for confirmation
read -p "$(echo -e ${YELLOW}This will create a fresh deployment. Continue? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 1: Setting up fresh deployment directory${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Create fresh directory
DEPLOY_DIR=~/Desktop/Adorasai-Fresh-$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo -e "${GREEN}✓ Created fresh directory: $DEPLOY_DIR${NC}"

# Initialize git
git init
git branch -M main
echo -e "${GREEN}✓ Initialized Git repository${NC}"

# Prompt for GitHub repo URL
echo ""
read -p "$(echo -e ${YELLOW}Enter GitHub repo URL (or press Enter for https://github.com/shanelong89-rgb/Adorasai.git): ${NC})" GITHUB_REPO
GITHUB_REPO=${GITHUB_REPO:-https://github.com/shanelong89-rgb/Adorasai.git}

git remote add origin "$GITHUB_REPO"
echo -e "${GREEN}✓ Added remote: $GITHUB_REPO${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 2: Copy files from current directory${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Get the directory where this script is located (Figma Make directory)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo -e "${YELLOW}Copying files from: $SCRIPT_DIR${NC}"
echo ""

# Copy all files except .git and node_modules
rsync -av --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.DS_Store' \
  --exclude='build' \
  --exclude='dist' \
  --exclude='.vercel' \
  --exclude='.env' \
  "$SCRIPT_DIR/" "$DEPLOY_DIR/"

echo ""
echo -e "${GREEN}✓ Files copied successfully${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 3: Create Supabase edge function structure${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Create make-server-deded1eb folder
mkdir -p supabase/functions/make-server-deded1eb

# Copy and rename files from server to make-server-deded1eb
if [ -d "supabase/functions/server" ]; then
    echo "Converting .tsx files to .ts files..."
    for file in supabase/functions/server/*.tsx; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .tsx)
            cp "$file" "supabase/functions/make-server-deded1eb/${filename}.ts"
            echo "  ✓ Copied ${filename}.tsx -> ${filename}.ts"
        fi
    done
    
    # Fix imports (change .tsx to .ts)
    echo ""
    echo "Fixing import statements..."
    find supabase/functions/make-server-deded1eb -name "*.ts" -exec sed -i '' 's/\.tsx"/\.ts"/g' {} \;
    find supabase/functions/make-server-deded1eb -name "*.ts" -exec sed -i '' "s/\.tsx'/\.ts'/g" {} \;
    
    echo -e "${GREEN}✓ Supabase edge function structure created${NC}"
else
    echo -e "${RED}⚠️  Warning: supabase/functions/server not found${NC}"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo ""
    echo "Creating .gitignore..."
    cat > .gitignore << 'EOF'
node_modules
.DS_Store
dist
build
.env
.env.local
.vercel
.vscode
*.log
EOF
    echo -e "${GREEN}✓ Created .gitignore${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 4: Commit and push to GitHub${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

git add .
git commit -m "Initial commit - Adoras app with backend

- Full PWA with offline support
- Supabase backend integration
- AI features (OpenAI + Groq)
- Multi-language support (6 languages)
- Push notifications
- Media optimization and caching
- Real-time sync"

echo ""
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push -u origin main --force

echo ""
echo -e "${GREEN}✓ Pushed to GitHub successfully${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 5: Deploy to Vercel${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Install it with: npm i -g vercel${NC}"
    exit 1
fi

echo "Deploying to Vercel..."
echo ""
vercel --prod --yes

echo ""
echo -e "${GREEN}✓ Deployed to Vercel successfully${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 6: Deploy Supabase edge function${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if supabase is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install it with: brew install supabase/tap/supabase${NC}"
    exit 1
fi

echo "Deploying Supabase edge function..."
echo ""
supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

echo ""
echo -e "${GREEN}✓ Deployed edge function successfully${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Step 7: Testing deployment${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb/health)
echo "Response: $HEALTH_RESPONSE"

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo ""
    echo -e "${GREEN}✅ Backend is responding correctly!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Backend health check returned unexpected response${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}"
echo "   ✅  DEPLOYMENT COMPLETE!"
echo -e "${NC}${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Deployment Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📁 Local Directory:${NC}"
echo "   $DEPLOY_DIR"
echo ""
echo -e "${BLUE}🔗 GitHub Repository:${NC}"
echo "   $GITHUB_REPO"
echo ""
echo -e "${BLUE}🌐 Vercel URL:${NC}"
echo "   Check Vercel dashboard for your live URL"
echo "   https://vercel.com/dashboard"
echo ""
echo -e "${BLUE}⚡ Supabase Edge Function:${NC}"
echo "   https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
echo ""
echo -e "${BLUE}📊 Dashboards:${NC}"
echo "   • Vercel: https://vercel.com/dashboard"
echo "   • Supabase: https://supabase.com/dashboard/project/cyaaksjydpegofrldxbo"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Visit your Vercel URL to test the app"
echo "2. Check that the backend banner is gone"
echo "3. Test AI features (photo analysis, voice transcription)"
echo "4. Test authentication and memory creation"
echo ""
echo -e "${YELLOW}To move this deployment to your original location:${NC}"
echo "  mv ~/Library/Mobile\\ Documents/com~apple~CloudDocs/Documents/GitHub/Adorasai ~/Desktop/Adorasai-Backup"
echo "  mv $DEPLOY_DIR ~/Library/Mobile\\ Documents/com~apple~CloudDocs/Documents/GitHub/Adorasai"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"
echo ""
