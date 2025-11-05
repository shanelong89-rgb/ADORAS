#!/bin/bash

# Script to clean up duplicate files on GitHub
# The "2.tsx" files are the updated ones we want to keep

echo "🧹 Cleaning up duplicate files..."

# Step 1: Pull all "2.tsx" files from GitHub
echo "📥 Fetching updated files from GitHub..."
git fetch origin
git checkout origin/main -- "components/*2.tsx" 2>/dev/null || true
git checkout origin/main -- "components/ui/*2.ts" 2>/dev/null || true

# Step 2: List all files with "2.tsx" or "2.ts"
echo ""
echo "📋 Found these updated files:"
find components -name "*2.tsx" -o -name "*2.ts"

# Step 3: For each "2.tsx" file, replace the old version
echo ""
echo "🔄 Replacing old files with updated versions..."

for file in $(find components -name "*2.tsx" -o -name "*2.ts"); do
    # Get the new name without the "2"
    newname=$(echo "$file" | sed 's/ 2\./\./')
    
    echo "  Replacing: $newname"
    
    # Remove old version from git
    git rm --cached "$newname" 2>/dev/null || true
    
    # Rename the "2" version to the correct name
    mv "$file" "$newname"
done

# Step 4: Stage all changes
echo ""
echo "📦 Staging changes..."
git add components/

# Step 5: Show status
echo ""
echo "✅ Cleanup complete! Status:"
git status

echo ""
echo "🚀 Next step: Run this command to commit and push:"
echo "   git commit -m 'Fix: Replace old files with updated versions'"
echo "   git push origin main"
