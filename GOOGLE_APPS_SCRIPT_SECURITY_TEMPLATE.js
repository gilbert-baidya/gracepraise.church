/**
 * Google Apps Script Security Template
 * =====================================
 * Production-grade security implementation for Google Apps Script web app endpoint
 * that generates social share images for gracepraise.church ministry platform.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this entire file to your Google Apps Script project
 * 2. Update SECURITY_CONFIG with your values
 * 3. Deploy as web app with "Execute as: Me" and "Who has access: Anyone"
 * 4. Update your website's share-generator.js with the deployment URL
 * 
 * @version 1.0.0
 * @date 2026-02-13
 */

/**
 * ============================================================================
 * SECURITY CONFIGURATION
 * ============================================================================
 */
const SECURITY_CONFIG = {
  // Allowed origins (CORS)
  ALLOWED_ORIGINS: [
    'https://gracepraise.church',
    'https://www.gracepraise.church',
    'https://gracepraise.netlify.app'
    // Add staging/preview URLs as needed
  ],
  
  // Shared secret for request signature (MUST MATCH CLIENT-SIDE)
  // IMPORTANT: Generate a strong random secret and keep it secure
  SHARED_SECRET: 'YOUR_SECURE_SECRET_HERE_CHANGE_THIS_IN_PRODUCTION',
  
  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 500,
    CLEANUP_INTERVAL_HOURS: 1
  },
  
  // Request validation
  MAX_REQUEST_AGE_MS: 5 * 60 * 1000, // 5 minutes
  MAX_CONTENT_LENGTH: 5000, // characters
  
  // Content validation
  ALLOWED_FONTS: ['Poppins', 'Playfair Display', 'Inter', 'Arial', 'sans-serif'],
  MAX_IMAGE_DIMENSION: 2000,
  
  // Feature flags
  FEATURES: {
    REQUIRE_SIGNATURE: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_TIMESTAMP_VALIDATION: true,
    LOG_REQUESTS: true
  }
};

/**
 * ============================================================================
 * RATE LIMITING SYSTEM
 * ============================================================================
 */
class RateLimiter {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.MINUTE_KEY_PREFIX = 'rate_min_';
    this.HOUR_KEY_PREFIX = 'rate_hour_';
  }
  
  /**
   * Check if request should be allowed
   */
  checkLimit(identifier) {
    const now = Date.now();
    const minuteKey = this.MINUTE_KEY_PREFIX + identifier + '_' + Math.floor(now / 60000);
    const hourKey = this.HOUR_KEY_PREFIX + identifier + '_' + Math.floor(now / 3600000);
    
    // Get current counts
    const minuteCount = parseInt(this.cache.get(minuteKey) || '0');
    const hourCount = parseInt(this.cache.get(hourKey) || '0');
    
    // Check limits
    if (minuteCount >= SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        reason: 'rate_limit_minute',
        retryAfter: 60 - (Math.floor(now / 1000) % 60)
      };
    }
    
    if (hourCount >= SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'rate_limit_hour',
        retryAfter: 3600 - (Math.floor(now / 1000) % 3600)
      };
    }
    
    // Increment counters
    this.cache.put(minuteKey, (minuteCount + 1).toString(), 60);
    this.cache.put(hourKey, (hourCount + 1).toString(), 3600);
    
    return {
      allowed: true,
      remaining: {
        minute: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE - minuteCount - 1,
        hour: SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_HOUR - hourCount - 1
      }
    };
  }
}

/**
 * ============================================================================
 * REQUEST VALIDATION
 * ============================================================================
 */
class RequestValidator {
  
  /**
   * Validate CORS origin
   */
  static validateOrigin(origin) {
    if (!origin) {
      return { valid: false, reason: 'No origin header' };
    }
    
    const isAllowed = SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin);
    
