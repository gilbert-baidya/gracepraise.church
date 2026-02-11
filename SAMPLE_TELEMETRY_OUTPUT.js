/**
 * ============================================================================
 * SAMPLE TELEMETRY EVENT OUTPUT
 * Real-world examples of observability events from the Devotion Mesh system
 * ============================================================================
 */

// ============================================================================
// SCENARIO 1: NORMAL OPERATION (PRIMARY GITHUB SUCCESS)
// ============================================================================

// EVENT 1: Layer 1 attempts load
console.log('[DevotionMesh] Layer 1: Primary GitHub JSON - Attempting...');

// EVENT 2: Layer 1 succeeds
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_SUCCESS", {
        detail: {
            layer: 1,
            source: 'primary-github',
            loadTime: 1234,
            dataCount: 365
        }
    })
);
console.log('[DevotionMesh] Layer 1: Primary GitHub JSON SUCCESS - 365 devotions loaded');

// EVENT 3: Mesh completes
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_MESH_COMPLETE", {
        detail: {
            layer: 1,
            source: 'primary-github',
            loadTime: 1234,
            dataCount: 365,
            year: 2026
        }
    })
);
console.log('[DevotionHealth] Health Score: 100 (EXCELLENT)');
console.log('[DevotionHealth] Layer: 1 (primary-github)');
console.log('[DevotionHealth] Failures: 0');

// TELEMETRY STATE AFTER EVENT:
window.__GPBC_DEVOTION_HEALTH__ = {
    lastLoadLayer: 1,
    lastLoadTimeMs: 1234,
    lastSuccessTimestamp: 1707656789012,
    failureStreak: 0,
    cacheHitRate: 0,
    lastErrorMessage: null,
    totalLoads: 1,
    totalSuccess: 1,
    totalFailures: 0,
    layerSuccessCount: [0, 1, 0, 0, 0, 0],
    layerFailureCount: [0, 0, 0, 0, 0, 0],
    lastHealthScore: 100
};

// BEACON PAYLOAD SENT:
{
    "timestamp": "2026-02-11T12:34:56.789Z",
    "event": "mesh_complete",
    "layer": 1,
    "source": "primary-github",
    "loadTime": 1234,
    "dataCount": 365,
    "healthScore": 100,
    "status": "EXCELLENT",
    "health": {
        "score": 100,
        "totalLoads": 1,
        "successRate": "100.00",
        "cacheHitRate": "0.00",
        "avgLoadTime": 1234
    }
}


// ============================================================================
// SCENARIO 2: LAYER 1 FAILS → LAYER 2 SUCCEEDS
// ============================================================================

// EVENT 1: Layer 1 fails
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 1,
            reason: 'HTTP 404',
            error: 'Error: HTTP 404'
        }
    })
);
console.log('[DevotionMesh] Layer 1: Primary GitHub JSON FAILED → HTTP 404');
console.log('[DevotionHealth] Layer 1 FAILED - HTTP 404');

// EVENT 2: Layer 2 succeeds
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_SUCCESS", {
        detail: {
            layer: 2,
            source: 'monthly-fallback',
            loadTime: 2456,
            dataCount: 365
        }
    })
);
console.log('[DevotionMesh] Layer 2: Monthly JSON Fallback SUCCESS - 365 devotions from 12 months');

// EVENT 3: Mesh completes
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_MESH_COMPLETE", {
        detail: {
            layer: 2,
            source: 'monthly-fallback',
            loadTime: 2456,
            dataCount: 365,
            year: 2026
        }
    })
);
console.log('[DevotionHealth] Health Score: 90 (EXCELLENT)');
console.log('[DevotionHealth] Layer: 2 (monthly-fallback)');
console.log('[DevotionHealth] Failures: 1');

