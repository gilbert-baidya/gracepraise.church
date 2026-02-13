/**
 * ============================================================================
 * GPBC SECURITY VALIDATORS
 * ============================================================================
 * Input validation for all external data (fail-fast pattern)
 * Defense: Validate early, fail loudly, prevent downstream corruption
 * ============================================================================
 */

// ============================================================================
// SECURITY TELEMETRY (Logging Layer)
// ============================================================================

window.SecurityTelemetry = {
    logViolation: function(type, details) {
        const timestamp = new Date().toISOString();
        console.warn(`[Security Violation] ${timestamp} - ${type}:`, details);
        
        // Future: Send to monitoring endpoint
        // fetch('/api/security-log', { method: 'POST', body: JSON.stringify({ type, details, timestamp }) });
    }
};

// ============================================================================
// SHARE FORMAT VALIDATION
// ============================================================================

const VALID_SHARE_FORMATS = ['square', 'story', 'landscape', 'portrait'];

/**
 * Validate share card format string
 * @param {string} format - Format identifier
 * @returns {string} Validated format
 * @throws {Error} If format is invalid
 */
window.validateShareFormat = function(format) {
    if (!format || typeof format !== 'string') {
        const error = `Invalid format type: ${typeof format}`;
        window.SecurityTelemetry.logViolation('INVALID_FORMAT', { format, error });
        throw new Error(error);
    }
    
    const normalized = format.toLowerCase().trim();
    
    if (!VALID_SHARE_FORMATS.includes(normalized)) {
        const error = `Invalid format: "${format}". Must be one of: ${VALID_SHARE_FORMATS.join(', ')}`;
        window.SecurityTelemetry.logViolation('INVALID_FORMAT', { format: normalized, validFormats: VALID_SHARE_FORMATS });
        throw new Error(error);
    }
    
    return normalized;
};

// ============================================================================
// DEVOTION OBJECT VALIDATION
// ============================================================================

const REQUIRED_DEVOTION_FIELDS = ['id', 'date', 'title', 'verse', 'verseText', 'devotionText'];

/**
 * Validate devotion object structure
 * @param {object} devotion - Devotion data object
 * @returns {object} Validated devotion
 * @throws {Error} If devotion is invalid
 */
window.validateDevotionObject = function(devotion) {
    if (!devotion || typeof devotion !== 'object') {
        const error = 'Devotion must be an object';
        window.SecurityTelemetry.logViolation('INVALID_DEVOTION', { devotion, error });
        throw new Error(error);
    }
    
    const missingFields = REQUIRED_DEVOTION_FIELDS.filter(field => !devotion[field]);
    
    if (missingFields.length > 0) {
        const error = `Missing required fields: ${missingFields.join(', ')}`;
        window.SecurityTelemetry.logViolation('INVALID_DEVOTION', { devotion, missingFields });
        throw new Error(error);
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(devotion.date)) {
        const error = `Invalid date format: ${devotion.date}. Expected YYYY-MM-DD`;
        window.SecurityTelemetry.logViolation('INVALID_DEVOTION', { devotion, error });
        throw new Error(error);
    }
    
    return devotion;
};

// ============================================================================
// BACKGROUND MANIFEST VALIDATION
// ============================================================================

/**
 * Validate background manifest structure
 * @param {object} manifest - Background manifest object
 * @returns {object} Validated manifest
 * @throws {Error} If manifest is invalid
 */
window.validateBackgroundManifest = function(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        const error = 'Manifest must be an object';
        window.SecurityTelemetry.logViolation('INVALID_MANIFEST', { manifest, error });
        throw new Error(error);
    }
    
    if (!Array.isArray(manifest.backgrounds)) {
        const error = 'Manifest must have backgrounds array';
        window.SecurityTelemetry.logViolation('INVALID_MANIFEST', { manifest, error });
        throw new Error(error);
    }
    
    // Validate each background entry
    manifest.backgrounds.forEach((bg, index) => {
        if (!bg.url || typeof bg.url !== 'string') {
            const error = `Background ${index} missing valid url`;
            window.SecurityTelemetry.logViolation('INVALID_MANIFEST', { manifest, index, error });
            throw new Error(error);
        }
        
        if (!bg.mood || typeof bg.mood !== 'string') {
            const error = `Background ${index} missing valid mood`;
            window.SecurityTelemetry.logViolation('INVALID_MANIFEST', { manifest, index, error });
            throw new Error(error);
        }
    });
    
    return manifest;
};

// ============================================================================
// CALENDAR EVENT VALIDATION
// ============================================================================

/**
 * Validate calendar event object
 * @param {object} event - Calendar event object
 * @returns {object} Validated event
 * @throws {Error} If event is invalid
 */
window.validateCalendarEvent = function(event) {
    if (!event || typeof event !== 'object') {
        const error = 'Event must be an object';
        window.SecurityTelemetry.logViolation('INVALID_EVENT', { event, error });
        throw new Error(error);
    }
    
    const requiredFields = ['title', 'date', 'time'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
        const error = `Missing required fields: ${missingFields.join(', ')}`;
        window.SecurityTelemetry.logViolation('INVALID_EVENT', { event, missingFields });
        throw new Error(error);
    }
    
    return event;
};

// ============================================================================
// SAFE JSON PARSING
// ============================================================================

/**
 * Safely parse JSON without throwing
 * @param {string} jsonString - JSON string to parse
 * @returns {object|null} Parsed object or null on error
 */
window.safeParse = function(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        window.SecurityTelemetry.logViolation('JSON_PARSE_ERROR', { jsonString, error: error.message });
        return null;
    }
};

// ============================================================================
// URL VALIDATION (XSS Prevention)
// ============================================================================

/**
 * Validate URL is safe (no javascript:, data:, vbscript: schemes)
 * @param {string} url - URL to validate
 * @returns {boolean} True if safe
 */
window.validateSafeURL = function(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    const dangerous = /^(javascript|data|vbscript):/i;
    
    if (dangerous.test(url.trim())) {
        window.SecurityTelemetry.logViolation('DANGEROUS_URL', { url });
        return false;
    }
    
    return true;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('[Security] Validators initialized - fail-fast validation active');
