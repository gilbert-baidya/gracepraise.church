# Security Testing Checklist - gracepraise.church Share Feature
## Comprehensive 10-Phase Test Plan | 50+ Security Validations

**Project:** gracepraise.church Ministry Platform  
**Feature:** Social Share Image Generator  
**Date Created:** February 13, 2026  
**Last Updated:** February 13, 2026  
**Test Owner:** Security & QA Team  

---

## Executive Summary

This comprehensive security testing checklist covers all aspects of the share feature security hardening, including ready contract validation, XSS prevention, input sanitization, runtime guards, HTTP security headers, first-click prevention, cross-browser compatibility, performance benchmarks, Apps Script security, and regression prevention.

**Total Test Cases:** 52  
**Critical Tests:** 15  
**High Priority Tests:** 20  
**Medium Priority Tests:** 17  

---

## Testing Environment Setup

### Prerequisites
- [ ] Local development environment running
- [ ] Netlify preview deployment available
- [ ] Google Apps Script endpoint deployed
- [ ] Browser DevTools configured
- [ ] Network throttling tools ready
- [ ] Test data prepared

### Test Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Test Accounts
- [ ] Standard user account
- [ ] Admin account (if applicable)
- [ ] Rate-limited test account

---

## Phase 1: Ready Contract Validation (8 Tests)

### 1.1 Promise Resolution
- [ ] **CRITICAL** `window.GPBC_SHARE_READY` promise exists on page load
- [ ] Promise resolves within 5 seconds on normal network
- [ ] Promise resolves within 10 seconds on slow 3G
- [ ] Promise rejection handled gracefully if timeout occurs

**Test Command:**
```javascript
// In browser console
window.GPBC_SHARE_READY.then(result => {
  console.log('✓ Ready contract resolved:', result);
}).catch(error => {
  console.error('✗ Ready contract failed:', error);
});
```

### 1.2 Subsystem Registration
- [ ] ShareGenerator subsystem registered correctly
- [ ] DOMPurify subsystem registered correctly
- [ ] SecurityGuard subsystem registered correctly
- [ ] All required subsystems shown as ready in status

**Test Command:**
```javascript
// Check registration status
const status = window.getShareReadyStatus();
console.log('Subsystems:', status.subsystems);
```

### 1.3 Backward Compatibility
- [ ] **CRITICAL** `window.__SHARE_GENERATOR_READY__` flag set after promise resolves
- [ ] Legacy code paths work with new ready contract
- [ ] Old initialization code doesn't break new system

---

## Phase 2: XSS Prevention (7 Tests)

### 2.1 Script Injection Attempts
- [ ] **CRITICAL** `<script>alert('XSS')</script>` in devotion title blocked
- [ ] `<img src=x onerror=alert(1)>` in verse text sanitized
- [ ] `javascript:alert(1)` in URL parameters blocked
- [ ] `<iframe>` tags in description stripped

**Test Payloads:**
```javascript
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  'javascript:alert(1)',
  '<iframe src="evil.com">',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<body onload=alert(1)>'
];

// Test each payload through share generator
xssPayloads.forEach(payload => {
  ShareGenerator.openShareModal({ title: payload });
  // Verify no script execution
});
```

### 2.2 Event Handler Injection
- [ ] `onload=` attributes stripped from user content
- [ ] `onerror=` attributes removed
- [ ] `onclick=` handlers not allowed in text content

### 2.3 HTML Entity Encoding
- [ ] Angle brackets `<>` properly encoded
- [ ] Quotes `"'` handled safely
- [ ] Ampersands `&` encoded correctly

---

## Phase 3: Input Validation (6 Tests)

### 3.1 Content Length Limits
- [ ] **HIGH** Title limited to reasonable length (e.g., 200 chars)
- [ ] Verse text limited to prevent abuse (e.g., 2000 chars)
- [ ] Description length capped (e.g., 500 chars)

**Test Command:**
```javascript
// Test with oversized content
const longTitle = 'A'.repeat(5000);
ShareGenerator.generateShareImage({
  type: 'devotion',
  data: { title: longTitle }
});
// Should be rejected or truncated
```

