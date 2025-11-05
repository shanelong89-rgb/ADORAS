#!/bin/bash

# Script to pull the correct "2.tsx" files from GitHub and replace old local files

echo "🔄 Syncing correct files from GitHub..."
echo ""
echo "⚠️  WARNING: This will REPLACE your local files with GitHub's '2.tsx' versions!"
echo ""
read -p "❓ Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "📥 Step 1: Fetching latest from GitHub..."
git fetch origin

echo ""
echo "📋 Step 2: Creating backup of current local files..."
mkdir -p .backup_old_files
cp -r components .backup_old_files/ 2>/dev/null || true
cp App.tsx .backup_old_files/ 2>/dev/null || true
cp main.tsx .backup_old_files/ 2>/dev/null || true
cp index.html .backup_old_files/ 2>/dev/null || true
cp package.json .backup_old_files/ 2>/dev/null || true
cp postcss.config.js .backup_old_files/ 2>/dev/null || true

echo "✅ Backup created in .backup_old_files/"

echo ""
echo "🔄 Step 3: Pulling all files from GitHub origin/main..."

# Pull everything from GitHub origin/main
git checkout origin/main -- .

echo ""
echo "🔄 Step 4: Finding and renaming '2.tsx' and '2.ts' files..."

# Rename all "2.tsx" files to remove the " 2"
find . -name "* 2.tsx" -o -name "* 2.ts" -o -name "* 2.html" -o -name "* 2.json" -o -name "* 2.js" -o -name "* 2.sh" | while read file; do
    # Get the new name without " 2"
    newname=$(echo "$file" | sed 's/ 2\././')
    
    echo "  📝 $file → $newname"
    
    # Move the file
    mv "$file" "$newname"
done

echo ""
echo "🗑️  Step 5: Removing old duplicate files from Git tracking..."

# Remove any remaining "2" files from Git tracking
git rm --cached "* 2.*" 2>/dev/null || true
git rm --cached "*/* 2.*" 2>/dev/null || true
git rm --cached "*/*/* 2.*" 2>/dev/null || true

echo ""
echo "📦 Step 6: Staging all changes..."
git add -A

echo ""
echo "✅ Step 7: Checking status..."
git status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Files synced from GitHub!"
echo ""
echo "📂 Your old files are backed up in: .backup_old_files/"
echo ""
echo "🚀 Next steps:"
echo "   1. Review changes: git diff --cached"
echo "   2. Commit and push:"
echo ""
echo "      git commit -m 'Sync: Replace old files with updated versions from GitHub'"
echo "      git push origin main"
echo ""
echo "   3. After successful push, GitHub will only have the correct single files"
echo "      (no more duplicates!)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