    return {
      valid: isAllowed,
      reason: isAllowed ? 'Valid origin' : 'Origin not in allowlist',
      origin: origin
    };
  }
  
  /**
   * Validate request signature
   */
  static validateSignature(payload, signature, timestamp) {
    if (!SECURITY_CONFIG.FEATURES.REQUIRE_SIGNATURE) {
      return { valid: true, reason: 'Signature validation disabled' };
    }
    
    if (!signature) {
      return { valid: false, reason: 'No signature provided' };
    }
    
    if (!timestamp) {
      return { valid: false, reason: 'No timestamp provided' };
    }
    
    // Reconstruct the signature
    const message = JSON.stringify(payload) + timestamp;
    const expectedSignature = this.generateSignature(message);
    
    const isValid = signature === expectedSignature;
    
    return {
      valid: isValid,
      reason: isValid ? 'Valid signature' : 'Invalid signature'
    };
  }
  
  /**
   * Generate HMAC-SHA256 signature
   */
  static generateSignature(message) {
    const signature = Utilities.computeHmacSha256Signature(
      message,
      SECURITY_CONFIG.SHARED_SECRET
    );
    return Utilities.base64Encode(signature);
  }
  
  /**
   * Validate timestamp
   */
  static validateTimestamp(timestamp) {
    if (!SECURITY_CONFIG.FEATURES.ENABLE_TIMESTAMP_VALIDATION) {
      return { valid: true, reason: 'Timestamp validation disabled' };
    }
    
    if (!timestamp) {
      return { valid: false, reason: 'No timestamp provided' };
    }
    
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const age = now - requestTime;
    
    if (isNaN(requestTime)) {
      return { valid: false, reason: 'Invalid timestamp format' };
    }
    
    if (age < 0) {
      return { valid: false, reason: 'Timestamp in the future' };
    }
    
    if (age > SECURITY_CONFIG.MAX_REQUEST_AGE_MS) {
      return {
        valid: false,
        reason: 'Request too old',
        age: age,
        maxAge: SECURITY_CONFIG.MAX_REQUEST_AGE_MS
      };
    }
    
    return { valid: true, reason: 'Valid timestamp', age: age };
  }
  
  /**
   * Validate content payload
   */
  static validateContent(content) {
    const errors = [];
    
    // Check required fields
    if (!content.type || typeof content.type !== 'string') {
      errors.push('Invalid or missing type');
    }
    
    if (!content.data || typeof content.data !== 'object') {
      errors.push('Invalid or missing data');
    }
    
    // Check content length
    const contentStr = JSON.stringify(content);
    if (contentStr.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
      errors.push(`Content too large: ${contentStr.length} > ${SECURITY_CONFIG.MAX_CONTENT_LENGTH}`);
    }
    
    // Validate text content
    if (content.data.title) {
      this.validateText(content.data.title, 'title', errors);
    }
    if (content.data.verse) {
      this.validateText(content.data.verse, 'verse', errors);
    }
    if (content.data.description) {
      this.validateText(content.data.description, 'description', errors);
    }
    
    // Validate dimensions
    if (content.data.width && content.data.width > SECURITY_CONFIG.MAX_IMAGE_DIMENSION) {
      errors.push(`Width too large: ${content.data.width}`);
    }
    if (content.data.height && content.data.height > SECURITY_CONFIG.MAX_IMAGE_DIMENSION) {
      errors.push(`Height too large: ${content.data.height}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Validate text for XSS and injection
   */
  static validateText(text, fieldName, errors) {
    // Check for script tags
    if (/<script/i.test(text)) {
      errors.push(`${fieldName} contains script tag`);
    }
    
    // Check for event handlers
    if (/on\w+\s*=/i.test(text)) {
      errors.push(`${fieldName} contains event handler`);
    }
    
    // Check for javascript: protocol
    if (/javascript:/i.test(text)) {
      errors.push(`${fieldName} contains javascript protocol`);
    }
    
    // Check for data: URLs with base64
    if (/data:.*base64/i.test(text)) {
      errors.push(`${fieldName} contains data URL`);
    }
  }
}

/**
 * ============================================================================
 * LOGGING SYSTEM
 * ============================================================================
 */
class SecurityLogger {
  static log(level, category, message, context = {}) {
    if (!SECURITY_CONFIG.FEATURES.LOG_REQUESTS) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      category: category,
      message: message,
      context: context
    };
    
    // Log to Apps Script console
    Logger.log(JSON.stringify(logEntry));
    
    // For critical errors, could send to external monitoring
    if (level === 'ERROR') {
      // TODO: Integrate with external error tracking if needed
    }
  }
}

/**
 * ============================================================================
 * MAIN REQUEST HANDLER
 * ============================================================================
 */

/**
 * Handle POST requests
 */
function doPost(e) {
  const startTime = Date.now();
  let origin = null;
  
  try {
    // Get origin from headers
    origin = e.parameter.origin || e.headers?.origin || e.headers?.Origin;
    
    SecurityLogger.log('INFO', 'REQUEST', 'Received request', {
      origin: origin,
      contentLength: e.postData?.length
    });
    
    // 1. VALIDATE ORIGIN (CORS)
    const originCheck = RequestValidator.validateOrigin(origin);
    if (!originCheck.valid) {
      SecurityLogger.log('WARN', 'CORS', 'Invalid origin', originCheck);
      return createErrorResponse('Invalid origin', 403, origin);
    }
    
    // 2. RATE LIMITING
    if (SECURITY_CONFIG.FEATURES.ENABLE_RATE_LIMITING) {
      const rateLimiter = new RateLimiter();
      const rateCheck = rateLimiter.checkLimit(origin);
      
      if (!rateCheck.allowed) {
        SecurityLogger.log('WARN', 'RATE_LIMIT', 'Rate limit exceeded', rateCheck);
        return createErrorResponse(
          'Rate limit exceeded',
          429,
          origin,
          { 'Retry-After': rateCheck.retryAfter }
        );
      }
    }
    
    // 3. PARSE REQUEST BODY
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (parseError) {
      SecurityLogger.log('ERROR', 'PARSE', 'Failed to parse request', {
        error: parseError.message
      });
      return createErrorResponse('Invalid JSON', 400, origin);
    }
    
    // 4. VALIDATE TIMESTAMP
    const timestampCheck = RequestValidator.validateTimestamp(requestData.timestamp);
    if (!timestampCheck.valid) {
      SecurityLogger.log('WARN', 'TIMESTAMP', 'Invalid timestamp', timestampCheck);
      return createErrorResponse('Invalid or expired timestamp', 400, origin);
    }
    
    // 5. VALIDATE SIGNATURE
    const signatureCheck = RequestValidator.validateSignature(
      requestData.content,
      requestData.signature,
      requestData.timestamp
    );
    if (!signatureCheck.valid) {
      SecurityLogger.log('WARN', 'SIGNATURE', 'Invalid signature', signatureCheck);
      return createErrorResponse('Invalid request signature', 403, origin);
    }
    
    // 6. VALIDATE CONTENT
    const contentCheck = RequestValidator.validateContent(requestData.content);
    if (!contentCheck.valid) {
      SecurityLogger.log('WARN', 'CONTENT', 'Invalid content', contentCheck);
      return createErrorResponse(
        'Invalid content: ' + contentCheck.errors.join(', '),
        400,
        origin
      );
    }
    
    // 7. GENERATE IMAGE
    const imageResult = generateShareImage(requestData.content);
    
    const duration = Date.now() - startTime;
    SecurityLogger.log('INFO', 'SUCCESS', 'Request completed', {
      duration: duration,
      imageSize: imageResult.blob?.getBytes().length
    });
    
    // 8. RETURN SUCCESS RESPONSE
    return createSuccessResponse(imageResult, origin);
    
  } catch (error) {
    SecurityLogger.log('ERROR', 'EXCEPTION', 'Unhandled exception', {
      error: error.message,
      stack: error.stack
    });
    return createErrorResponse('Internal server error', 500, origin);
  }
}

/**
 * Generate share image (placeholder - implement actual image generation)
 */
function generateShareImage(content) {
  // TODO: Implement actual image generation logic
  // This is where you'd create the canvas, render text, etc.
  
  // Placeholder response
  return {
    success: true,
    imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    width: 1200,
    height: 630,
    format: 'png'
  };
}

/**
 * Create error response with CORS headers
 */
function createErrorResponse(message, statusCode, origin, additionalHeaders = {}) {
  const response = {
    error: true,
    message: message,
    statusCode: statusCode,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', origin || '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .setHeader('X-Frame-Options', 'DENY');
}

/**
 * Create success response with CORS headers
 */
function createSuccessResponse(data, origin) {
  const response = {
    success: true,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', origin || '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .setHeader('X-Frame-Options', 'DENY')
    .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    .setHeader('Pragma', 'no-cache');
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function doOptions(e) {
  const origin = e.parameter.origin || e.headers?.origin || e.headers?.Origin;
  
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', origin || '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Test endpoint security (for debugging)
 */
function testSecurity() {
  Logger.log('=== Security Configuration Test ===');
  Logger.log('Allowed Origins: ' + SECURITY_CONFIG.ALLOWED_ORIGINS.join(', '));
  Logger.log('Signature Required: ' + SECURITY_CONFIG.FEATURES.REQUIRE_SIGNATURE);
  Logger.log('Rate Limiting: ' + SECURITY_CONFIG.FEATURES.ENABLE_RATE_LIMITING);
  Logger.log('Timestamp Validation: ' + SECURITY_CONFIG.FEATURES.ENABLE_TIMESTAMP_VALIDATION);
  
  // Test signature generation
  const testMessage = '{"test":"data"}' + Date.now();
  const testSignature = RequestValidator.generateSignature(testMessage);
  Logger.log('Test Signature: ' + testSignature);
  
  Logger.log('=== Test Complete ===');
}
