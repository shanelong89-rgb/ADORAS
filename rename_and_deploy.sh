#!/bin/bash

# Navigate to project directory
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Documents/GitHub/Adorasai

echo "📁 Current directory: $(pwd)"
echo ""

# Check if server folder exists
if [ ! -d "supabase/functions/server" ]; then
  echo "❌ ERROR: supabase/functions/server folder not found!"
  echo "   Looking in: $(pwd)/supabase/functions/"
  ls -la supabase/functions/ 2>/dev/null || echo "   Folder doesn't exist"
  exit 1
fi

echo "✅ Found supabase/functions/server folder"
echo ""

# Step 1: Rename folder
echo "📦 Renaming folder: server → make-server-deded1eb"
mv supabase/functions/server supabase/functions/make-server-deded1eb

# Verify folder rename
if [ -d "supabase/functions/make-server-deded1eb" ]; then
  echo "✅ Folder renamed successfully"
else
  echo "❌ ERROR: Failed to rename folder"
  exit 1
fi
echo ""

# Step 2: Rename all .tsx files to .ts
echo "📝 Renaming all .tsx files to .ts"
cd supabase/functions/make-server-deded1eb

for file in *.tsx; do
  if [ -f "$file" ]; then
    newname="${file%.tsx}.ts"
    mv "$file" "$newname"
    echo "   ✓ $file → $newname"
  fi
done

echo ""
echo "✅ All files renamed"
echo ""

# Step 3: Update imports in all .ts files
echo "🔧 Updating imports from .tsx to .ts"
for file in *.ts; do
  if [ -f "$file" ]; then
    # Replace .tsx with .ts in import statements
    sed -i '' 's/from "\.\//from ".\//' "$file"
    sed -i '' 's/\.tsx"/\.ts"/' "$file"
    echo "   ✓ Updated imports in $file"
  fi
done

echo ""
echo "✅ All imports updated"
echo ""

# Go back to project root
cd ../../..

# Step 4: Verify structure
echo "📋 Verifying new structure:"
ls -la supabase/functions/make-server-deded1eb/ | head -15
echo ""

# Step 5: Deploy to Supabase
echo "🚀 Deploying to Supabase..."
supabase functions deploy make-server-deded1eb

# Check if deployment succeeded
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ DEPLOYMENT SUCCESSFUL!"
  echo ""
  
  # Step 6: Commit to Git
  echo "📤 Committing to Git..."
  git add .
  git commit -m "Rename edge function folder and fix file extensions for deployment"
  git push origin main
  
  echo ""
  echo "🎉 ALL DONE!"
  echo ""
  echo "Next steps:"
  echo "1. Visit https://adorasai.vercel.app"
  echo "2. Refresh the page"
  echo "3. The 'Backend Deployment Required' banner should be GONE!"
  echo ""
else
  echo ""
  echo "❌ DEPLOYMENT FAILED"
  echo "Check the error messages above"
  exit 1
fi
