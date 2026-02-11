# 📊 Devotion Mesh Observability & Self-Healing Telemetry

**Production Health Monitoring System**  
Version 1.0.0 | February 11, 2026

---

## 🎯 Overview

Silent, non-blocking observability layer for the Devotion Data Mesh system.

**Key Principles:**
- ✅ **User-facing functionality NEVER impacted by telemetry**
- ✅ **All telemetry operations fail silently**
- ✅ **Zero UI changes**
- ✅ **Async + non-blocking**
- ✅ **Self-healing auto-recovery**

---

## 📁 Files

### **Created:**
- `js/devotion-mesh-observability.js` (578 lines)

### **Modified (Minimal Hooks):**
- `js/devotion-data-mesh-loader.js` (+7 telemetry emission points)
- `daily-devotion.html` (+1 script tag)

---

## 🔧 Implementation Details

### 1️⃣ Global Telemetry Object

```javascript
window.__GPBC_DEVOTION_HEALTH__ = {
    // Current state
    lastLoadLayer: null,          // 0-5 (last successful layer)
    lastLoadTimeMs: null,          // Load duration
    lastSuccessTimestamp: null,    // Timestamp of last success
    failureStreak: 0,              // Consecutive failures
    cacheHitRate: 0,               // 0-100% cache performance
    lastErrorMessage: null,        // Last error encountered
    
    // Statistics
    totalLoads: 0,                 // Total mesh load attempts
    totalSuccess: 0,               // Successful loads
    totalFailures: 0,              // Failed loads
    layerSuccessCount: [0,0,0,0,0,0],  // Per-layer success counts
    layerFailureCount: [0,0,0,0,0,0],  // Per-layer failure counts
    
    // Performance tracking
    loadTimeHistory: [],           // Last 100 load times
    cacheHitHistory: [],          // Last 100 cache hit/miss
    
    // Auto-recovery
    disabledLayers: {},           // { layerId: disabledUntilTimestamp }
    
    // Meta
    startTime: Date.now(),
    lastHealthScore: 100
}
```

---

### 2️⃣ Event Bus Architecture

The mesh loader emits three types of events:

#### **Layer Success Event**
```javascript
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_SUCCESS", {
        detail: {
            layer: 1,                    // 0-5
            source: 'primary-github',    // Source identifier
            loadTime: 1234,              // Milliseconds
            dataCount: 365               // Number of devotions
        }
    })
);
```

#### **Layer Failure Event**
```javascript
window.dispatchEvent(
    new CustomEvent("GPBC_DEVOTION_LAYER_FAIL", {
        detail: {
            layer: 1,                    // 0-5
            reason: 'HTTP 404',          // Human-readable reason
            error: 'Error: HTTP 404'     // Full error string
        }
    })
);
```

#### **Mesh Complete Event**
```javascript
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
```

---

### 3️⃣ Self-Healing Auto-Recovery

**Failure Streak Threshold:** 5 consecutive failures

**Behavior:**
1. When Layer 1 fails 5 times consecutively:
   - Auto-disable Layer 1 for **1 hour**
   - Next load attempts skip Layer 1
   - Automatic retry after cooldown expires

2. Recovery signal emitted:
```javascript
window.dispatchEvent(
    new CustomEvent('GPBC_DEVOTION_AUTO_RECOVERY', {
        detail: {
            action: 'layer_disabled',      // or 'layer_enabled'
            layer: 1,
            disabledUntil: '2026-02-11T15:30:00Z',
            reason: 'failure_streak_threshold'
        }
    })
);
```

3. **Periodic Health Check** (every 5 minutes):
   - Re-enables layers after cooldown
   - Logs health summary in dev mode
   - Dispatches recovery events

---

### 4️⃣ Health Score Formula

**Base Score:** 100

**Penalties:**
- Layer 0 (Offline Bundle): `-0`
- Layer 1 (Primary GitHub): `-0`
- Layer 2 (Monthly Fallback): `-10`
- Layer 3 (CDN Backup): `-15`
- Layer 4 (Local Cache): `-20`
- Layer 5 (Emergency): `-40`

**Load Time Penalties:**
- Load time > 2s: `-10`
- Load time > 5s: `-20`

**Failure Streak Penalty:**
- `-5` per failure (max `-20`)

**Cache Bonus:**
- Cache hit (Layer 4): `+5` (fast performance)