### 3.2 Special Character Handling
- [ ] Unicode characters (emojis) handled correctly
- [ ] Line breaks `\n` processed safely
- [ ] Tab characters sanitized
- [ ] Non-printable characters stripped

### 3.3 Required Field Validation
- [ ] Missing devotion type rejected
- [ ] Missing date rejected with clear error message

---

## Phase 4: Runtime Guard Verification (8 Tests)

### 4.1 API Verification
- [ ] **CRITICAL** `verifyShareAPIsCallable()` returns true when ready
- [ ] Function detects missing ShareGenerator
- [ ] Function detects missing DOMPurify
- [ ] Error messages logged to SecurityTelemetry

**Test Command:**
```javascript
// Test API verification
const apiCheck = window.verifyShareAPIsCallable();
console.log('API Check:', apiCheck);
// Should show all APIs present and functional
```

### 4.2 DOM Verification
- [ ] `verifyShareDOMReady()` validates required elements exist
- [ ] Function checks for share buttons
- [ ] Function verifies document ready state
- [ ] Missing elements reported clearly

### 4.3 Button Guard Installation
- [ ] **CRITICAL** `guardShareButton()` wraps click handlers
- [ ] Guarded buttons run security checks before share
- [ ] Failed checks prevent share modal from opening
- [ ] User receives clear error messages on failure

### 4.4 Auto-Guard Functionality
- [ ] All `.share-button` elements auto-guarded on page load
- [ ] All `[data-share-action]` elements guarded
- [ ] Manual guard calls work correctly

---

## Phase 5: Netlify Security Headers (5 Tests)

### 5.1 Content Security Policy
- [ ] **CRITICAL** CSP header present in HTTP response
- [ ] `script-src` only allows trusted sources
- [ ] `img-src` includes necessary domains (data:, blob:)
- [ ] `style-src` configured appropriately

**Test Command:**
```bash
# Check headers
curl -I https://gracepraise.church/ | grep -i "content-security-policy"
```

### 5.2 Additional Security Headers
- [ ] **CRITICAL** `X-Frame-Options: DENY` present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Referrer-Policy` set appropriately
- [ ] `Permissions-Policy` configured

**Expected Headers:**
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline';
```

---

## Phase 6: First-Click Prevention (4 Tests)

### 6.1 Button State Management
- [ ] **HIGH** Share buttons disabled until ready contract resolves
- [ ] Buttons show loading/disabled state visually
- [ ] Button state changes when systems ready
- [ ] Rapid clicking prevented

**Test Command:**
```javascript
// Test button state before ready
document.querySelectorAll('.share-button').forEach(btn => {
  console.log('Button disabled:', btn.disabled);
  // Should be true initially
});
```

### 6.2 Click Event Handling
- [ ] First click before ready shows appropriate message
- [ ] Subsequent clicks after ready work normally
- [ ] Double-click protection active

### 6.3 User Feedback
- [ ] Loading indicator shown while initializing
- [ ] Clear message if initialization fails
- [ ] Error messages are user-friendly

---

## Phase 7: Cross-Browser Compatibility (6 Tests)

### 7.1 Desktop Browsers
- [ ] **HIGH** Chrome: All features work correctly
- [ ] Firefox: Share modal renders properly
- [ ] Safari: Ready contract resolves correctly
- [ ] Edge: Image generation successful

### 7.2 Mobile Browsers
- [ ] **HIGH** Mobile Safari: Touch events work
- [ ] Chrome Mobile: Share API integration works
- [ ] Mobile viewport rendering correct

### 7.3 Browser Console Tests
Run in each browser:
```javascript
// Comprehensive browser test
console.log('Browser:', navigator.userAgent);
console.log('GPBC_SHARE_READY:', typeof window.GPBC_SHARE_READY);
console.log('SecurityGuard:', typeof window.SECURITY_GUARD_LOADED);
console.log('DOMPurify:', typeof window.DOMPurify);

window.GPBC_SHARE_READY.then(() => {
  console.log('✓ Ready contract resolved in this browser');
  const apiCheck = verifyShareAPIsCallable();
  const domCheck = verifyShareDOMReady();
  console.log('API Check:', apiCheck.passed);
  console.log('DOM Check:', domCheck.passed);
});
```

