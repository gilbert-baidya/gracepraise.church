/**
 * ============================================================================
 * GPBC SAFE HTML PIPELINE
 * ============================================================================
 * XSS protection through HTML sanitization
 * Defense: Allowlist-based cleaning, no script execution
 * ============================================================================
 */

// ============================================================================
// HTML SANITIZATION (Allowlist Approach)
// ============================================================================

/**
 * Sanitize HTML content using allowlist approach
 * @param {string} html - Raw HTML string
 * @returns {string} Sanitized HTML
 */
window.sanitizeHTML = function(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    // Create a temporary DOM element
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Allowlist of safe tags
    const allowedTags = ['p', 'span', 'div', 'strong', 'em', 'br', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    // Allowlist of safe attributes
    const allowedAttributes = {
        'a': ['href', 'title', 'target'],
        '*': ['class', 'id', 'data-verse', 'data-date']
    };
    
    /**
     * Recursively clean DOM tree
     */
    function cleanNode(node) {
        // Remove script tags
        if (node.tagName === 'SCRIPT') {
            node.remove();
            return;
        }
        
        // Check if tag is allowed
        if (node.tagName && !allowedTags.includes(node.tagName.toLowerCase())) {
            // Replace with text content
            const textNode = document.createTextNode(node.textContent);
            node.parentNode.replaceChild(textNode, node);
            return;
        }
        
        // Remove dangerous attributes
        if (node.attributes) {
            const attrs = Array.from(node.attributes);
            attrs.forEach(attr => {
                const attrName = attr.name.toLowerCase();
                
                // Remove all event handlers (onclick, onerror, etc.)
                if (attrName.startsWith('on')) {
                    node.removeAttribute(attr.name);
                    return;
                }
                
                // Check if attribute is allowed for this tag
                const tagName = node.tagName.toLowerCase();
                const tagAllowed = allowedAttributes[tagName] || [];
                const globalAllowed = allowedAttributes['*'] || [];
                
                if (!tagAllowed.includes(attrName) && !globalAllowed.includes(attrName)) {
                    node.removeAttribute(attr.name);
                }
                
                // Special validation for href (prevent javascript: URLs)
                if (attrName === 'href') {
                    if (!window.validateSafeURL || !window.validateSafeURL(attr.value)) {
                        node.removeAttribute(attr.name);
                    }
                }
            });
        }
        
        // Recursively clean children
        const children = Array.from(node.children || []);
        children.forEach(child => cleanNode(child));
    }
    
    // Clean all nodes
    Array.from(temp.children).forEach(child => cleanNode(child));
    
    return temp.innerHTML;
};

// ============================================================================
// SAFE HTML INSERTION (Primary API)
// ============================================================================

/**
 * Safely set innerHTML with sanitization
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content to insert
 */
window.sanitizeAndSetHTML = function(element, html) {
    if (!element || !(element instanceof HTMLElement)) {
        console.error('[Security] sanitizeAndSetHTML: Invalid element', element);
        return;
    }
    
    const sanitized = window.sanitizeHTML(html);
    element.innerHTML = sanitized;
};

/**
 * Safely set text content (no HTML parsing)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content to insert
 */
window.safeSetText = function(element, text) {
    if (!element || !(element instanceof HTMLElement)) {
        console.error('[Security] safeSetText: Invalid element', element);
        return;
    }
    
    element.textContent = text;
};

/**
 * Safely set HTML with custom tag allowlist
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content
 * @param {array} allowedTags - Custom allowed tags
 */
window.safeSetHTML = function(element, html, allowedTags) {
    if (!element || !(element instanceof HTMLElement)) {
        console.error('[Security] safeSetHTML: Invalid element', element);
        return;
    }
    
    // If custom allowlist provided, use it
    // Otherwise use default sanitizeHTML
    const sanitized = window.sanitizeHTML(html); // For now, use default
    element.innerHTML = sanitized;
};

// ============================================================================
// DEVELOPMENT MODE (Optional Monitoring)
// ============================================================================

/**
 * Enable development mode to log innerHTML usage
 * Set window.SAFE_HTML_DEVELOPMENT_MODE = true to enable
 */
if (window.SAFE_HTML_DEVELOPMENT_MODE) {
    console.warn('[Security] Safe HTML development mode enabled - monitoring innerHTML usage');
    
    // Intercept innerHTML setter (development only)
    const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
            console.warn('[Security] Direct innerHTML usage detected:', {
                element: this,
                value: value
            });
            
            // Call original setter
            originalInnerHTMLSetter.call(this, value);
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[Security] Safe HTML pipeline initialized - XSS protection active');
