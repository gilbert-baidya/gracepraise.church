#!/usr/bin/env node

/**
 * Remove Legacy Footers - World-Class Footer Fix
 * Removes old footer markup across all pages
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const stats = {
    processed: 0,
    modified: 0,
    skipped: 0
};

// Legacy footer signatures to detect and remove
const LEGACY_PATTERNS = [
    // Pattern 1: Footer with Quick Links
    /<footer[^>]*>[\s\S]*?<h3>Quick Links<\/h3>[\s\S]*?<\/footer>/gi,
    // Pattern 2: Standalone footer blocks
    /<!--\s*Footer\s*-->[\s\S]*?<footer[\s\S]*?<\/footer>/gi,
    // Pattern 3: Footer bottom with 2025
    /<div class="footer-bottom">[\s\S]*?2025[\s\S]*?<\/div>/gi
];

// Hardcoded "Take Your Next Step" blocks (not in footer partial)
const NEXT_STEP_PATTERN = /<!--\s*Take Your Next Step\s*-->[\s\S]*?<section[^>]*next-step[^>]*>[\s\S]*?<\/section>/gi;

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules' && !file.includes('backup')) {
                findHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html') && !file.includes('.bak') && !file.includes('.backup')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

function removeLegacyFooter(content) {
    let modified = false;
    let newContent = content;
    
    // Remove legacy footers
    LEGACY_PATTERNS.forEach((pattern, index) => {
        const before = newContent;
        newContent = newContent.replace(pattern, '<!-- Legacy footer removed -->');
        if (newContent !== before) {
            console.log(`    - Removed legacy footer pattern ${index + 1}`);
            modified = true;
        }
    });
    
    // Remove hardcoded "Take Your Next Step" sections (keep only in partial)
    const before = newContent;
    newContent = newContent.replace(NEXT_STEP_PATTERN, '<!-- Hardcoded Take Your Next Step removed - now in footer partial -->');
    if (newContent !== before) {
        console.log(`    - Removed hardcoded "Take Your Next Step" section`);
        modified = true;
    }
    
    return { content: newContent, modified };
}

function processFile(filePath) {
    stats.processed++;
    
    const relativePath = path.relative(ROOT_DIR, filePath);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already processed or no legacy footer
        if (!content.includes('Quick Links') && 
            !content.includes('Take Your Next Step') && 
            !content.includes('[Facebook Icon]')) {
            return;
        }
        
        console.log(`\n📄 ${relativePath}`);
        
        const result = removeLegacyFooter(content);
        
        if (result.modified) {
            if (DRY_RUN) {
                console.log(`    [DRY RUN] Would modify file`);
            } else {
                fs.writeFileSync(filePath, result.content, 'utf8');
                console.log(`    ✅ Saved`);
            }
            stats.modified++;
        } else {
            console.log(`    ⚠️  No changes needed`);
            stats.skipped++;
        }
        
    } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
    }
}

function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  REMOVE LEGACY FOOTERS - WORLD-CLASS FOOTER FIX             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE\n');
    }
    
    const htmlFiles = findHtmlFiles(ROOT_DIR);
    console.log(`Found ${htmlFiles.length} HTML files\n`);
    console.log('─'.repeat(64));
    
    htmlFiles.forEach(processFile);
    
    console.log('\n' + '═'.repeat(64));
    console.log('📊 SUMMARY');
    console.log('─'.repeat(64));
    console.log(`   Processed:  ${stats.processed}`);
    console.log(`   Modified:   ${stats.modified}`);
    console.log(`   Skipped:    ${stats.skipped}`);
    console.log('═'.repeat(64));
    
    if (DRY_RUN) {
        console.log('\n💡 Run without --dry-run to apply changes');
    } else {
        console.log('\n✅ Legacy footers removed!');
    }
}

main();