// TELEMETRY STATE AFTER EVENT:
window.__GPBC_DEVOTION_HEALTH__ = {
    lastLoadLayer: 2,
    lastLoadTimeMs: 2456,
    lastSuccessTimestamp: 1707656789012,
    failureStreak: 0,  // Reset on Layer 2 success
    cacheHitRate: 0,
    lastErrorMessage: 'HTTP 404',
    totalLoads: 2,
    totalSuccess: 2,
    totalFailures: 1,
    layerSuccessCount: [0, 1, 1, 0, 0, 0],
    layerFailureCount: [0, 1, 0, 0, 0, 0],
    lastHealthScore: 90
};


// ============================================================================
// SCENARIO 3: CACHE HIT (LAYER 4)
// ============================================================================

// EVENT 1: Layer 1 skipped (disabled)
console.log('[DevotionMesh] Layer 1 disabled, skipping...');

// EVENT 2: Layer 2 fails
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 2,
            reason: 'Network timeout',
            error: 'Error: Network timeout'
        }
    })
);

// EVENT 3: Layer 3 fails
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 3,
            reason: 'CDN unreachable',
            error: 'Error: CDN unreachable'
        }
    })
);

// EVENT 4: Layer 4 (cache) succeeds
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_SUCCESS", {
        detail: {
            layer: 4,
            source: 'local-cache',
            loadTime: 45,  // Fast cache hit!
            dataCount: 365
        }
    })
);
console.log('[DevotionMesh] Layer 4: Local Cache SUCCESS - 365 devotions from cache');

// EVENT 5: Mesh completes
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_MESH_COMPLETE", {
        detail: {
            layer: 4,
            source: 'local-cache',
            loadTime: 45,
            dataCount: 365,
            year: 2026
        }
    })
);
console.log('[DevotionHealth] Health Score: 85 (GOOD)');  // -20 for cache, +5 bonus for fast load
console.log('[DevotionHealth] Layer: 4 (local-cache)');
console.log('[DevotionHealth] Failures: 2');


// ============================================================================
// SCENARIO 4: AUTO-RECOVERY TRIGGERED (5 CONSECUTIVE FAILURES)
// ============================================================================

// Layer 1 fails 5 times consecutively
for (let i = 1; i <= 5; i++) {
    window.dispatchEvent(
        new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
            detail: {
                layer: 1,
                reason: `HTTP 503 (attempt ${i})`,
                error: 'Error: HTTP 503'
            }
        })
    );
}

// After 5th failure, auto-recovery triggers
console.log('[DevotionHealth] Layer 1 disabled for 1 hour due to 5 consecutive failures');

window.dispatchEvent(
    new CustomEvent('GPBC_DEVOTION_AUTO_RECOVERY', {
        detail: {
            action: 'layer_disabled',
            layer: 1,
            disabledUntil: '2026-02-11T13:34:56Z',
            reason: 'failure_streak_threshold'
        }
    })
);

// TELEMETRY STATE AFTER EVENT:
window.__GPBC_DEVOTION_HEALTH__ = {
    failureStreak: 5,
    disabledLayers: {
        1: 1707660896000  // Timestamp 1 hour from now
    },
    lastErrorMessage: 'HTTP 503',
    totalFailures: 5,
    layerFailureCount: [0, 5, 0, 0, 0, 0]
};


// ============================================================================
// SCENARIO 5: AUTO-RECOVERY RE-ENABLES LAYER
// ============================================================================

// After 1 hour, periodic health check runs
console.log('[DevotionHealth] Layer 1 auto-recovery: cooldown expired');

window.dispatchEvent(
    new CustomEvent('GPBC_DEVOTION_AUTO_RECOVERY', {
        detail: {
            action: 'layer_enabled',
            layer: 1,
            reason: 'cooldown_expired'
        }
    })
);

// TELEMETRY STATE AFTER EVENT:
window.__GPBC_DEVOTION_HEALTH__.disabledLayers = {};  // Layer 1 re-enabled


// ============================================================================
// SCENARIO 6: EMERGENCY FALLBACK (LAYER 5)
// ============================================================================

