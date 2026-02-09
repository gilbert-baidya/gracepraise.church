#!/bin/bash
# Script to add lazy loading to images in HTML files
# Excludes hero images and logos (which need eager loading)

# Function to add lazy loading to an image tag
add_lazy_loading() {
    local file=$1
    echo "Processing: $file"
    
    # Add loading="lazy" to images that don't have loading attribute
    # Skip images that are heroes or logos
    sed -i.bak -E '
        /<img[^>]*class="[^"]*hero[^"]*"/! {
            /<img[^>]*class="[^"]*logo[^"]*"/! {
                /<img[^>]*loading=/! {
                    s/<img/<img loading="lazy"/g
                }
            }
        }
    ' "$file"
    
    echo "✓ Completed: $file"
}

# Process all HTML files
for file in *.html; do
    if [ -f "$file" ]; then
        add_lazy_loading "$file"
    fi
done

echo ""
echo "✅ Lazy loading added to all images!"
echo "Backup files created with .bak extension"
echo ""
echo "To verify, run:"
echo "grep -c 'loading=\"lazy\"' *.html"
