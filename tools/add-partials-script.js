#!/usr/bin/env node

/**
 * Add partials.js script to all HTML pages
 * This ensures the footer partial injection works
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Files to exclude
const EXCLUDE_PATTERNS = [
    /\.bak/,
    /\.backup/,
    /TEST/i,
    /test-/,
    /node_modules/,
    /.git/,
    /admin\/index\.html/
];

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'test-results') {
                findHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html')) {
            const relativePath = path.relative(ROOT_DIR, filePath);
            const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath));
            
            if (!shouldExclude) {
                fileList.push(filePath);
            }
        }
    });
    
    return fileList;
}

function getRelativePathToRoot(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const depth = relativePath.split(path.sep).length - 1;
    return depth > 0 ? '../'.repeat(depth) : './';
}

function addPartialsScript(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const relativePath = getRelativePathToRoot(filePath);
    
    // Check if already has partials.js
    if (content.includes('partials.js')) {
        console.log(`✓ ${path.relative(ROOT_DIR, filePath)} - already has partials.js`);
        return false;
    }
    
    // Add before </head>
    const partialsScript = `    <script src="${relativePath}js/partials.js"></script>\n`;
    content = content.replace('</head>', `${partialsScript}</head>`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(ROOT_DIR, filePath)} - added partials.js`);
    return true;
}

function main() {
    console.log('Adding partials.js to all HTML pages...\n');
    
    const htmlFiles = findHtmlFiles(ROOT_DIR);
    let modified = 0;
    
    htmlFiles.forEach(file => {
        if (addPartialsScript(file)) {
            modified++;
        }
    });
    
    console.log(`\n✅ Done! Modified ${modified} files.`);
}

main();
