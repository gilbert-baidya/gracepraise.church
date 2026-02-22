#!/usr/bin/env node

/**
 * Apply Footer Mount to All Website Pages
 * Grace and Praise Bangladeshi Church
 * 
 * This script:
 * 1. Finds all HTML pages (excluding backups, tests, admin)
 * 2. Removes existing <footer> elements that might conflict
 * 3. Removes specific legacy footer chunks like "Take Your Next Step" blocks.
 * 4. Adds <div data-partial="site-footer"></div> before </body>
 * 5. Ensures footer-v3.css and footer-init.js are included
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
    /HOME_PAGE_TEST\.html/,
    /partials\//
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
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'test-results' && file !== 'playwright-report' && file !== 'partials') {
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
    return content.includes('footer-v3.css') && content.includes('footer/footer-init.js');
}

/**
 * Remove old footer HTML blocks and legacy next steps section
 */
function removeOldFooter(content) {
    // 1. Remove standard footer tag blocks
    let newContent = content.replace(/<footer[\s\S]*?<\/footer>/gi, '<!-- Old footer removed by footer-v3 migration -->');

    // 2. Remove legacy CTA blocks often found right above the footer
    // Look for generic Next Steps sections or Quick Links containers.
    const containerQuickLinksRegex = /<section[^>]*class="[^"]*(quick-links|cta-section|cta-band|next-steps-section)[^"]*"[^>]*>[\s\S]*?<\/section>/gi;
    newContent = newContent.replace(containerQuickLinksRegex, '<!-- Legacy section removed by footer-v3 migration -->');

    const divQuickLinksRegex = /<div[^>]*class="[^"]*(quick-links|cta-section|cta-band|next-steps-section)[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<(script|footer|!--|body|\/body))/gi;
    newContent = newContent.replace(divQuickLinksRegex, '<!-- Legacy section removed by footer-v3 migration -->');

    // We remove elements by matching characteristic inner strings (like Quick Links) just in case the wrapper isn't a single element.
    // However, regex replacing arbitrary HTML chunks is risky. We'll stick to removing the footer tag and elements explicitly tagged with footer classes.
    const legacyFooterDivRegex = /<div[^>]*class="[^"]*(site-footer|footer|sacred-footer)[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<\/?script|body|\/body)/gi;
    newContent = newContent.replace(legacyFooterDivRegex, '<!-- Legacy footer wrapper removed by footer-v3 migration -->');

    return newContent;
}

/**
 * Add footer mount before </body>
 */
function addFooterMount(content, relativePath) {
    if (hasNewFooterMount(content)) {
        return content;
    }

    const footerMount = `
    <!-- Site Footer (Partial Injection) -->
    <div data-partial="site-footer"></div>
`;

    return content.replace('</body>', `${footerMount}</body>`);
}

/**
 * Add CSS and JS includes
 */
function addFooterIncludes(content, relativePath) {
    let newContent = content;

    // Remove old footer-v2 css just in case
    newContent = newContent.replace(/<link[^>]*href="[^"]*footer-v2\.css"[^>]*>\s*/gi, '');

    const cssInclude = `<link rel="stylesheet" href="${relativePath}css/footer-v3.css">`;
    if (!newContent.includes('footer-v3.css')) {
        // Find </head> or end of stylesheets and insert
        newContent = newContent.replace('</head>', `    ${cssInclude}\n</head>`);
    }

    const jsInclude = `<script type="module" src="${relativePath}js/footer/footer-init.js"></script>`;
    if (!newContent.includes('footer-init.js')) {
        // Add JS module before </body> after the mount
        newContent = newContent.replace('</body>', `    ${jsInclude}\n</body>`);
    }

    return newContent;
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

        // Remove old footer first (always run this to clean up mess)
        const beforeRemove = content;
        content = removeOldFooter(content);
        if (content !== beforeRemove) {
            console.log('   🗑️  Removed old footer HTML');
        }

        // Add footer mount
        if (!hasNewFooterMount(content)) {
            content = addFooterMount(content, relativeToRoot);
            console.log('   ➕ Added footer mount point');
        }

        // Add CSS/JS includes
        const beforeIncludes = content;
        content = addFooterIncludes(content, relativeToRoot);
        if (content !== beforeIncludes) {
            console.log('   ➕ Added footer CSS/JS includes');
        }

        // Only write if content changed
        if (content !== originalContent) {
            if (DRY_RUN) {
                console.log('   [DRY RUN] Would save changes');
            } else {
                fs.writeFileSync(filePath, content, 'utf8');
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
    console.log('║  FOOTER V3 MIGRATION SCRIPT                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const htmlFiles = findHtmlFiles(ROOT_DIR);
    console.log(`\n✨ Found ${htmlFiles.length} HTML files to process\n`);

    htmlFiles.forEach(processFile);

    console.log('\n📊 SUMMARY');
    console.log(`   Processed:  ${stats.processed}`);
    console.log(`   Modified:   ${stats.modified}`);
    console.log(`   Skipped:    ${stats.skipped}`);
    console.log(`   Errors:     ${stats.errors}`);
}

main();
