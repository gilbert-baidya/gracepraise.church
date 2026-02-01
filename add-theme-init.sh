#!/bin/bash
# Script to add theme initialization to all remaining pages

# Theme init script to add
THEME_SCRIPT='
    <!-- Theme & JS Detection — DO NOT REMOVE -->
    <script>
        (function () {
            document.documentElement.classList.add('\''js-enabled'\'');
            const savedTheme = localStorage.getItem('\''theme'\'') || '\''light'\'';
            document.documentElement.setAttribute('\''data-theme'\'', savedTheme);
            if (savedTheme === '\''dark'\'') {
                document.documentElement.classList.add('\''dark'\'');
                document.addEventListener('\''DOMContentLoaded'\'', () => {
                    document.body.setAttribute('\''data-theme'\'', '\''dark'\'');
                    document.body.classList.add('\''dark'\'');
                });
            }
        })();
    </script>
'

# List of files to process (excluding already done)
FILES="daily-devotion.html family-devotion.html fasting-21days.html fasting-30days.html fasting-40days.html gallery.html give.html gratitude-fasting.html history.html leadership.html ministries.html mission.html plan-visit.html position-papers.html prayer-request.html privacy-policy.html songbook.html terms-conditions.html testimonies.html youth-devotion.html"

for file in $FILES; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        # Find the first occurrence of <link rel="stylesheet" and add theme script before it
        awk -v theme="$THEME_SCRIPT" '
            !added && /<link rel="stylesheet"/ {
                print theme
                added=1
            }
            {print}
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        echo "✓ Added theme init to $file"
    fi
done

echo "Theme initialization complete!"