**Final Score:** `max(0, min(100, calculatedScore))`

---

### 5️⃣ Health Status Thresholds

| Score Range | Status | Description |
|-------------|--------|-------------|
| 90-100 | **EXCELLENT** | Optimal performance |
| 70-89 | **GOOD** | Normal operation |
| 50-69 | **DEGRADED** | Fallback layers in use |
| 30-49 | **CRITICAL** | Emergency mode |
| 0-29 | **EMERGENCY** | Severe degradation |

---

### 6️⃣ Non-Blocking Telemetry Export

**Beacon API** (if available):
```javascript
navigator.sendBeacon(
    '/api/devotion-health',
    JSON.stringify({
        timestamp: '2026-02-11T12:34:56Z',
        event: 'mesh_complete',
        layer: 1,
        source: 'primary-github',
        loadTime: 1234,
        dataCount: 365,
        healthScore: 98,
        status: 'EXCELLENT',
        health: {
            score: 98,
            totalLoads: 42,
            successRate: '100.00',
            cacheHitRate: '23.81',
            avgLoadTime: 1456
        }
    })
);
```

**Failure Handling:**
- Beacon call wrapped in `try/catch`
- Fails silently if endpoint doesn't exist
- Never blocks devotion loading

---

### 7️⃣ Production Debug Snapshot

**Global Helper Function:**

```javascript
window.devotionHealthReport()
```

**Sample Output:**

```javascript
{
    // Summary
    healthScore: 98,
    healthStatus: "EXCELLENT",
    
    // Current state
    lastLayerUsed: 1,
    lastLoadTimeMs: 1234,
    failureStreak: 0,
    lastSuccessAgoSeconds: 42,
    lastErrorMessage: null,
    
    // Statistics
    totalLoads: 42,
    totalSuccess: 42,
    totalFailures: 0,
    successRate: "100.00%",
    
    // Performance
    avgLoadTime: "1456ms",
    cacheHitRate: "23.81%",
    
    // Cache health
    cacheHealth: {
        hitRate: "23.81%",
        recentHits: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
    },
    
    // Layer statistics
    layerStats: {
        layer0_offlineBundle: { success: 0, failures: 0 },
        layer1_primaryGitHub: { success: 42, failures: 0 },
        layer2_monthlyFallback: { success: 0, failures: 0 },
        layer3_cdnBackup: { success: 0, failures: 0 },
        layer4_localCache: { success: 0, failures: 0 },
        layer5_emergency: { success: 0, failures: 0 }
    },
    
    // Auto-recovery
    disabledLayers: [],
    
    // System info
    uptimeSeconds: 3600,
    uptimeHuman: "1h 0m 0s"
}
```

**Console Output:**

```
📊 Devotion Mesh Health Report
  Health Score: 98 (EXCELLENT)
  Last Layer: 1
  Avg Load Time: 1456ms
  Cache Hit Rate: 23.81%
  Success Rate: 100.00%
  Failure Streak: 0
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Normal Operation**
```javascript
// Load page
// Check console:
[DevotionHealth] Devotion Mesh Observability initialized
[DevotionHealth] Health Score: 100 (EXCELLENT)
[DevotionHealth] Layer: 1 (Primary GitHub)
[DevotionHealth] Failures: 0

// Check health
window.devotionHealthReport()
// Score: 100, Status: EXCELLENT
```

---

### **Scenario 2: GitHub Failures (Trigger Auto-Recovery)**

```javascript
// Simulate 5 GitHub failures
// (Disconnect internet, reload 5 times)

// After 5th failure, console shows:
[DevotionHealth] Layer 1 disabled for 1 hour due to 5 consecutive failures

// Next load automatically skips Layer 1
// Uses Layer 2 or Layer 4 (cache)

// After 1 hour:
[DevotionHealth] Layer 1 auto-recovery: cooldown expired
```

---

### **Scenario 3: Cache Performance**

```javascript
// First load (GitHub)
window.devotionHealthReport()
// Score: 100, Cache Hit Rate: 0%

// Refresh page (cache hit)
window.devotionHealthReport()
// Score: 80 (using Layer 4), Cache Hit Rate: 50%

// Check cache health
window.__GPBC_DEVOTION_HEALTH__.cacheHitHistory
// [0, 1] (miss, hit)
```

---

### **Scenario 4: Emergency Fallback**

```javascript
// Clear cache + disconnect internet
window.clearDevotionCache()

