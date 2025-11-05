#!/bin/bash

echo "🔧 Fixing Git repository corruption..."
echo ""

# Step 1: Remove corrupted refs
echo "🗑️  Step 1: Removing corrupted references..."

# Remove the bad "HEAD 2" reference
rm -f .git/refs/remotes/origin/"HEAD 2" 2>/dev/null || true
rm -f ".git/refs/remotes/origin/HEAD 2" 2>/dev/null || true

# Remove any other refs with spaces
find .git/refs -name "* *" -type f -delete 2>/dev/null || true

# Clean up packed refs if corrupted
if [ -f .git/packed-refs ]; then
    echo "  Backing up packed-refs..."
    cp .git/packed-refs .git/packed-refs.backup
    
    # Remove lines with "HEAD 2" or other space-containing refs
    grep -v " 2$" .git/packed-refs > .git/packed-refs.tmp 2>/dev/null || true
    mv .git/packed-refs.tmp .git/packed-refs 2>/dev/null || true
fi

echo "✅ Corrupted refs removed"

# Step 2: Clean up the repository
echo ""
echo "🧹 Step 2: Cleaning up repository..."
git gc --prune=now 2>/dev/null || true
git remote prune origin 2>/dev/null || true

echo "✅ Repository cleaned"

# Step 3: Re-fetch from GitHub
echo ""
echo "📥 Step 3: Re-fetching from GitHub..."
git fetch origin --prune

echo "✅ Fetched from GitHub"

# Step 4: Reset HEAD reference
echo ""
echo "🔄 Step 4: Resetting HEAD reference..."
git remote set-head origin main

echo "✅ HEAD reference reset"

# Step 5: Verify connection
echo ""
echo "✅ Step 5: Verifying connection..."
git remote -v

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git repository repaired!"
echo ""
echo "🔍 Current branch status:"
git status

echo ""
echo "🚀 Next step: Run the sync script to get updated files from GitHub:"
echo "   ./sync_from_github.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
