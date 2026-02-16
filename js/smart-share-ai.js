/**
 * ============================================================================
 * GPBC SMART SHARE AI ORCHESTRATOR
 * ============================================================================
 * Intelligent share strategy selection based on device capabilities,
 * network conditions, and historical success patterns.
 * 
 * SAFE ADDITIVE IMPLEMENTATION - Does not modify existing systems
 * ============================================================================
 */

(function(window) {
    'use strict';

    // ========================================
    // SHARE PROFILE STORAGE
    // ========================================
    const STORAGE_KEY = 'gpbc_smartShareProfile';
    const VERSION = '1.0.0';

    /**
     * Device and capability detection
     */
    class DeviceCapabilityDetector {
        constructor() {
            this.profile = this.detect();
        }

        detect() {
            const ua = navigator.userAgent || '';
            
            return {
                // Device type
                deviceType: this.getDeviceType(ua),
                os: this.getOS(ua),
                browser: this.getBrowser(ua),
                
                // Share capabilities
                hasWebShare: typeof navigator.share === 'function',
                canShareFiles: this.canShareFiles(),
                hasClipboard: typeof navigator.clipboard !== 'undefined',
                
                // Network
                networkType: this.getNetworkType(),
                connectionSpeed: this.getConnectionSpeed(),
                
                // Display
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1,
                
                // Theme
                prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
                
                // Timestamp
                detectedAt: Date.now()
            };
        }

        getDeviceType(ua) {
            if (/iPad/i.test(ua)) return 'ipad';
            if (/iPhone/i.test(ua)) return 'iphone';
            if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'android-phone';
            if (/Android/i.test(ua)) return 'android-tablet';
            if (window.innerWidth < 768) return 'mobile';
            if (window.innerWidth < 1024) return 'tablet';
            return 'desktop';
        }

        getOS(ua) {
            if (/Windows/i.test(ua)) return 'windows';
            if (/Mac OS X/i.test(ua)) return 'macos';
            if (/iPhone|iPad/i.test(ua)) return 'ios';
            if (/Android/i.test(ua)) return 'android';
            if (/Linux/i.test(ua)) return 'linux';
            return 'unknown';
        }

        getBrowser(ua) {
            if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'chrome';
            if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
            if (/Firefox/i.test(ua)) return 'firefox';
            if (/Edge/i.test(ua)) return 'edge';
            return 'unknown';
        }

        canShareFiles() {
            try {
                if (!navigator.canShare) return false;
                
                // Test with a dummy file
                const testBlob = new Blob(['test'], { type: 'text/plain' });
                const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
                
                return navigator.canShare({ files: [testFile] });
            } catch (error) {
                return false;
            }
        }

        getNetworkType() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!connection) return 'unknown';
            
            return connection.effectiveType || connection.type || 'unknown';
        }

        getConnectionSpeed() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (!connection) return 'unknown';
            
            if (connection.downlink) {
                if (connection.downlink > 10) return 'fast';
                if (connection.downlink > 2) return 'medium';
                return 'slow';
            }
            
            return 'unknown';
        }
    }

    /**
     * Share memory - tracks successful strategies
     */
    class ShareMemory {
        constructor() {
            this.load();
        }

        load() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    this.profile = JSON.parse(stored);
                } else {
                    this.profile = this.createDefault();
                }
            } catch (error) {
                console.warn('[Smart Share AI] Failed to load profile:', error);
                this.profile = this.createDefault();
            }
        }

        createDefault() {
            return {
                version: VERSION,
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                strategies: {
                    image: { attempts: 0, successes: 0, lastSuccess: null },
                    url: { attempts: 0, successes: 0, lastSuccess: null },
                    text: { attempts: 0, successes: 0, lastSuccess: null },
                    sms: { attempts: 0, successes: 0, lastSuccess: null }
                },
                preferredStrategy: null,
                deviceFingerprint: null
            };
        }

        recordAttempt(strategy) {
            if (!this.profile.strategies[strategy]) {
                this.profile.strategies[strategy] = { attempts: 0, successes: 0, lastSuccess: null };
            }
            this.profile.strategies[strategy].attempts++;
            this.save();
        }

        recordSuccess(strategy) {
            if (!this.profile.strategies[strategy]) {
                this.profile.strategies[strategy] = { attempts: 0, successes: 0, lastSuccess: null };
            }
            this.profile.strategies[strategy].successes++;
            this.profile.strategies[strategy].lastSuccess = Date.now();
            this.profile.lastUpdated = Date.now();
            
            // Update preferred strategy
            this.updatePreferredStrategy();
            
            this.save();
        }

        updatePreferredStrategy() {
            let bestStrategy = null;
            let bestScore = -1;

            for (const [strategy, stats] of Object.entries(this.profile.strategies)) {
                if (stats.attempts === 0) continue;
                
                const successRate = stats.successes / stats.attempts;
                const recency = stats.lastSuccess ? (Date.now() - stats.lastSuccess) / (1000 * 60 * 60 * 24) : 999;
                
                // Score: success rate * recency weight (prefer recent successes)
                const recencyWeight = Math.max(0.1, 1 - (recency / 30)); // Decay over 30 days
                const score = successRate * recencyWeight;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestStrategy = strategy;
                }
            }

            this.profile.preferredStrategy = bestStrategy;
        }

        getPreferredStrategy() {
            return this.profile.preferredStrategy;
        }

        getSuccessRate(strategy) {
            const stats = this.profile.strategies[strategy];
            if (!stats || stats.attempts === 0) return 0;
            return stats.successes / stats.attempts;
        }

        save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
            } catch (error) {
                console.warn('[Smart Share AI] Failed to save profile:', error);
            }
        }

        clear() {
            this.profile = this.createDefault();
            this.save();
        }
    }

    /**
     * Smart Share Strategy Selector
     */
    class SmartShareStrategySelector {
        constructor(deviceProfile, shareMemory) {
            this.deviceProfile = deviceProfile;
            this.memory = shareMemory;
        }

        /**
         * Select optimal strategy based on capabilities and history
         */
        selectStrategy(options = {}) {
            console.log('[Smart Share AI] Selecting strategy...', options);

            // Override mode takes precedence
            if (options.mode) {
                console.log('[Smart Share AI] Using override mode:', options.mode);
                return this.validateStrategy(options.mode);
            }

            // Check historical preference
            const preferred = this.memory.getPreferredStrategy();
            if (preferred && this.isStrategyAvailable(preferred)) {
                const successRate = this.memory.getSuccessRate(preferred);
                if (successRate > 0.7) { // 70% threshold
                    console.log('[Smart Share AI] Using preferred strategy:', preferred, 'success rate:', successRate);
                    return preferred;
                }
            }

            // Priority-based selection
            const strategies = this.getPriorityStrategies();
            
            for (const strategy of strategies) {
                if (this.isStrategyAvailable(strategy)) {
                    console.log('[Smart Share AI] Selected strategy:', strategy);
                    return strategy;
                }
            }

            // Fallback
            console.log('[Smart Share AI] Using fallback strategy: text');
            return 'text';
        }

        getPriorityStrategies() {
            const { deviceType, os, browser, canShareFiles, hasWebShare, networkType } = this.deviceProfile;

            // iOS Safari - file sharing works great
            if (os === 'ios' && browser === 'safari') {
                return canShareFiles ? ['image', 'url', 'text'] : ['url', 'text'];
            }

            // Android Chrome - excellent file sharing
            if (os === 'android' && browser === 'chrome') {
                return canShareFiles ? ['image', 'url', 'text'] : ['url', 'text'];
            }

            // Desktop Chrome - limited share API
            if (deviceType === 'desktop' && browser === 'chrome') {
                return hasWebShare ? ['url', 'text'] : ['text'];
            }

            // iPad Safari - great for image sharing
            if (deviceType === 'ipad' && browser === 'safari') {
                return canShareFiles ? ['image', 'url', 'text'] : ['url', 'text'];
            }

            // Slow network - prefer lighter payloads
            if (networkType === 'slow' || networkType === '2g') {
                return hasWebShare ? ['text', 'url', 'image'] : ['text'];
            }

            // Default priority
            return canShareFiles ? ['image', 'url', 'text'] : 
                   hasWebShare ? ['url', 'text'] : ['text'];
        }

        isStrategyAvailable(strategy) {
            const { hasWebShare, canShareFiles } = this.deviceProfile;

            switch (strategy) {
                case 'image':
                case 'sms':
                    return canShareFiles;
                case 'url':
                    return hasWebShare;
                case 'text':
                    return hasWebShare || true; // Always available as fallback
                default:
                    return false;
            }
        }

        validateStrategy(strategy) {
            if (this.isStrategyAvailable(strategy)) {
                return strategy;
            }

            console.warn('[Smart Share AI] Requested strategy not available:', strategy);
            return this.selectStrategy(); // Fallback to auto-select
        }

        getRecommendations() {
            const strategies = this.getPriorityStrategies();
            return strategies.map(strategy => ({
                strategy,
                available: this.isStrategyAvailable(strategy),
                successRate: this.memory.getSuccessRate(strategy),
                lastSuccess: this.memory.profile.strategies[strategy]?.lastSuccess
            }));
        }
    }

    /**
     * Smart Share AI Orchestrator (Main API)
     */
    class SmartShareAI {
        constructor() {
            this.detector = new DeviceCapabilityDetector();
            this.memory = new ShareMemory();
            this.selector = new SmartShareStrategySelector(this.detector.profile, this.memory);
            
            console.log('[Smart Share AI] Initialized', {
                device: this.detector.profile.deviceType,
                os: this.detector.profile.os,
                browser: this.detector.profile.browser,
                canShareFiles: this.detector.profile.canShareFiles,
                hasWebShare: this.detector.profile.hasWebShare
            });
        }

        /**
         * Execute smart share with optimal strategy
         */
        async execute(payload, options = {}) {
            const strategy = this.selector.selectStrategy(options);
            
            console.log('[Smart Share AI] Executing strategy:', strategy);
            this.memory.recordAttempt(strategy);

            try {
                // Delegate to existing oneTapDevotionShare with selected mode
                if (typeof window.oneTapDevotionShare === 'function') {
                    const result = await window.oneTapDevotionShare({
                        ...options,
                        mode: strategy === 'image' ? 'image' : 
                              strategy === 'sms' ? 'sms' :
                              strategy === 'url' ? 'url' : 'text'
                    });

                    if (result.success) {
                        this.memory.recordSuccess(strategy);
                        console.log('[Smart Share AI] ✅ Success with strategy:', strategy);
                    }

                    return {
                        success: result.success,
                        strategy,
                        method: result.method,
                        tier: result.tier,
                        aiRecommended: !options.mode
                    };
                } else {
                    throw new Error('oneTapDevotionShare not available');
                }
            } catch (error) {
                console.error('[Smart Share AI] ❌ Failed with strategy:', strategy, error);
                
                return {
                    success: false,
                    strategy,
                    error: error.message,
                    aiRecommended: !options.mode
                };
            }
        }

        /**
         * Get device capabilities
         */
        getCapabilities() {
            return this.detector.profile;
        }

        /**
         * Get strategy recommendations
         */
        getRecommendations() {
            return this.selector.getRecommendations();
        }

        /**
         * Get share memory profile
         */
        getProfile() {
            return this.memory.profile;
        }

        /**
         * Clear share memory
         */
        clearMemory() {
            this.memory.clear();
            console.log('[Smart Share AI] Memory cleared');
        }

        /**
         * Get diagnostics
         */
        getDiagnostics() {
            return {
                version: VERSION,
                device: this.detector.profile,
                memory: this.memory.profile,
                recommendations: this.selector.getRecommendations(),
                preferredStrategy: this.memory.getPreferredStrategy()
            };
        }
    }

    // ========================================
    // GLOBAL EXPORT
    // ========================================
    
    const smartShareAI = new SmartShareAI();
    
    // Export to window
    window.SmartShareAI = smartShareAI;
    
    // Alias for convenience
    window.smartShare = {
        execute: (payload, options) => smartShareAI.execute(payload, options),
        getCapabilities: () => smartShareAI.getCapabilities(),
        getRecommendations: () => smartShareAI.getRecommendations(),
        clearMemory: () => smartShareAI.clearMemory(),
        getDiagnostics: () => smartShareAI.getDiagnostics()
    };

    console.log('[Smart Share AI] 🤖 Module loaded and ready');

})(window);