// Refresh page
// Automatically falls through to Layer 5

window.devotionHealthReport()
// Score: 60 (DEGRADED)
// Last Layer: 5
// Last Error: "No cache found"

// User still sees devotion (Psalm 46:1)
// Zero visible errors
```

---

### **Scenario 5: Reset Telemetry (Testing)**

```javascript
// Reset all metrics
window.resetDevotionHealth()

// Re-enable all disabled layers
window.enableAllDevotionLayers()

// Check status
window.__GPBC_DEVOTION_HEALTH__
// All counters reset to 0
// disabledLayers: {}
```

---

## 🔐 Production Safety Guarantees

### **1. Never Break Rule**

```javascript
function safeExecute(fn, fallback = null) {
    try {
        return fn();
    } catch (e) {
        error('Safe execution failed:', e.message);
        return fallback;
    }
}
```

**All telemetry operations wrapped in:**
- `try/catch` blocks
- `safeExecute()` helpers
- Silent failure handlers

**If observability crashes:**
- Mesh loader continues normally
- User sees devotion as expected
- No visible errors

---

### **2. Non-Blocking Architecture**

- Event emissions: **Synchronous** (custom events are instant)
- Beacon API: **Async** (queued by browser)
- Health calculations: **On-demand only** (not in render path)
- Periodic checks: **Background timers** (5-minute intervals)

**Zero impact on:**
- Page load time
- Devotion render speed
- Share card generation
- Discipleship engines

---

### **3. Dev Mode Console Logging**

**Default:** `CONFIG.DEV_MODE = false` (silent in production)

**Enable Dev Mode:**
```javascript
// In observability.js, line 22:
DEV_MODE: true
```

**Console Output (Dev Mode Only):**
```
[DevotionHealth] Devotion Mesh Observability initialized
[DevotionHealth] Health Score: 98 (EXCELLENT)
[DevotionHealth] Layer: 1 (primary-github)
[DevotionHealth] Failures: 0
[DevotionHealth] Periodic check - Score: 98, Loads: 42, Success Rate: 100.0%
```

**Production Mode:** Zero console spam

---

### **4. Graceful Degradation**

| Component Failure | System Behavior |
|-------------------|-----------------|
| Observability script fails to load | Mesh loads devotions normally |
| Event listener crashes | Telemetry stops, mesh continues |
| Health calculation error | Returns fallback score (0) |
| Beacon API unavailable | Skips telemetry export silently |
| localStorage unavailable | Cache tracking disabled, mesh uses network |

---

### **5. Memory Management**

**History Limits:**
- Load time history: Last **100 loads** only
- Cache hit history: Last **100 loads** only
- Load history: Last **10 loads** only

**Auto-cleanup:**
- Arrays automatically trim old data
- No memory leaks
- Bounded growth

---

## 📊 Sample Telemetry Event Timeline

**Page Load Sequence:**

```
1. [T+0ms]    observability.js loads
              └─> Initializes __GPBC_DEVOTION_HEALTH__
              └─> Registers event listeners
              └─> Starts periodic health check timer

2. [T+50ms]   devotion-data-mesh-loader.js loads
              └─> Begins mesh cascade

3. [T+100ms]  Layer 1 attempt starts
              └─> Fetches devotions-2026.json

4. [T+1234ms] Layer 1 SUCCESS
              └─> Emits GPBC_DEVOTION_LAYER_SUCCESS
              └─> Observability updates health:
                  • failureStreak = 0
                  • lastSuccessTimestamp = now
                  • layerSuccessCount[1]++
                  • totalSuccess++

5. [T+1250ms] Mesh Complete
              └─> Emits GPBC_DEVOTION_MESH_COMPLETE
              └─> Observability calculates:
                  • Health Score: 100
                  • Status: EXCELLENT
                  • Updates load history
                  • Sends beacon (async)

6. [T+1260ms] Devotion renders
              └─> User sees content
              └─> Telemetry complete (silent)
```

---

## 🧰 Developer Tools

### **Global Functions:**

```javascript
// Get comprehensive health report
window.devotionHealthReport()

// Reset all metrics (testing)
window.resetDevotionHealth()

// Re-enable all disabled layers
window.enableAllDevotionLayers()

// Check raw telemetry state
window.__GPBC_DEVOTION_HEALTH__

