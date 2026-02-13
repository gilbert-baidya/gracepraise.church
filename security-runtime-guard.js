/**
 * Security Runtime Guard for Share Feature
 * =========================================
 * Production-grade runtime verification system that prevents execution
 * of share functionality until all security requirements are met.
 * 
 * @module security-runtime-guard
 * @version 1.0.0
 * @date 2026-02-13
 */

(function() {
    'use strict';

    /**
     * SecurityTelemetry - Centralized logging and monitoring
     */
    class SecurityTelemetry {
        constructor() {
            this.events = [];
            this.maxEvents = 100;
        }

        log(level, category, message, context = {}) {
            const event = {
                timestamp: new Date().toISOString(),
                level,
                category,
                message,
                context,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            this.events.push(event);
            if (this.events.length > this.maxEvents) {
                this.events.shift();
            }

            // Console output with formatting
            const prefix = `[SecurityGuard:${category}]`;
            const style = level === 'ERROR' ? 'color: red; font-weight: bold' : 
                         level === 'WARN' ? 'color: orange' : 'color: blue';
            
            console[level.toLowerCase()] || console.log.call(console, `%c${prefix} ${message}`, style, context);

            // Send critical errors to monitoring (if configured)
            if (level === 'ERROR' && window.GPBC_ERROR_TRACKING) {
                this.reportToMonitoring(event);
            }
        }

        reportToMonitoring(event) {
            try {
                // Integration point for error tracking services
                if (typeof window.GPBC_ERROR_TRACKING.report === 'function') {
                    window.GPBC_ERROR_TRACKING.report({
                        type: 'security_runtime_guard',
                        event: event
                    });
                }
            } catch (e) {
                console.error('[SecurityTelemetry] Failed to report to monitoring:', e);
            }
        }

        getEvents(filter = {}) {
            let filtered = this.events;
            
            if (filter.level) {
                filtered = filtered.filter(e => e.level === filter.level);
            }
            if (filter.category) {
                filtered = filtered.filter(e => e.category === filter.category);
            }
            if (filter.since) {
                filtered = filtered.filter(e => new Date(e.timestamp) >= filter.since);
            }

            return filtered;
        }

        getSecurityReport() {
            const now = Date.now();
            const last24h = new Date(now - 24 * 60 * 60 * 1000);

            return {
                total_events: this.events.length,
                errors_24h: this.getEvents({ level: 'ERROR', since: last24h }).length,
                warnings_24h: this.getEvents({ level: 'WARN', since: last24h }).length,
                recent_events: this.events.slice(-10),
                categories: this._groupByCategory()
            };
        }

        _groupByCategory() {
            const groups = {};
            this.events.forEach(event => {
                groups[event.category] = (groups[event.category] || 0) + 1;
            });
            return groups;
        }
    }

    // Initialize global telemetry instance
    window.SecurityTelemetry = window.SecurityTelemetry || new SecurityTelemetry();
    const telemetry = window.SecurityTelemetry;

    /**
     * Verify Share APIs are callable
     * Ensures Share Generator and DOMPurify are loaded and functional
     */
    window.verifyShareAPIsCallable = function() {
        telemetry.log('INFO', 'API_VERIFICATION', 'Starting Share APIs verification');

        const checks = {
            shareGenerator: {
                present: typeof window.ShareGenerator !== 'undefined',
                methods: []
            },
            domPurify: {
                present: typeof window.DOMPurify !== 'undefined',
                functional: false
            }
        };

        // Verify Share Generator
        if (checks.shareGenerator.present) {
            const requiredMethods = ['generateShareImage', 'getShareableContent', 'openShareModal'];
            requiredMethods.forEach(method => {
                const exists = typeof window.ShareGenerator[method] === 'function';
                checks.shareGenerator.methods.push({ method, exists });
                
                if (!exists) {
                    telemetry.log('ERROR', 'API_VERIFICATION', 
                        `Share Generator missing required method: ${method}`);
                }
            });
        } else {
            telemetry.log('ERROR', 'API_VERIFICATION', 'Share Generator not loaded');
        }

        // Verify DOMPurify
        if (checks.domPurify.present) {
            try {
                const testHTML = '<img src=x onerror=alert(1)>';
                const sanitized = DOMPurify.sanitize(testHTML);
                checks.domPurify.functional = !sanitized.includes('onerror');
                
                if (!checks.domPurify.functional) {
                    telemetry.log('ERROR', 'API_VERIFICATION', 
                        'DOMPurify sanitization test failed');
                }
            } catch (e) {
                telemetry.log('ERROR', 'API_VERIFICATION', 
                    'DOMPurify functionality test threw error', { error: e.message });
            }
        } else {
            telemetry.log('ERROR', 'API_VERIFICATION', 'DOMPurify not loaded');
        }

        const allPassed = checks.shareGenerator.present && 
                         checks.shareGenerator.methods.every(m => m.exists) &&
                         checks.domPurify.present && 
                         checks.domPurify.functional;

        if (allPassed) {
            telemetry.log('INFO', 'API_VERIFICATION', 'All Share APIs verified successfully');
        } else {
            telemetry.log('ERROR', 'API_VERIFICATION', 'Share APIs verification failed', checks);
        }

        return {
            passed: allPassed,
            checks: checks,
            timestamp: new Date().toISOString()
        };
    };

    /**
     * Verify Share DOM Ready
     * Ensures required DOM elements and containers exist
     */
    window.verifyShareDOMReady = function() {
        telemetry.log('INFO', 'DOM_VERIFICATION', 'Starting Share DOM verification');

        const requiredSelectors = [
            { selector: 'body', description: 'Document body' },
            { selector: '.share-button, [data-share-action]', description: 'Share trigger buttons' }
        ];

        const optionalSelectors = [
            { selector: '#shareModal', description: 'Share modal container' },
            { selector: '.share-preview', description: 'Share preview area' }
        ];

        const checks = {
            required: [],
            optional: [],
            domReady: document.readyState === 'complete' || document.readyState === 'interactive'
        };

        // Check required elements
        requiredSelectors.forEach(({ selector, description }) => {
            const elements = document.querySelectorAll(selector);
            const exists = elements.length > 0;
            
            checks.required.push({
                selector,
                description,
                exists,
                count: elements.length
            });

            if (!exists) {
                telemetry.log('ERROR', 'DOM_VERIFICATION', 
                    `Required element not found: ${description}`, { selector });
            }
        });

        // Check optional elements (warnings only)
        optionalSelectors.forEach(({ selector, description }) => {
            const elements = document.querySelectorAll(selector);
            const exists = elements.length > 0;
            
            checks.optional.push({
                selector,
                description,
                exists,
                count: elements.length
            });

            if (!exists) {
                telemetry.log('WARN', 'DOM_VERIFICATION', 
                    `Optional element not found: ${description}`, { selector });
            }
        });

        const allRequiredPresent = checks.required.every(c => c.exists);
        const passed = checks.domReady && allRequiredPresent;

        if (passed) {
            telemetry.log('INFO', 'DOM_VERIFICATION', 'Share DOM verified successfully');
        } else {
            telemetry.log('ERROR', 'DOM_VERIFICATION', 'Share DOM verification failed', checks);
        }

        return {
            passed: passed,
            checks: checks,
            timestamp: new Date().toISOString()
        };
    };

    /**
     * Guard Share Button
     * Wraps share button click handlers with security verification
     */
    window.guardShareButton = function(buttonElement, originalHandler) {
        if (!buttonElement) {
            telemetry.log('ERROR', 'GUARD', 'guardShareButton called with null element');
            return;
        }

        telemetry.log('INFO', 'GUARD', 'Installing guard on share button', {
            element: buttonElement.tagName,
            id: buttonElement.id,
            classes: buttonElement.className
        });

        // Store original handler
        buttonElement._originalShareHandler = originalHandler;

        // Create guarded handler
        const guardedHandler = function(event) {
            event.preventDefault();
            event.stopPropagation();

            telemetry.log('INFO', 'GUARD', 'Share button clicked - running security checks');

            // Run verification checks
            const apiCheck = window.verifyShareAPIsCallable();
            const domCheck = window.verifyShareDOMReady();

            if (!apiCheck.passed) {
                telemetry.log('ERROR', 'GUARD', 'API verification failed - blocking share action');
                alert('Share feature is not ready. Please refresh the page and try again.');
                return false;
            }

            if (!domCheck.passed) {
                telemetry.log('ERROR', 'GUARD', 'DOM verification failed - blocking share action');
                alert('Share feature is not fully loaded. Please wait a moment and try again.');
                return false;
            }

            telemetry.log('INFO', 'GUARD', 'All security checks passed - executing share action');

            // Execute original handler
            try {
                if (typeof originalHandler === 'function') {
                    return originalHandler.call(this, event);
                } else {
                    telemetry.log('WARN', 'GUARD', 'No original handler defined - using default');
                    if (typeof window.ShareGenerator?.openShareModal === 'function') {
                        window.ShareGenerator.openShareModal();
                    }
                }
            } catch (error) {
                telemetry.log('ERROR', 'GUARD', 'Error executing share handler', {
                    error: error.message,
                    stack: error.stack
                });
                alert('An error occurred while opening the share dialog. Please try again.');
                return false;
            }
        };

        // Remove existing listeners and add guarded handler
        const clone = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(clone, buttonElement);
        clone.addEventListener('click', guardedHandler);

        telemetry.log('INFO', 'GUARD', 'Guard installed successfully');

        return clone;
    };

    /**
     * Auto-guard all share buttons on page load
     */
    function autoGuardShareButtons() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoGuardShareButtons);
            return;
        }

        telemetry.log('INFO', 'AUTO_GUARD', 'Auto-guarding share buttons');

        const shareButtons = document.querySelectorAll('.share-button, [data-share-action]');
        let guardedCount = 0;

        shareButtons.forEach(button => {
            try {
                window.guardShareButton(button, function(event) {
                    event.preventDefault();
                    if (typeof window.ShareGenerator?.openShareModal === 'function') {
                        window.ShareGenerator.openShareModal();
                    }
                });
                guardedCount++;
            } catch (error) {
                telemetry.log('ERROR', 'AUTO_GUARD', 'Failed to guard button', {
                    element: button.outerHTML.substring(0, 100),
                    error: error.message
                });
            }
        });

        telemetry.log('INFO', 'AUTO_GUARD', `Auto-guard complete: ${guardedCount} buttons guarded`);
    }

    /**
     * Expose security report API
     */
    window.getSecurityReport = function() {
        return {
            telemetry: telemetry.getSecurityReport(),
            lastAPICheck: window._lastAPICheck || null,
            lastDOMCheck: window._lastDOMCheck || null,
            guardStatus: {
                autoGuardEnabled: true,
                timestamp: new Date().toISOString()
            }
        };
    };

    // Auto-guard initialization
    autoGuardShareButtons();

    // Expose guard status
    window.SECURITY_GUARD_LOADED = true;
    telemetry.log('INFO', 'INIT', 'Security Runtime Guard initialized successfully');

    console.log('%c✓ Security Runtime Guard Active', 
        'color: green; font-weight: bold; font-size: 14px');
})();