---

## Phase 8: Performance & Load Testing (4 Tests)

### 8.1 Initialization Performance
- [ ] Ready contract resolves in < 2 seconds on desktop
- [ ] Acceptable performance on slow 3G (< 10 seconds)
- [ ] No JavaScript errors during initialization
- [ ] Memory usage remains reasonable

**Performance Test:**
```javascript
const startTime = performance.now();
window.GPBC_SHARE_READY.then(() => {
  const duration = performance.now() - startTime;
  console.log(`Ready contract resolved in ${duration}ms`);
  // Should be < 2000ms on good connection
});
```

### 8.2 Runtime Performance
- [ ] Share modal opens in < 500ms after click
- [ ] Image generation completes in < 2 seconds
- [ ] No UI blocking during generation
- [ ] Smooth animations and transitions

---

## Phase 9: Google Apps Script Security (6 Tests)

### 9.1 CORS Validation
- [ ] **CRITICAL** Only allowed origins accepted
- [ ] Invalid origins receive 403 response
- [ ] CORS preflight requests handled correctly

**Test Command:**
```bash
# Test CORS
curl -X POST https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
# Should be rejected
```

### 9.2 Request Signature Validation
- [ ] **CRITICAL** Requests without signature rejected
- [ ] Invalid signatures rejected
- [ ] Valid signatures accepted
- [ ] Signature verification uses correct algorithm

### 9.3 Rate Limiting
- [ ] 60 requests/minute limit enforced
- [ ] 500 requests/hour limit enforced
- [ ] Rate limit headers returned correctly

**Test Script:**
```javascript
// Test rate limiting
async function testRateLimit() {
  const requests = Array(65).fill(null).map((_, i) => 
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: i })
    })
  );
  
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  console.log(`Rate limited: ${rateLimited.length} requests`);
  // Should have some 429 responses
}
```

---

## Phase 10: Regression Testing (4 Tests)

### 10.1 Existing Functionality
- [ ] **HIGH** Daily devotion page still loads correctly
- [ ] Calendar functionality unaffected
- [ ] Other share features work normally
- [ ] No new console errors introduced

### 10.2 Integration Points
- [ ] Firebase integration still functional
- [ ] Analytics tracking works
- [ ] External API calls succeed
- [ ] Third-party scripts load correctly

---

## Security Telemetry Validation

### Telemetry Collection
- [ ] SecurityTelemetry logs events correctly
- [ ] Event filtering works (by level, category)
- [ ] Security report generation successful

**Test Command:**
```javascript
// Generate security report
const report = window.getSecurityReport();
console.log('Security Report:', report);

// Check specific events
const errors = SecurityTelemetry.getEvents({ level: 'ERROR' });
console.log('Recent errors:', errors);
```

---

## Test Execution Summary

### Test Results Template
```
Date: ________________
Tester: ________________
Environment: ________________

Phase 1 (Ready Contract): ___/8 passed
Phase 2 (XSS Prevention): ___/7 passed
Phase 3 (Input Validation): ___/6 passed
Phase 4 (Runtime Guards): ___/8 passed
Phase 5 (Security Headers): ___/5 passed
Phase 6 (First-Click): ___/4 passed
Phase 7 (Cross-Browser): ___/6 passed
Phase 8 (Performance): ___/4 passed
Phase 9 (Apps Script): ___/6 passed
Phase 10 (Regression): ___/4 passed

TOTAL: ___/52 passed (___%)

Critical Issues Found: ________________
High Priority Issues: ________________
Medium Priority Issues: ________________

Overall Status: [ ] PASS  [ ] FAIL  [ ] PARTIAL
```

---

## Automated Testing Scripts

