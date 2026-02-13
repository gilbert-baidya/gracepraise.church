/**
 * Share Ready Contract - Unified Initialization Promise
 * ======================================================
 * Provides a single, reliable promise that resolves when ALL share subsystems
 * are fully loaded, validated, and ready for use.
 * 
 * @module share-ready-contract
 * @version 1.0.0
 * @date 2026-02-13
 */

(function() {
    'use strict';

    // Prevent double initialization
    if (window.GPBC_SHARE_READY_INITIALIZED) {
        console.warn('[ShareReadyContract] Already initialized - skipping');
        return;
    }

    /**
     * Configuration
     */
    const CONFIG = {
        TIMEOUT_MS: 5000,
        CHECK_INTERVAL_MS: 100,
        REQUIRED_SUBSYSTEMS: [
            'ShareGenerator',
            'DOMPurify'
        ],
        OPTIONAL_SUBSYSTEMS: [
            'SecurityGuard'
        ]
    };

    /**
     * Subsystem Registry
     */
    const subsystemRegistry = {
        registered: new Map(),
        readyStates: new Map()
    };

    /**
     * Register a share subsystem
     * @param {string} name - Subsystem name
     * @param {Promise|Function} readyCheck - Promise or function that returns boolean
     */
    window.registerShareSubsystem = function(name, readyCheck) {
        console.log(`[ShareReadyContract] Registering subsystem: ${name}`);

        if (subsystemRegistry.registered.has(name)) {
            console.warn(`[ShareReadyContract] Subsystem ${name} already registered - overwriting`);
        }

        subsystemRegistry.registered.set(name, {
            name,
            readyCheck,
            registeredAt: Date.now()
        });

        // If it's a promise, track it
        if (readyCheck && typeof readyCheck.then === 'function') {
            readyCheck.then(() => {
                subsystemRegistry.readyStates.set(name, true);
                console.log(`[ShareReadyContract] ✓ ${name} ready`);
            }).catch(error => {
                subsystemRegistry.readyStates.set(name, false);
                console.error(`[ShareReadyContract] ✗ ${name} failed:`, error);
            });
        }
    };

    /**
     * Check if a subsystem is ready
     */
    function isSubsystemReady(name) {
        const subsystem = subsystemRegistry.registered.get(name);
        
        if (!subsystem) {
            return false;
        }

        // Check if promise already resolved
        if (subsystemRegistry.readyStates.has(name)) {
            return subsystemRegistry.readyStates.get(name);
        }

        // Check if it's a function
        if (typeof subsystem.readyCheck === 'function') {
            try {
                return subsystem.readyCheck();
            } catch (e) {
                console.error(`[ShareReadyContract] Error checking ${name}:`, e);
                return false;
            }
        }

        // Check if it's a boolean
        if (typeof subsystem.readyCheck === 'boolean') {
            return subsystem.readyCheck;
        }

        return false;
    }

    /**
     * Check all required subsystems
     */
    function checkAllSubsystems() {
        const results = {
            required: {},
            optional: {},
            allRequiredReady: true
        };

        // Check required subsystems
        CONFIG.REQUIRED_SUBSYSTEMS.forEach(name => {
            const ready = isSubsystemReady(name);
            results.required[name] = ready;
            
            if (!ready) {
                results.allRequiredReady = false;
            }
        });

        // Check optional subsystems
        CONFIG.OPTIONAL_SUBSYSTEMS.forEach(name => {
            results.optional[name] = isSubsystemReady(name);
        });

        return results;
    }

    /**
     * Wait for all subsystems with timeout
     */
    function waitForSubsystems() {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let checkCount = 0;

            console.log('[ShareReadyContract] Waiting for subsystems...');

            const checkInterval = setInterval(() => {
                checkCount++;
                const elapsed = Date.now() - startTime;

                // Check if timeout exceeded
                if (elapsed > CONFIG.TIMEOUT_MS) {
                    clearInterval(checkInterval);
                    const results = checkAllSubsystems();
                    
                    console.error('[ShareReadyContract] Timeout waiting for subsystems:', results);
                    
                    reject(new Error(
                        `Share subsystems not ready within ${CONFIG.TIMEOUT_MS}ms. ` +
                        `Required: ${JSON.stringify(results.required)}`
                    ));
                    return;
                }

                // Check all subsystems
                const results = checkAllSubsystems();

                // Log progress
                if (checkCount % 10 === 0) {
                    console.log(`[ShareReadyContract] Check ${checkCount} (${elapsed}ms):`, results);
                }

                // All required subsystems ready?
                if (results.allRequiredReady) {
                    clearInterval(checkInterval);
                    console.log(`[ShareReadyContract] ✓ All subsystems ready (${elapsed}ms)`);
                    resolve(results);
                }
            }, CONFIG.CHECK_INTERVAL_MS);
        });
    }

    /**
     * Create the unified ready promise
     */
    function createReadyPromise() {
        console.log('[ShareReadyContract] Creating unified ready promise');

        // Auto-register core subsystems
        registerShareSubsystem('ShareGenerator', () => {
            return typeof window.ShareGenerator !== 'undefined' &&
                   typeof window.ShareGenerator.generateShareImage === 'function';
        });

        registerShareSubsystem('DOMPurify', () => {
            return typeof window.DOMPurify !== 'undefined' &&
                   typeof window.DOMPurify.sanitize === 'function';
        });

        registerShareSubsystem('SecurityGuard', () => {
            return window.SECURITY_GUARD_LOADED === true &&
                   typeof window.verifyShareAPIsCallable === 'function';
        });

        // Wait for all subsystems
        return waitForSubsystems();
    }

    /**
     * Initialize the ready contract
     */
    let readyPromise;
    let readyResolved = false;
    let readyResult = null;

    try {
        readyPromise = createReadyPromise();

        readyPromise.then(result => {
            readyResolved = true;
            readyResult = result;
            console.log('%c✓ GPBC Share Ready Contract: All systems operational', 
                'color: green; font-weight: bold; font-size: 14px');
        }).catch(error => {
            readyResolved = true;
            readyResult = { error: error.message };
            console.error('%c✗ GPBC Share Ready Contract: Failed', 
                'color: red; font-weight: bold; font-size: 14px', error);
        });

        // Expose the unified promise
        window.GPBC_SHARE_READY = readyPromise;

        // Backward compatibility - also set the legacy flag when ready
        readyPromise.then(() => {
            window.__SHARE_GENERATOR_READY__ = true;
            console.log('[ShareReadyContract] ✓ Legacy __SHARE_GENERATOR_READY__ flag set');
        }).catch(() => {
            window.__SHARE_GENERATOR_READY__ = false;
        });

    } catch (error) {
        console.error('[ShareReadyContract] Failed to initialize:', error);
        window.GPBC_SHARE_READY = Promise.reject(error);
        window.__SHARE_GENERATOR_READY__ = false;
    }

    /**
     * Expose utility functions
     */
    window.getShareReadyStatus = function() {
        return {
            initialized: true,
            resolved: readyResolved,
            result: readyResult,
            subsystems: {
                registered: Array.from(subsystemRegistry.registered.keys()),
                states: Object.fromEntries(
                    Array.from(subsystemRegistry.registered.keys()).map(name => [
                        name,
                        isSubsystemReady(name)
                    ])
                )
            },
            config: CONFIG,
            timestamp: new Date().toISOString()
        };
    };

    // Mark as initialized
    window.GPBC_SHARE_READY_INITIALIZED = true;

    console.log('[ShareReadyContract] Initialization complete');

})();
