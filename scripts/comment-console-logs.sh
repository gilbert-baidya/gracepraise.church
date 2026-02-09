#!/bin/bash
# Script to comment out console.log statements in JavaScript files for production
# Preserves them for potential debugging with comments

# Function to comment out console.log in a JS file
comment_console_logs() {
    local file=$1
    echo "Processing: $file"
    
    # Comment out console.log statements (not already commented)
    sed -i.bak -E '
        /\/\//! {
            s/([ \t]*)(console\.log\(.*\);?)/\1\/\/ \2 \/\/ Removed for production/g
        }
    ' "$file"
    
    echo "✓ Completed: $file"
}

# Process all JavaScript files
for file in *.js; do
    if [ -f "$file" ]; then
        comment_console_logs "$file"
    fi
done

echo ""
echo "✅ Console.log statements commented out!"
echo "Backup files created with .bak extension"
echo ""
echo "To verify, run:"
echo "grep -c '// console.log' *.js"