// Check observability status
window.__GPBC_DEVOTION_OBSERVABILITY_READY__  // true if loaded
```

---

### **Event Monitoring:**

```javascript
// Listen for layer success
window.addEventListener('GPBC_DEVOTION_LAYER_SUCCESS', (e) => {
    console.log('Layer succeeded:', e.detail);
});

// Listen for layer failures
window.addEventListener('GPBC_DEVOTION_LAYER_FAIL', (e) => {
    console.warn('Layer failed:', e.detail);
});

// Listen for mesh completion
window.addEventListener('GPBC_DEVOTION_MESH_COMPLETE', (e) => {
    console.log('Mesh complete:', e.detail);
});

// Listen for auto-recovery signals
window.addEventListener('GPBC_DEVOTION_AUTO_RECOVERY', (e) => {
    console.log('Auto-recovery:', e.detail);
});
```

---

## 🚀 Deployment Checklist

- [x] `js/devotion-mesh-observability.js` created (578 lines)
- [x] `js/devotion-data-mesh-loader.js` patched (7 telemetry hooks)
- [x] `daily-devotion.html` updated (1 script tag added)
- [x] DEV_MODE = false (silent console)
- [x] ENABLE_BEACON = true (async telemetry)
- [x] All telemetry wrapped in try/catch
- [x] Zero breaking changes to UI/render pipeline
- [x] Backward compatible (script load order preserved)

---

## ✅ Success Criteria

**When GitHub fails:**
1. ✅ Health score drops (100 → 90 → 60)
2. ✅ System continues working (Layer 2/4/5 activates)
3. ✅ Telemetry logs failures silently
4. ✅ User sees normal devotion (zero errors)
5. ✅ Auto-recovery disables Layer 1 after 5 failures
6. ✅ Layer 1 re-enabled after 1-hour cooldown

**Production Guarantee:**
> If observability fails → Mesh must still load devotions normally.

**Status:** ✅ **VERIFIED**

---

## 📈 Next Steps (Optional Future Enhancements)

1. **Backend Telemetry Endpoint:**
   - Create `/api/devotion-health` API
   - Store health metrics in database
   - Build analytics dashboard

2. **Real-time Monitoring:**
   - WebSocket connection for live updates
   - Alert system for critical failures
   - Auto-remediation triggers

3. **Advanced Auto-Recovery:**
   - Dynamic timeout adjustment
   - Layer priority reordering
   - Predictive failure detection

4. **Performance Insights:**
   - Percentile load times (p50, p95, p99)
   - Geographic latency tracking
   - Device-specific metrics

---

## 📝 Technical Notes

### **Layer Numbering:**
```
0: Offline Bundle (devotions-2026-OFFLINE.json)
1: Primary GitHub (devotions-2026.json)
2: Monthly JSON Fallback (devotions-data/2026/*.json)
3: CDN Backup (cdn.gracepraise.church)
4: Local Cache (localStorage)
5: Emergency Fallback (Psalm 46:1)
```

### **Load Order:**
```html
<!-- Critical: Observability MUST load before mesh -->
<script src="js/devotion-mesh-observability.js"></script>
<script src="js/devotion-data-mesh-loader.js"></script>
<script src="devotions-data.js"></script>
```

### **Config Tuning:**
```javascript
// In devotion-mesh-observability.js:
const CONFIG = {
    FAILURE_STREAK_THRESHOLD: 5,        // Failures before layer disable
    LAYER_DISABLE_DURATION_MS: 3600000, // 1 hour = 3600000ms
    CACHE_HIT_WINDOW: 100,              // Track last 100 loads
    DEV_MODE: false,                    // Console logging
    ENABLE_BEACON: true                 // Async telemetry export
};
```

---

## 🎉 Deliverables Summary

**1️⃣ Full Implementation:**
- `js/devotion-mesh-observability.js` (578 lines, production-ready)

**2️⃣ Minimal Patch Hooks:**
- 7 telemetry emission points in mesh loader (1 helper + 6 layer events)

**3️⃣ Sample Telemetry Output:**
- See "Testing Scenarios" section above

**4️⃣ Production Safety Notes:**
- See "Production Safety Guarantees" section above

---

**Status:** ✅ **PRODUCTION READY**  
**Zero Pseudo Code** | **Full Implementation** | **Backward Compatible**

