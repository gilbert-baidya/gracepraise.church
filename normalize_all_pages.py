#!/usr/bin/env python3
"""
Global Navigation & Footer Normalization Script
Replaces all headers and footers with canonical versions from index.html/partials
"""

import os
import re
from pathlib import Path

def read_file(filepath):
    """Read file content"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    """Write file content"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_canonical_components():
    """Extract canonical header, banner, and footer from partials/index.html"""
    
    # Read partials
    header = read_file('partials/header.html')
    footer = read_file('partials/footer.html')
    
    # Extract banner from index.html
    index_content = read_file('index.html')
    banner_match = re.search(
        r'(<!-- Special Event Inline Countdown Banner -->.*?</div>\s*</div>)',
        index_content,
        re.DOTALL
    )
    banner = banner_match.group(1) if banner_match else None
    
    return header, banner, footer

def normalize_page(filepath, canonical_header, canonical_banner, canonical_footer):
    """Normalize a single HTML page"""
    
    content = read_file(filepath)
    original_content = content
    
    # STEP 1: Replace header
    # Find and replace everything from skip-link to </header>
    header_pattern = r'(<!-- Skip to main content.*?</header>)'
    if re.search(header_pattern, content, re.DOTALL):
        # For root pages - use relative paths
        if not filepath.startswith('ministries/'):
            # For root pages - convert absolute paths to relative
            header_to_use = canonical_header
            header_to_use = re.sub(r'href="/([^"]+)"', r'href="\1"', header_to_use)
        else:
            # For ministry pages - use absolute paths
            header_to_use = canonical_header
        
        content = re.sub(header_pattern, header_to_use, content, flags=re.DOTALL)
    
    # STEP 2: Add countdown banner if missing
    # Insert after </header>
    if canonical_banner and 'specialEventBanner' not in content:
        # Adjust banner paths based on page location
        if not filepath.startswith('ministries/'):
            banner_to_use = re.sub(r'href="/([^"]+)"', r'href="\1"', canonical_banner)
        else:
            banner_to_use = canonical_banner
        
        content = content.replace('</header>', '</header>\n\n    ' + banner_to_use)
    
    # STEP 3: Replace footer
    # Find and replace everything from <footer> to </footer>
    footer_pattern = r'(<footer>.*?</footer>)'
    if re.search(footer_pattern, content, re.DOTALL):
        # Adjust footer paths based on page location
        if not filepath.startswith('ministries/'):
            # For root pages - convert absolute paths to relative
            footer_to_use = re.sub(r'href="/([^"]+)"', r'href="\1"', canonical_footer)
        else:
            # For ministry pages - use absolute paths
            footer_to_use = canonical_footer
        
        content = re.sub(footer_pattern, footer_to_use, content, flags=re.DOTALL)
    
    # STEP 4: Ensure required scripts are present
    changes_made = []
    
    # Check for navigation.js
    if 'navigation.js' not in content:
        # Find closing body tag and add before it
        if '</body>' in content:
            script_tag = '    <script src="navigation.js"></script>\n' if not filepath.startswith('ministries/') else '    <script src="/navigation.js"></script>\n'
            content = content.replace('</body>', script_tag + '</body>')
            changes_made.append('Added navigation.js')
    
    # Check for countdown.js in head
    if 'countdown.js' not in content and canonical_banner:
        # Find countdown.css and add countdown.js script after it
        if 'countdown.css' in content:
            js_tag = '\n    <script src="countdown.js"></script>' if not filepath.startswith('ministries/') else '\n    <script src="/countdown.js"></script>'
            content = content.replace('countdown.css">', 'countdown.css">' + js_tag)
            changes_made.append('Added countdown.js')
        # Or add to head if countdown.css not found
        elif '</head>' in content:
            css_tag = '    <link rel="stylesheet" href="countdown.css">\n' if not filepath.startswith('ministries/') else '    <link rel="stylesheet" href="/countdown.css">\n'
            js_tag = '    <script src="countdown.js"></script>\n' if not filepath.startswith('ministries/') else '    <script src="/countdown.js"></script>\n'
            content = content.replace('</head>', css_tag + js_tag + '</head>')
            changes_made.append('Added countdown.css and countdown.js')
    
    # Only write if changes were made
    if content != original_content:
        write_file(filepath, content)
        return True, changes_made
    
    return False, []

def main():
    """Main execution"""
    print("=" * 80)
    print(" GLOBAL NAVIGATION & FOOTER NORMALIZATION")
    print("=" * 80)
    print()
    
    # Extract canonical components
    print("📋 Extracting canonical components...")
    canonical_header, canonical_banner, canonical_footer = extract_canonical_components()
    print(f"  ✅ Header: {len(canonical_header)} chars")
    print(f"  ✅ Banner: {len(canonical_banner)} chars")
    print(f"  ✅ Footer: {len(canonical_footer)} chars")
    print()
    
    # Define pages to normalize
    root_pages = [
        'about.html', 'beliefs.html', 'calendar.html', 'children-devotion.html',
        'core-values.html', 'couples-devotion.html', 'daily-devotion.html',
        'family-devotion.html', 'fasting-21days.html', 'fasting-30days.html',
        'fasting-40days.html', 'gallery.html', 'give.html', 'gratitude-fasting.html',
        'history.html', 'leadership.html', 'ministries.html', 'mission.html',
        'position-papers.html', 'prayer-request.html', 'songbook.html',
        'testimonies.html', 'youth-devotion.html'
    ]
    
    ministry_pages = [
        'ministries/bible-study.html', 'ministries/community-development.html',
        'ministries/homeless-ministry.html', 'ministries/hospital-ministry.html',
        'ministries/kids-ministry.html', 'ministries/men-fellowship.html',
        'ministries/mission-outreach.html', 'ministries/prison-ministry.html',
        'ministries/support-missionaries.html', 'ministries/worship-ministry.html',
        'ministries/youth-ministry.html'
    ]
    
    all_pages = root_pages + ministry_pages
    
    print(f"🔧 Processing {len(all_pages)} pages...")
    print()
    
    updated_count = 0
    skipped_count = 0
    
    for page in all_pages:
        if not os.path.exists(page):
            print(f"  ⚠️  {page} - File not found, skipping")
            skipped_count += 1
            continue
        
        updated, changes = normalize_page(page, canonical_header, canonical_banner, canonical_footer)
        
        if updated:
            changes_str = ', '.join(changes) if changes else 'Header/Footer normalized'
            print(f"  ✅ {page} - {changes_str}")
            updated_count += 1
        else:
            print(f"  ⏭️  {page} - Already normalized")
            skipped_count += 1
    
    print()
    print("=" * 80)
    print(f" COMPLETE!")
    print(f" Updated: {updated_count} | Already normalized: {skipped_count}")
    print("=" * 80)

if __name__ == '__main__':
    main()
