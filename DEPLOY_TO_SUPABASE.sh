#!/bin/bash

# Simple Supabase Deployment Script for Adoras
# This script will rename files and deploy

echo "🚀 Adoras - Supabase Edge Function Deployment"
echo "=============================================="
echo ""

# Step 1: Rename .tsx to .ts
echo "Step 1: Renaming .tsx files to .ts..."
cd supabase/functions/make-server-deded1eb

# Rename each file
for file in *.tsx; do
    if [ -f "$file" ]; then
        newfile="${file%.tsx}.ts"
        mv "$file" "$newfile"
        echo "  ✓ $file -> $newfile"
    fi
done

# Step 2: Fix imports
echo ""
echo "Step 2: Fixing import statements..."
for file in *.ts; do
    if [ -f "$file" ]; then
        sed -i '' 's/\.tsx"/\.ts"/g' "$file"
        sed -i '' "s/\.tsx'/\.ts'/g" "$file"
        echo "  ✓ Updated imports in $file"
    fi
done

# Go back to root
cd ../../..

echo ""
echo "Step 3: Deploying to Supabase..."
echo ""

supabase functions deploy make-server-deded1eb --project-ref cyaaksjydpegofrldxbo

echo ""
echo "=============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=============================================="
echo ""
echo "📍 Your function is now live at:"
echo "   https://cyaaksjydpegofrldxbo.supabase.co/functions/v1/make-server-deded1eb"
echo ""
echo "🔧 Next Steps:"
echo ""
echo "If your app uses AI features, set these secrets:"
echo ""
echo "  supabase secrets set OPENAI_API_KEY=your_openai_key_here"
echo "  supabase secrets set GROQ_API_KEY=your_groq_key_here"
echo "  supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key_here"
echo ""
echo "Note: SUPABASE_* variables are automatically provided by Supabase!"
echo ""