// All layers fail except emergency
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 1,
            reason: 'Network offline',
            error: 'Error: Network offline'
        }
    })
);
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 2,
            reason: 'Network offline',
            error: 'Error: Network offline'
        }
    })
);
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 3,
            reason: 'Network offline',
            error: 'Error: Network offline'
        }
    })
);
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 4,
            reason: 'No cache found',
            error: 'Error: No cache found'
        }
    })
);

// Layer 5 always succeeds
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_SUCCESS", {
        detail: {
            layer: 5,
            source: 'emergency-fallback',
            loadTime: 5,  // Instant
            dataCount: 1
        }
    })
);
console.log('[DevotionMesh] Layer 5: Emergency Fallback SUCCESS - Emergency devotion loaded');

// EVENT: Mesh completes
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_MESH_COMPLETE", {
        detail: {
            layer: 5,
            source: 'emergency-fallback',
            loadTime: 5,
            dataCount: 1,
            year: 2026
        }
    })
);
console.log('[DevotionHealth] Health Score: 60 (DEGRADED)');
console.log('[DevotionHealth] Layer: 5 (emergency-fallback)');
console.log('[DevotionHealth] Failures: 4');


// ============================================================================
// SCENARIO 7: HEALTH REPORT SNAPSHOT
// ============================================================================

// User calls debug helper
const report = window.devotionHealthReport();

// CONSOLE OUTPUT:
console.group('📊 Devotion Mesh Health Report');
console.log('Health Score:', 98, '(EXCELLENT)');
console.log('Last Layer:', 1);
console.log('Avg Load Time:', '1456ms');
console.log('Cache Hit Rate:', '23.81%');
console.log('Success Rate:', '100.00%');
console.log('Failure Streak:', 0);
console.groupEnd();

