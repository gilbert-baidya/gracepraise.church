#!/usr/bin/env node

/**
 * Apply Footer Mount to All Website Pages
 * Grace and Praise Bangladeshi Church
 * 
 * This script:
 * 1. Finds all HTML pages (excluding backups, tests, admin)
 * 2. Removes existing <footer> elements that might conflict
 * 3. Adds <div data-partial="site-footer"></div> before </body>
 * 4. Ensures footer-v2.css and footer-init.js are included
 * 5. Creates a backup before modifying each file
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
    /\.bak$/,
    /\.backup$/,
    /\.old$/,
    /-backup\./,
    /-old\./,
    /TEMPLATE/,
    /TEST/i,
    /test-/,
    /node_modules/,
    /.git/,
    /admin\/index\.html/,
    /test-dashboard\.html/,
    /test-connection\.html/,
    /test-lent-calendar\.html/,
    /DEVOTION_TEST\.html/,
    /HOME_PAGE_TEST\.html/
];

// Stats tracking
const stats = {
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: 0
};

/**
 * Find all HTML files recursively
 */
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip certain directories
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'test-results' && file !== 'playwright-report') {
                findHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html')) {
            // Check if file should be excluded
            const relativePath = path.relative(ROOT_DIR, filePath);
            const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath));
            
            if (!shouldExclude) {
                fileList.push(filePath);
            }
        }
    });
    
    return fileList;
}

/**
 * Calculate relative path from HTML file to root
 */
function getRelativePathToRoot(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const depth = relativePath.split(path.sep).length - 1;
    return depth > 0 ? '../'.repeat(depth) : './';
}

/**
 * Check if file already has the new footer mount
 */
function hasNewFooterMount(content) {
    return content.includes('data-partial="site-footer"');
}

/**
 * Check if file has footer CSS/JS includes
 */
function hasFooterIncludes(content) {
    return content.includes('footer-v2.css') && content.includes('footer/footer-init.js');
}

/**
 * Remove old footer HTML blocks
 */
function removeOldFooter(content) {
    // Remove <footer> elements (but be conservative - only if they look like old footers)
    const footerRegex = /<footer\s+class="sacred-footer"[\s\S]*?<\/footer>/gi;
    return content.replace(footerRegex, '<!-- Old footer removed by footer-v2 migration -->');
}

/**
 * Add footer mount before </body>
 */
function addFooterMount(content, relativePath) {
    if (hasNewFooterMount(content)) {
        return content; // Already has it
    }
    
    const footerMount = `
    <!-- Site Footer (Partial Injection) -->
    <div data-partial="site-footer"></div>
`;
    
    return content.replace('</body>', `${footerMount}\n</body>`);
}

/**
 * Add CSS and JS includes to <head> if missing
 */
function addFooterIncludes(content, relativePath) {
    if (hasFooterIncludes(content)) {
        return content; // Already has includes
    }
    
    // Find a good place to insert CSS (after other stylesheets)
    const cssInclude = `    <link rel="stylesheet" href="${relativePath}css/footer-v2.css">`;
    
    // Find </head> and insert CSS before it
    if (!content.includes('footer-v2.css')) {
        content = content.replace('</head>', `${cssInclude}\n</head>`);
    }
    
    // Add JS module before </body>
    const jsInclude = `    <script type="module" src="${relativePath}js/footer/footer-init.js"></script>`;
    
    if (!content.includes('footer-init.js')) {
        content = content.replace('</body>', `${jsInclude}\n</body>`);
    }
    
    return content;
}

/**
 * Process a single HTML file
 */
function processFile(filePath) {
    stats.processed++;
    
    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`\n📄 Processing: ${relativePath}`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        const relativeToRoot = getRelativePathToRoot(filePath);
        
        // Check if already has new footer
        if (hasNewFooterMount(content)) {
            console.log('   ✓ Already has new footer mount');
            stats.skipped++;
            return;
        }
        
        // Remove old footer
        const beforeRemove = content;
        content = removeOldFooter(content);
        if (content !== beforeRemove) {
            console.log('   🗑️  Removed old footer HTML');
        }
        
        // Add footer mount
        content = addFooterMount(content, relativeToRoot);
        console.log('   ➕ Added footer mount point');
        
        // Add CSS/JS includes
        content = addFooterIncludes(content, relativeToRoot);
        console.log('   ➕ Added footer CSS/JS includes');
        
        // Only write if content changed
        if (content !== originalContent) {
            if (DRY_RUN) {
                console.log('   [DRY RUN] Would save changes');
            } else {
                // Create backup
                const backupPath = filePath + '.backup-footer-v2';
                fs.writeFileSync(backupPath, originalContent, 'utf8');
                
                // Write modified content
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('   ✅ Saved (backup created)');
            }
            stats.modified++;
        } else {
            console.log('   ⚠️  No changes needed');
            stats.skipped++;
        }
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        stats.errors++;
    }
}

/**
 * Main execution
 */
function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  FOOTER V2 MIGRATION SCRIPT                                  ║');
    console.log('║  Grace and Praise Bangladeshi Church                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }
    
    console.log(`📂 Searching for HTML files in: ${ROOT_DIR}`);
    
    const htmlFiles = findHtmlFiles(ROOT_DIR);
    console.log(`\n✨ Found ${htmlFiles.length} HTML files to process\n`);
    console.log('─'.repeat(64));
    
    htmlFiles.forEach(processFile);
    
    console.log('\n' + '═'.repeat(64));
    console.log('📊 SUMMARY');
    console.log('─'.repeat(64));
    console.log(`   Processed:  ${stats.processed}`);
    console.log(`   Modified:   ${stats.modified}`);
    console.log(`   Skipped:    ${stats.skipped}`);
    console.log(`   Errors:     ${stats.errors}`);
    console.log('═'.repeat(64));
    
    if (stats.errors > 0) {
        console.log('\n⚠️  Some files encountered errors. Please review above.');
        process.exit(1);
    }
    
    if (DRY_RUN) {
        console.log('\n💡 Run without --dry-run to apply changes');
    } else {
        console.log('\n✅ Footer migration complete!');
        console.log('\n📝 Next steps:');
        console.log('   1. Test locally: python3 -m http.server');
        console.log('   2. Check a few pages: /, /prayer-request.html, /daily-devotion.html');
        console.log('   3. Commit changes: git add . && git commit -m "feat: apply footer-v2 to all pages"');
    }
}

// Run the script
main();
