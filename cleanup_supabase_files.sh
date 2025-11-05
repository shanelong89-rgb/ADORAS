#!/bin/bash

# Script to clean up Supabase edge function files
# This will remove duplicates and ensure proper .ts extensions

echo "🧹 Cleaning up Supabase edge function files..."
echo ""

cd supabase/functions/server

# Remove all "2.ts" duplicate files
echo "Removing duplicate files..."
rm -f *\ 2.ts
rm -f *2.ts
echo "✅ Duplicates removed"
echo ""

# Check if .tsx files exist and rename them
echo "Renaming .tsx files to .ts..."
for file in *.tsx; do
  if [ -f "$file" ]; then
    base="${file%.tsx}"
    # Remove existing .ts file if it exists to avoid conflicts
    rm -f "${base}.ts"
    # Rename .tsx to .ts
    mv "$file" "${base}.ts"
    echo "  Renamed: $file -> ${base}.ts"
  fi
done
echo "✅ All files renamed"
echo ""

# Update import statements in all .ts files
echo "Updating import statements..."
for file in *.ts; do
  if [ -f "$file" ]; then
    # Replace .tsx with .ts in import statements
    sed -i '' 's/from "\.\//from ".\//' "$file"
    sed -i '' 's/\.tsx"/\.ts"/g' "$file"
    sed -i '' "s/\.tsx'/\.ts'/g" "$file"
    echo "  Updated: $file"
  fi
done
echo "✅ Imports updated"
echo ""

# List final files
echo "📁 Final file list:"
ls -1 *.ts
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Now run:"
echo "  supabase functions deploy server"