// RETURNED OBJECT:
{
    "healthScore": 98,
    "healthStatus": "EXCELLENT",
    "lastLayerUsed": 1,
    "lastLoadTimeMs": 1234,
    "failureStreak": 0,
    "lastSuccessAgoSeconds": 42,
    "lastErrorMessage": null,
    "totalLoads": 42,
    "totalSuccess": 42,
    "totalFailures": 0,
    "successRate": "100.00%",
    "avgLoadTime": "1456ms",
    "cacheHitRate": "23.81%",
    "cacheHealth": {
        "hitRate": "23.81%",
        "recentHits": [0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
    },
    "layerStats": {
        "layer0_offlineBundle": { "success": 0, "failures": 0 },
        "layer1_primaryGitHub": { "success": 42, "failures": 0 },
        "layer2_monthlyFallback": { "success": 0, "failures": 0 },
        "layer3_cdnBackup": { "success": 0, "failures": 0 },
        "layer4_localCache": { "success": 0, "failures": 0 },
        "layer5_emergency": { "success": 0, "failures": 0 }
    },
    "disabledLayers": [],
    "uptimeSeconds": 3600,
    "uptimeHuman": "1h 0m 0s"
}


// ============================================================================
// SCENARIO 8: PERIODIC HEALTH CHECK (DEV MODE)
// ============================================================================

// Every 5 minutes, automatic health check runs
console.log('[DevotionHealth] Periodic check - Score: 98, Loads: 42, Success Rate: 100.0%');

// Checks for expired cooldowns and re-enables layers
// Only logs if DEV_MODE = true


// ============================================================================
// SCENARIO 9: TELEMETRY EXPORT VIA BEACON API
// ============================================================================

// After mesh completes, beacon is sent
navigator.sendBeacon(
    '/api/devotion-health',
    JSON.stringify({
        "timestamp": "2026-02-11T14:30:00.123Z",
        "event": "mesh_complete",
        "layer": 1,
        "source": "primary-github",
        "loadTime": 1234,
        "dataCount": 365,
        "healthScore": 100,
        "status": "EXCELLENT",
        "health": {
            "score": 100,
            "totalLoads": 42,
            "successRate": "100.00",
            "cacheHitRate": "23.81",
            "avgLoadTime": 1456
        }
    })
);

// BEHAVIOR:
// - Async (non-blocking)
// - Fails silently if endpoint doesn't exist
// - Never impacts devotion loading


// ============================================================================
// SCENARIO 10: OBSERVABILITY FAILURE (GRACEFUL DEGRADATION)
// ============================================================================

// If observability crashes, mesh continues normally
try {
    // Telemetry operation fails
    throw new Error('Telemetry crashed');
} catch (e) {
    // Silent failure
    console.error('[DevotionHealth] Safe execution failed:', e.message);
    // Mesh loader unaffected
}

// RESULT:
// - Devotion still loads
// - User sees normal content
// - Zero visible errors
// - Mesh operates independently


// ============================================================================
// REAL-WORLD CONSOLE OUTPUT EXAMPLE (DEV MODE)
// ============================================================================

/*
[DevotionHealth] Devotion Mesh Observability initialized
[DevotionMesh] ========================================
[DevotionMesh] Starting Data Mesh Load for year 2026
[DevotionMesh] ========================================
[DevotionMesh] Layer 1: Primary GitHub JSON - Attempting...
[DevotionMesh] Layer 1: Primary GitHub JSON SUCCESS - 365 devotions loaded
[DevotionMesh] ========================================
[DevotionMesh] ✅ Data Mesh Load COMPLETE
[DevotionMesh] Layer Used: 1 (primary-github)
[DevotionMesh] Devotions: 365
[DevotionMesh] Load Time: 1234ms
[DevotionMesh] ========================================
[DevotionHealth] Health Score: 100 (EXCELLENT)
[DevotionHealth] Layer: 1 (primary-github)
[DevotionHealth] Failures: 0
*/


// ============================================================================
// REAL-WORLD CONSOLE OUTPUT EXAMPLE (PRODUCTION - SILENT)
// ============================================================================

/*
(No console output - DEV_MODE = false)
*/


// ============================================================================
// TESTING COMMANDS
// ============================================================================

// Get full health report
window.devotionHealthReport();

// Check raw telemetry state
window.__GPBC_DEVOTION_HEALTH__;

// Reset all metrics (testing)
window.resetDevotionHealth();

// Re-enable all disabled layers
window.enableAllDevotionLayers();

// Check if observability loaded
window.__GPBC_DEVOTION_OBSERVABILITY_READY__;  // true

// Clear devotion cache
window.clearDevotionCache();

// Get mesh debug info
window.debugDevotionMesh();


// ============================================================================
// EVENT LISTENER EXAMPLES
// ============================================================================

// Listen for all layer success events
window.addEventListener('GPBC_DEVOTION_LAYER_SUCCESS', (event) => {
    console.log('✅ Layer', event.detail.layer, 'succeeded in', event.detail.loadTime, 'ms');
    console.log('   Source:', event.detail.source);
    console.log('   Data count:', event.detail.dataCount);
});

// Listen for all layer failure events
window.addEventListener('GPBC_DEVOTION_LAYER_FAIL', (event) => {
    console.warn('❌ Layer', event.detail.layer, 'failed:', event.detail.reason);
});

// Listen for mesh completion
window.addEventListener('GPBC_DEVOTION_MESH_COMPLETE', (event) => {
    console.log('🎉 Mesh complete! Used layer', event.detail.layer);
    console.log('   Total time:', event.detail.loadTime, 'ms');
    console.log('   Health:', window.__GPBC_DEVOTION_HEALTH__.lastHealthScore);
});

// Listen for auto-recovery signals
window.addEventListener('GPBC_DEVOTION_AUTO_RECOVERY', (event) => {
    if (event.detail.action === 'layer_disabled') {
        console.warn('🛡️ Auto-recovery: Layer', event.detail.layer, 'disabled until', event.detail.disabledUntil);
    } else if (event.detail.action === 'layer_enabled') {
        console.log('✅ Auto-recovery: Layer', event.detail.layer, 're-enabled');
    }
});