### Quick Smoke Test
```javascript
// Run basic smoke test
async function smokeTest() {
  console.log('🧪 Starting Security Smoke Test...');
  
  const tests = {
    readyContract: typeof window.GPBC_SHARE_READY !== 'undefined',
    securityGuard: window.SECURITY_GUARD_LOADED === true,
    domPurify: typeof window.DOMPurify !== 'undefined',
    shareGenerator: typeof window.ShareGenerator !== 'undefined'
  };
  
  const passed = Object.values(tests).every(t => t);
  
  console.log('Test Results:', tests);
  console.log(passed ? '✅ Smoke test PASSED' : '❌ Smoke test FAILED');
  
  return tests;
}

// Run it
smokeTest();
```

### Comprehensive Security Audit
```javascript
// Full security audit
async function securityAudit() {
  console.log('🔒 Running Comprehensive Security Audit...');
  
  // 1. Check ready contract
  console.log('1️⃣ Testing Ready Contract...');
  const readyStatus = window.getShareReadyStatus();
  console.log('Ready Status:', readyStatus);
  
  // 2. Verify APIs
  console.log('2️⃣ Verifying APIs...');
  const apiCheck = window.verifyShareAPIsCallable();
  console.log('API Check:', apiCheck.passed ? '✅' : '❌', apiCheck);
  
  // 3. Verify DOM
  console.log('3️⃣ Verifying DOM...');
  const domCheck = window.verifyShareDOMReady();
  console.log('DOM Check:', domCheck.passed ? '✅' : '❌', domCheck);
  
  // 4. Test XSS protection
  console.log('4️⃣ Testing XSS Protection...');
  const xssTest = DOMPurify.sanitize('<script>alert(1)</script>');
  const xssPassed = !xssTest.includes('script');
  console.log('XSS Protection:', xssPassed ? '✅' : '❌');
  
  // 5. Check security telemetry
  console.log('5️⃣ Checking Telemetry...');
  const secReport = window.getSecurityReport();
  console.log('Security Report:', secReport);
  
  // Summary
  console.log('\n📊 Audit Summary:');
  console.log('Ready Contract:', readyStatus.resolved ? '✅' : '❌');
  console.log('API Verification:', apiCheck.passed ? '✅' : '❌');
  console.log('DOM Verification:', domCheck.passed ? '✅' : '❌');
  console.log('XSS Protection:', xssPassed ? '✅' : '❌');
  
  return {
    readyStatus,
    apiCheck,
    domCheck,
    xssProtection: xssPassed,
    securityReport: secReport
  };
}

// Run comprehensive audit
securityAudit();
```

---

## Issue Tracking Template

### Critical Issue Template
```markdown
## 🚨 CRITICAL Security Issue

**ID:** CRIT-001
**Date Found:** YYYY-MM-DD
**Found By:** [Name]
**Status:** [ ] Open [ ] In Progress [ ] Resolved

### Description
[Detailed description of the security vulnerability]

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Security Impact
- [ ] XSS vulnerability
- [ ] Data exposure
- [ ] Authentication bypass
- [ ] Other: _____________

### Recommended Fix
[Technical solution]

### Verification Steps
[How to verify the fix]
```

---

## Sign-Off Requirements

### Before Production Deployment
- [ ] All CRITICAL tests passed
- [ ] At least 95% of HIGH priority tests passed
- [ ] All known security issues resolved or mitigated
- [ ] Security team sign-off obtained
- [ ] Documentation updated
- [ ] Monitoring alerts configured

### Sign-Off
```
Security Lead: ________________  Date: ________
QA Lead: ________________  Date: ________
Technical Lead: ________________  Date: ________
```

---

## Continuous Monitoring

### Post-Deployment Checks (Weekly)
- [ ] Review SecurityTelemetry logs
- [ ] Check error rates in monitoring
- [ ] Verify rate limiting effectiveness
- [ ] Review CORS policy effectiveness
- [ ] Monitor performance metrics

### Monthly Security Review
- [ ] Re-run full test checklist
- [ ] Review and update ALLOWED_ORIGINS
- [ ] Rotate SHARED_SECRET if needed
- [ ] Update dependencies (DOMPurify, etc.)
- [ ] Review and update CSP policy

---

**End of Security Test Checklist**  
*Keep this document updated as new security measures are implemented.*

