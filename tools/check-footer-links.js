#!/usr/bin/env node

/**
 * Footer Links Validation Script
 * Grace and Praise Bangladeshi Church
 * 
 * Validates all internal links in FOOTER_CONFIG against actual files
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'js', 'footer', 'footer.config.js');

// Extract config by reading and parsing the JS file
function loadFooterConfig() {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    
    // Extract FOOTER_CONFIG object (simple regex approach)
    const match = configContent.match(/export const FOOTER_CONFIG = ({[\s\S]*?});/);
    if (!match) {
        throw new Error('Could not parse FOOTER_CONFIG from footer.config.js');
    }
    
    // Use eval in a safe context (only for our own config file)
    const configStr = match[1];
    const config = eval(`(${configStr})`);
    
    return config;
}

// Check if a file path exists
function checkPath(url) {
    // Skip external URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return { exists: true, external: true };
    }
    
    // Skip anchors and special URLs
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
        return { exists: true, special: true };
    }
    
    // Remove leading slash and any hash fragments
    const cleanUrl = url.replace(/^\//, '').split('#')[0];
    const filePath = path.join(ROOT_DIR, cleanUrl);
    
    return {
        exists: fs.existsSync(filePath),
        external: false,
        special: false,
        path: filePath
    };
}

// Main validation
function validateFooterLinks() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  FOOTER LINKS VALIDATOR                                      ║');
    console.log('║  Grace and Praise Bangladeshi Church                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📂 Loading config from: ${path.relative(ROOT_DIR, CONFIG_PATH)}\n`);
    
    let config;
    try {
        config = loadFooterConfig();
    } catch (error) {
        console.error(`❌ Failed to load config: ${error.message}`);
        process.exit(1);
    }
    
    const results = {
        total: 0,
        valid: 0,
        invalid: 0,
        external: 0,
        warnings: []
    };
    
    // Validate CTA links
    console.log('🔍 Validating CTA Links...');
    console.log('─'.repeat(64));
    config.cta.forEach(cta => {
        results.total++;
        const check = checkPath(cta.url);
        
        if (check.external) {
            console.log(`  ℹ️  ${cta.label}: ${cta.url} (external)`);
            results.external++;
            results.valid++;
        } else if (check.exists) {
            console.log(`  ✅ ${cta.label}: ${cta.url}`);
            results.valid++;
        } else {
            console.log(`  ❌ ${cta.label}: ${cta.url} (NOT FOUND)`);
            results.invalid++;
            results.warnings.push(`CTA "${cta.label}" links to missing file: ${cta.url}`);
        }
    });
    
    // Validate column links
    console.log('\n🔍 Validating Column Links...');
    console.log('─'.repeat(64));
    config.columns.forEach(column => {
        console.log(`\n  📁 ${column.heading}:`);
        column.links.forEach(link => {
            results.total++;
            const check = checkPath(link.url);
            
            if (check.external) {
                console.log(`    ℹ️  ${link.label}: ${link.url} (external)`);
                results.external++;
                results.valid++;
            } else if (check.special) {
                console.log(`    ℹ️  ${link.label}: ${link.url} (anchor/special)`);
                results.valid++;
            } else if (check.exists) {
                console.log(`    ✅ ${link.label}: ${link.url}`);
                results.valid++;
            } else {
                console.log(`    ❌ ${link.label}: ${link.url} (NOT FOUND)`);
                results.invalid++;
                results.warnings.push(`${column.heading} > "${link.label}" links to missing file: ${link.url}`);
            }
        });
    });
    
    // Validate social links
    console.log('\n🔍 Validating Social Links...');
    console.log('─'.repeat(64));
    config.social.forEach(social => {
        results.total++;
        console.log(`  ℹ️  ${social.platform}: ${social.url} (external)`);
        results.external++;
        results.valid++;
    });
    
    // Validate legal links
    console.log('\n🔍 Validating Legal Links...');
    console.log('─'.repeat(64));
    config.legalLinks.forEach(link => {
        results.total++;
        const check = checkPath(link.url);
        
        if (check.exists) {
            console.log(`  ✅ ${link.label}: ${link.url}`);
            results.valid++;
        } else {
            console.log(`  ❌ ${link.label}: ${link.url} (NOT FOUND)`);
            results.invalid++;
            results.warnings.push(`Legal link "${link.label}" links to missing file: ${link.url}`);
        }
    });
    
    // Summary
    console.log('\n' + '═'.repeat(64));
    console.log('📊 VALIDATION SUMMARY');
    console.log('─'.repeat(64));
    console.log(`   Total Links:      ${results.total}`);
    console.log(`   ✅ Valid:         ${results.valid}`);
    console.log(`   ❌ Invalid:       ${results.invalid}`);
    console.log(`   🌐 External:      ${results.external}`);
    console.log('═'.repeat(64));
    
    if (results.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        results.warnings.forEach(warning => {
            console.log(`   • ${warning}`);
        });
        console.log('\n💡 Fix these issues in js/footer/footer.config.js');
    }
    
    if (results.invalid > 0) {
        console.log('\n❌ Validation failed. Please fix broken links.');
        process.exit(1);
    }
    
    console.log('\n✅ All footer links are valid!');
}

// Run validation
validateFooterLinks();
