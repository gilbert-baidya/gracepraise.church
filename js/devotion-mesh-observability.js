/**
 * ============================================================================
 * GPBC DEVOTION MESH OBSERVABILITY & SELF-HEALING TELEMETRY
 * Production Health Monitoring + Silent Auto Recovery
 * ============================================================================
 * 
 * Non-blocking observability layer for the Devotion Data Mesh.
 * Tracks health metrics, failure streaks, and auto-recovery signals.
 * User-facing functionality never impacted by telemetry failures.
 * 
 * @version 1.0.0
 * @author GPBC Engineering
 * @date February 11, 2026
 */

(function () {
    'use strict';

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    const CONFIG = {
        TELEMETRY_ENDPOINT: '/api/devotion-health',
        FAILURE_STREAK_THRESHOLD: 5,
        LAYER_DISABLE_DURATION_MS: 3600000, // 1 hour
        HEALTH_SCORE_THRESHOLDS: {
            EXCELLENT: 90,
            GOOD: 70,
            DEGRADED: 50,
            CRITICAL: 30
        },
        DEV_MODE: false, // Set to true for console logging
        ENABLE_BEACON: true,
        CACHE_HIT_WINDOW: 100 // Track last 100 loads for cache hit rate
    };

    // ========================================================================
    // GLOBAL TELEMETRY STATE
    // ========================================================================

    window.__GPBC_DEVOTION_HEALTH__ = {
        lastLoadLayer: null,
        lastLoadTimeMs: null,
        lastSuccessTimestamp: null,
        failureStreak: 0,
        cacheHitRate: 0,
        lastErrorMessage: null,
        totalLoads: 0,
        totalSuccess: 0,
        totalFailures: 0,
        layerSuccessCount: [0, 0, 0, 0, 0, 0], // Layer 0-5
        layerFailureCount: [0, 0, 0, 0, 0, 0],
        loadTimeHistory: [],
        cacheHitHistory: [],
        disabledLayers: {}, // { layerId: disabledUntilTimestamp }
        startTime: Date.now(),
        lastHealthScore: 100
    };

    // Shorthand reference
    const HEALTH = window.__GPBC_DEVOTION_HEALTH__;

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function log(message, ...args) {
        if (CONFIG.DEV_MODE) {
            console.log(`[DevotionHealth] ${message}`, ...args);
        }
    }

    function warn(message, ...args) {
        if (CONFIG.DEV_MODE) {
            console.warn(`[DevotionHealth] ${message}`, ...args);
        }
    }

    function error(message, ...args) {
        if (CONFIG.DEV_MODE) {
            console.error(`[DevotionHealth] ${message}`, ...args);
        }
    }

    function safeExecute(fn, fallback = null) {
        try {
            return fn();
        } catch (e) {
            error('Safe execution failed:', e.message);
            return fallback;
        }
    }

    // ========================================================================
    // HEALTH SCORE CALCULATION
    // ========================================================================

    function calculateHealthScore(layer, loadTimeMs, isFromCache) {
        let score = 100;

        // Layer penalties
        switch (layer) {
            case 0: // Offline bundle
                score -= 0;
                break;
            case 1: // Primary GitHub
                score -= 0;
                break;
            case 2: // Monthly fallback
                score -= 10;
                break;
            case 3: // CDN backup
                score -= 15;
                break;
            case 4: // Local cache
                score -= 20;
                break;
            case 5: // Emergency fallback
                score -= 40;
                break;
        }

        // Load time penalty
        if (loadTimeMs > 2000) {
            score -= 10;
        } else if (loadTimeMs > 5000) {
            score -= 20;
        }

        // Failure streak penalty
        if (HEALTH.failureStreak > 0) {
            score -= Math.min(HEALTH.failureStreak * 5, 20);
        }

        // Cache usage is good for performance
        if (isFromCache && layer === 4) {
            score += 5; // Bonus for fast cache hits
        }

        return Math.max(0, Math.min(100, score));
    }

    function getHealthStatus(score) {
        if (score >= CONFIG.HEALTH_SCORE_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
        if (score >= CONFIG.HEALTH_SCORE_THRESHOLDS.GOOD) return 'GOOD';
        if (score >= CONFIG.HEALTH_SCORE_THRESHOLDS.DEGRADED) return 'DEGRADED';
        if (score >= CONFIG.HEALTH_SCORE_THRESHOLDS.CRITICAL) return 'CRITICAL';
        return 'EMERGENCY';
    }

    // ========================================================================
    // FAILURE STREAK MANAGEMENT
    // ========================================================================

    function checkAndDisableFailingLayer(layer) {
        safeExecute(() => {
            if (HEALTH.failureStreak >= CONFIG.FAILURE_STREAK_THRESHOLD) {
                const disableUntil = Date.now() + CONFIG.LAYER_DISABLE_DURATION_MS;
                HEALTH.disabledLayers[layer] = disableUntil;
                
                warn(`Layer ${layer} disabled for 1 hour due to ${HEALTH.failureStreak} consecutive failures`);
                
                // Dispatch auto-recovery signal
                window.dispatchEvent(new CustomEvent('GPBC_DEVOTION_AUTO_RECOVERY', {
                    detail: {
                        action: 'layer_disabled',
                        layer,
                        disabledUntil: new Date(disableUntil).toISOString(),
                        reason: 'failure_streak_threshold'
                    }
                }));
            }
        });
    }

    function isLayerDisabled(layer) {
        return safeExecute(() => {
            if (!HEALTH.disabledLayers[layer]) return false;
            
            const now = Date.now();
            if (now > HEALTH.disabledLayers[layer]) {
                // Re-enable layer
                delete HEALTH.disabledLayers[layer];
                log(`Layer ${layer} re-enabled after cooldown period`);
                return false;
            }
            
            return true;
        }, false);
    }

    // ========================================================================
    // CACHE HIT RATE TRACKING
    // ========================================================================

    function updateCacheHitRate(wasCache) {
        safeExecute(() => {
            HEALTH.cacheHitHistory.push(wasCache ? 1 : 0);
            
            // Keep only last N loads
            if (HEALTH.cacheHitHistory.length > CONFIG.CACHE_HIT_WINDOW) {
                HEALTH.cacheHitHistory.shift();
            }
            
            // Calculate rate
            const hits = HEALTH.cacheHitHistory.filter(x => x === 1).length;
            HEALTH.cacheHitRate = HEALTH.cacheHitHistory.length > 0
                ? (hits / HEALTH.cacheHitHistory.length) * 100
                : 0;
        });
    }

    // ========================================================================
    // LOAD TIME TRACKING
    // ========================================================================

    function trackLoadTime(loadTimeMs) {
        safeExecute(() => {
            HEALTH.loadTimeHistory.push(loadTimeMs);
            
            // Keep only last 100 loads
            if (HEALTH.loadTimeHistory.length > 100) {
                HEALTH.loadTimeHistory.shift();
            }
        });
    }

    function getAverageLoadTime() {
        return safeExecute(() => {
            if (HEALTH.loadTimeHistory.length === 0) return 0;
            
            const sum = HEALTH.loadTimeHistory.reduce((a, b) => a + b, 0);
            return Math.round(sum / HEALTH.loadTimeHistory.length);
        }, 0);
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    function initEventListeners() {
        safeExecute(() => {
            // Listen for layer success events
            window.addEventListener('GPBC_DEVOTION_LAYER_SUCCESS', (event) => {
                handleLayerSuccess(event.detail);
            });

            // Listen for layer failure events
            window.addEventListener('GPBC_DEVOTION_LAYER_FAIL', (event) => {
                handleLayerFailure(event.detail);
            });

            // Listen for mesh load complete events
            window.addEventListener('GPBC_DEVOTION_MESH_COMPLETE', (event) => {
                handleMeshComplete(event.detail);
            });
        });
    }

    function handleLayerSuccess(detail) {
        safeExecute(() => {
            const { layer, source, loadTime, dataCount } = detail;
            
            // Reset failure streak on any success
            HEALTH.failureStreak = 0;
            HEALTH.lastSuccessTimestamp = Date.now();
            HEALTH.totalSuccess++;
            HEALTH.layerSuccessCount[layer] = (HEALTH.layerSuccessCount[layer] || 0) + 1;
            
            log(`Layer ${layer} (${source}) SUCCESS - ${dataCount} devotions in ${loadTime}ms`);
        });
    }

    function handleLayerFailure(detail) {
        safeExecute(() => {
            const { layer, reason, error } = detail;
            
            HEALTH.failureStreak++;
            HEALTH.totalFailures++;
            HEALTH.lastErrorMessage = reason || error || 'Unknown error';
            HEALTH.layerFailureCount[layer] = (HEALTH.layerFailureCount[layer] || 0) + 1;
            
            warn(`Layer ${layer} FAILED - ${reason || error}`);
            
            // Check if we should disable this layer
            checkAndDisableFailingLayer(layer);
        });
    }

    function handleMeshComplete(detail) {
        safeExecute(() => {
            const { layer, source, loadTime, dataCount } = detail;
            
            HEALTH.lastLoadLayer = layer;
            HEALTH.lastLoadTimeMs = loadTime;
            HEALTH.totalLoads++;
            
            // Track metrics
            const isFromCache = source === 'local-cache';
            updateCacheHitRate(isFromCache);
            trackLoadTime(loadTime);
            
            // Calculate health score
            const healthScore = calculateHealthScore(layer, loadTime, isFromCache);
            HEALTH.lastHealthScore = healthScore;
            
            const status = getHealthStatus(healthScore);
            log(`Health Score: ${healthScore} (${status})`);
            log(`Layer: ${layer} (${source})`);
            log(`Failures: ${HEALTH.failureStreak}`);
            
            // Send telemetry (non-blocking)
            sendTelemetry({
                event: 'mesh_complete',
                layer,
                source,
                loadTime,
                dataCount,
                healthScore,
                status
            });
        });
    }

    // ========================================================================
    // TELEMETRY EXPORT
    // ========================================================================

    function sendTelemetry(data) {
        if (!CONFIG.ENABLE_BEACON) return;
        
        safeExecute(() => {
            // Only send if beacon API available
            if (typeof navigator.sendBeacon !== 'function') return;
            
            const payload = {
                timestamp: new Date().toISOString(),
                ...data,
                health: {
                    score: HEALTH.lastHealthScore,
                    totalLoads: HEALTH.totalLoads,
                    successRate: HEALTH.totalLoads > 0 
                        ? ((HEALTH.totalSuccess / HEALTH.totalLoads) * 100).toFixed(2)
                        : 0,
                    cacheHitRate: HEALTH.cacheHitRate.toFixed(2),
                    avgLoadTime: getAverageLoadTime()
                }
            };
            
            // Send beacon (fails silently if endpoint doesn't exist)
            navigator.sendBeacon(
                CONFIG.TELEMETRY_ENDPOINT,
                JSON.stringify(payload)
            );
        });
    }

    // ========================================================================
    // PRODUCTION DEBUG SNAPSHOT
    // ========================================================================

    function devotionHealthReport() {
        return safeExecute(() => {
            const now = Date.now();
            const uptimeSeconds = Math.floor((now - HEALTH.startTime) / 1000);
            const lastSuccessAgoSeconds = HEALTH.lastSuccessTimestamp
                ? Math.floor((now - HEALTH.lastSuccessTimestamp) / 1000)
                : null;
            
            const report = {
                // Summary
                healthScore: HEALTH.lastHealthScore,
                healthStatus: getHealthStatus(HEALTH.lastHealthScore),
                
                // Current state
                lastLayerUsed: HEALTH.lastLoadLayer,
                lastLoadTimeMs: HEALTH.lastLoadTimeMs,
                failureStreak: HEALTH.failureStreak,
                lastSuccessAgoSeconds,
                lastErrorMessage: HEALTH.lastErrorMessage,
                
                // Statistics
                totalLoads: HEALTH.totalLoads,
                totalSuccess: HEALTH.totalSuccess,
                totalFailures: HEALTH.totalFailures,
                successRate: HEALTH.totalLoads > 0 
                    ? ((HEALTH.totalSuccess / HEALTH.totalLoads) * 100).toFixed(2) + '%'
                    : 'N/A',
                
                // Performance
                avgLoadTime: getAverageLoadTime() + 'ms',
                cacheHitRate: HEALTH.cacheHitRate.toFixed(2) + '%',
                
                // Cache health
                cacheHealth: {
                    hitRate: HEALTH.cacheHitRate.toFixed(2) + '%',
                    recentHits: HEALTH.cacheHitHistory.slice(-10)
                },
                
                // Layer statistics
                layerStats: {
                    layer0_offlineBundle: {
                        success: HEALTH.layerSuccessCount[0] || 0,
                        failures: HEALTH.layerFailureCount[0] || 0
                    },
                    layer1_primaryGitHub: {
                        success: HEALTH.layerSuccessCount[1] || 0,
                        failures: HEALTH.layerFailureCount[1] || 0
                    },
                    layer2_monthlyFallback: {
                        success: HEALTH.layerSuccessCount[2] || 0,
                        failures: HEALTH.layerFailureCount[2] || 0
                    },
                    layer3_cdnBackup: {
                        success: HEALTH.layerSuccessCount[3] || 0,
                        failures: HEALTH.layerFailureCount[3] || 0
                    },
                    layer4_localCache: {
                        success: HEALTH.layerSuccessCount[4] || 0,
                        failures: HEALTH.layerFailureCount[4] || 0
                    },
                    layer5_emergency: {
                        success: HEALTH.layerSuccessCount[5] || 0,
                        failures: HEALTH.layerFailureCount[5] || 0
                    }
                },
                
                // Auto-recovery
                disabledLayers: Object.keys(HEALTH.disabledLayers).map(layer => ({
                    layer: parseInt(layer),
                    disabledUntil: new Date(HEALTH.disabledLayers[layer]).toISOString(),
                    remainingSeconds: Math.floor((HEALTH.disabledLayers[layer] - now) / 1000)
                })),
                
                // System info
                uptimeSeconds,
                uptimeHuman: formatUptime(uptimeSeconds)
            };
            
            // Display in console
            console.group('📊 Devotion Mesh Health Report');
            console.log('Health Score:', report.healthScore, `(${report.healthStatus})`);
            console.log('Last Layer:', report.lastLayerUsed);
            console.log('Avg Load Time:', report.avgLoadTime);
            console.log('Cache Hit Rate:', report.cacheHitRate);
            console.log('Success Rate:', report.successRate);
            console.log('Failure Streak:', report.failureStreak);
            if (report.lastErrorMessage) {
                console.log('Last Error:', report.lastErrorMessage);
            }
            if (report.disabledLayers.length > 0) {
                console.warn('Disabled Layers:', report.disabledLayers);
            }
            console.groupEnd();
            
            return report;
        }, {
            error: 'Failed to generate health report',
            healthScore: 0
        });
    }

    function formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // ========================================================================
    // RESET FUNCTIONS (FOR TESTING)
    // ========================================================================

    function resetHealthMetrics() {
        safeExecute(() => {
            HEALTH.failureStreak = 0;
            HEALTH.totalLoads = 0;
            HEALTH.totalSuccess = 0;
            HEALTH.totalFailures = 0;
            HEALTH.layerSuccessCount = [0, 0, 0, 0, 0, 0];
            HEALTH.layerFailureCount = [0, 0, 0, 0, 0, 0];
            HEALTH.loadTimeHistory = [];
            HEALTH.cacheHitHistory = [];
            HEALTH.disabledLayers = {};
            HEALTH.lastHealthScore = 100;
            HEALTH.lastErrorMessage = null;
            
            log('Health metrics reset');
        });
    }

    function enableAllLayers() {
        safeExecute(() => {
            HEALTH.disabledLayers = {};
            log('All layers re-enabled');
        });
    }

    // ========================================================================
    // PERIODIC HEALTH CHECK
    // ========================================================================

    function startPeriodicHealthCheck() {
        safeExecute(() => {
            // Check every 5 minutes
            setInterval(() => {
                const now = Date.now();
                
                // Re-enable any layers whose cooldown expired
                Object.keys(HEALTH.disabledLayers).forEach(layer => {
                    if (now > HEALTH.disabledLayers[layer]) {
                        delete HEALTH.disabledLayers[layer];
                        log(`Layer ${layer} auto-recovery: cooldown expired`);
                        
                        window.dispatchEvent(new CustomEvent('GPBC_DEVOTION_AUTO_RECOVERY', {
                            detail: {
                                action: 'layer_enabled',
                                layer: parseInt(layer),
                                reason: 'cooldown_expired'
                            }
                        }));
                    }
                });
                
                // Log health summary if in dev mode
                if (CONFIG.DEV_MODE && HEALTH.totalLoads > 0) {
                    log(`Periodic check - Score: ${HEALTH.lastHealthScore}, Loads: ${HEALTH.totalLoads}, Success Rate: ${((HEALTH.totalSuccess / HEALTH.totalLoads) * 100).toFixed(1)}%`);
                }
            }, 300000); // 5 minutes
        });
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function init() {
        safeExecute(() => {
            log('Devotion Mesh Observability initialized');
            initEventListeners();
            startPeriodicHealthCheck();
            
            // Expose debug helpers
            window.devotionHealthReport = devotionHealthReport;
            window.resetDevotionHealth = resetHealthMetrics;
            window.enableAllDevotionLayers = enableAllLayers;
            
            // Mark as initialized
            window.__GPBC_DEVOTION_OBSERVABILITY_READY__ = true;
        });
    }

    // ========================================================================
    // AUTO-INITIALIZE
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
