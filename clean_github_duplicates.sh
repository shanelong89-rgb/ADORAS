#!/bin/bash

# Script to pull "2.tsx" files from GitHub, replace local, and clean up GitHub

echo "🧹 Cleaning up GitHub duplicates..."
echo ""
echo "This will:"
echo "  1. Pull all '2.tsx' files from GitHub (the correct versions)"
echo "  2. Replace your local files with them"
echo "  3. Push to GitHub to remove duplicates"
echo ""
read -p "❓ Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "📥 Step 1: Fetching all files from GitHub..."
git fetch origin main

echo ""
echo "📋 Step 2: Getting list of '2.tsx' and '2.ts' files from GitHub..."
DUPLICATE_FILES=$(git ls-tree -r origin/main --name-only | grep " 2\.\(tsx\|ts\|html\|json\|js\)$")

if [ -z "$DUPLICATE_FILES" ]; then
    echo "✅ No duplicate files found on GitHub!"
    exit 0
fi

echo "Found these duplicate files on GitHub:"
echo "$DUPLICATE_FILES"

echo ""
echo "📥 Step 3: Pulling the '2' versions from GitHub (these are the correct ones)..."

# Pull each "2" file from GitHub
echo "$DUPLICATE_FILES" | while read file; do
    echo "  Downloading: $file"
    git checkout origin/main -- "$file" 2>/dev/null || true
done

echo ""
echo "🔄 Step 4: Renaming '2' files to their correct names..."

# Find all local "2" files and rename them
find . -type f \( -name "* 2.tsx" -o -name "* 2.ts" -o -name "* 2.html" -o -name "* 2.json" -o -name "* 2.js" \) | while read file; do
    # Skip .git directory
    if [[ "$file" == *".git"* ]]; then
        continue
    fi
    
    # Get the new name without " 2"
    newname=$(echo "$file" | sed 's/ 2\././')
    
    echo "  📝 $file → $newname"
    
    # Move/rename the file
    mv "$file" "$newname"
done

echo ""
echo "📦 Step 5: Staging all changes..."
git add -A

echo ""
echo "🗑️  Step 6: Removing old '2' files from Git index..."
# This ensures Git knows to delete the "2" files from GitHub
git rm --cached "* 2.*" 2>/dev/null || true
git rm --cached "components/* 2.*" 2>/dev/null || true
git rm --cached "components/ui/* 2.*" 2>/dev/null || true
git rm --cached "utils/* 2.*" 2>/dev/null || true
git rm --cached "utils/api/* 2.*" 2>/dev/null || true

echo ""
echo "✅ Step 7: Committing changes..."
git commit -m "Clean up: Replace files with updated '2.tsx' versions and remove duplicates"

echo ""
echo "🚀 Step 8: Pushing to GitHub..."
git push origin main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! GitHub should now be clean!"
echo ""
echo "🔍 Verify on GitHub - you should only see single files now:"
echo "   https://github.com/shanelong89-rgb/ADORAS"
echo ""
echo "   ✅ AIAssistant.tsx (no duplicates)"
echo "   ✅ ChatTab.tsx (no duplicates)"
echo "   ✅ Dashboard.tsx (no duplicates)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
