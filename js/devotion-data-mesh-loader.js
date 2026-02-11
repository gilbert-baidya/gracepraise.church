/**
 * ============================================================================
 * GPBC DEVOTION DATA MESH LOADER
 * Zero-404 Self-Healing Multi-Layer Fallback System
 * ============================================================================
 * 
 * Production-grade resilient data loader with 5-layer fallback strategy.
 * Ensures devotions ALWAYS load, even under catastrophic network failure.
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
        TIMEOUT_MS: 8000,
        CACHE_KEY_PREFIX: 'gpbc_devotions_',
        CACHE_VERSION_KEY: 'gpbc_devotions_cache_version',
        CACHE_VERSION: '1.0',
        MAX_CACHE_AGE_DAYS: 30,
        CDN_BASE_URL: 'https://cdn.gracepraise.church/devotions',
        GITHUB_BASE_URL: 'https://gilbert-baidya.github.io',
        ENABLE_PREFETCH: true,
        DEBUG_MODE: false
    };

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    const STATE = {
        lastLayerUsed: null,
        lastError: null,
        lastLoadTime: null,
        cacheAge: null,
        dataCount: 0,
        loadHistory: []
    };

    // ========================================================================
    // EMERGENCY FALLBACK DEVOTION
    // ========================================================================

    function getEmergencyDevotion() {
        const today = new Date();
        const dateKey = today.toISOString().split('T')[0];
        
        return [{
            date: dateKey,
            title: "God Is Our Refuge and Strength",
            verse: "Psalm 46:1",
            verseText: "God is our refuge and strength, an ever-present help in trouble.",
            reflection: "Even when technology fails, God never fails. His Word stands eternal and unchanging. In moments when we feel disconnected or uncertain, we can rest in the knowledge that God's presence is constant and His promises are sure. This devotion has loaded from our emergency fallback system, but the truth it contains is as reliable as any other: God is always with you.",
            prayer: "Lord, remind me that You are always present and faithful. When systems fail and circumstances change, You remain the same yesterday, today, and forever. Thank You for being my refuge and strength. Amen.",
            hasReflection: true,
            source: "emergency-fallback",
            emergency: true
        }];
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function log(message, ...args) {
        if (CONFIG.DEBUG_MODE || message.includes('SUCCESS') || message.includes('FAILED')) {
            console.log(`[DevotionMesh] ${message}`, ...args);
        }
    }

    function warn(message, ...args) {
        console.warn(`[DevotionMesh] ${message}`, ...args);
    }

    function error(message, ...args) {
        console.error(`[DevotionMesh] ${message}`, ...args);
    }

    function getCacheKey(year) {
        return CONFIG.CACHE_KEY_PREFIX + year;
    }

    function getCacheAge(timestamp) {
        if (!timestamp) return null;
        const age = Date.now() - timestamp;
        return Math.floor(age / (1000 * 60 * 60 * 24)); // Days
    }

    function emitTelemetryEvent(eventName, detail) {
        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        } catch (e) {
            // Telemetry must never break mesh functionality
        }
    }

    function isValidDevotionArray(data) {
        if (!Array.isArray(data)) return false;
        if (data.length === 0) return false;
        
        // Validate first item has required fields
        const sample = data[0];
        return sample && 
               (sample.date || sample.title || sample.verse || sample.verseText);
    }

    function fetchWithTimeout(url, timeoutMs) {
        return Promise.race([
            fetch(url, { 
                cache: 'no-store',
                headers: {
                    'Accept': 'application/json'
                }
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Fetch timeout')), timeoutMs)
            )
        ]);
    }

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    function saveToCache(year, data) {
        try {
            const cacheKey = getCacheKey(year);
            const cacheData = {
                version: CONFIG.CACHE_VERSION,
                timestamp: Date.now(),
                year: year,
                count: data.length,
                data: data
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            localStorage.setItem(CONFIG.CACHE_VERSION_KEY, CONFIG.CACHE_VERSION);
            
            log(`Cache saved: ${data.length} devotions for year ${year}`);
            return true;
        } catch (e) {
            warn('Cache save failed:', e.message);
            return false;
        }
    }

    function loadFromCache(year) {
        try {
            const cacheKey = getCacheKey(year);
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            
            // Version check
            if (cacheData.version !== CONFIG.CACHE_VERSION) {
                log('Cache version mismatch, invalidating');
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            // Age check
            const age = getCacheAge(cacheData.timestamp);
            if (age > CONFIG.MAX_CACHE_AGE_DAYS) {
                log(`Cache expired: ${age} days old (max: ${CONFIG.MAX_CACHE_AGE_DAYS})`);
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            STATE.cacheAge = age;
            
            if (isValidDevotionArray(cacheData.data)) {
                log(`Cache hit: ${cacheData.count} devotions, ${age} days old`);
                return cacheData.data;
            }
            
            return null;
        } catch (e) {
            warn('Cache load failed:', e.message);
            return null;
        }
    }

    function clearCache(year) {
        try {
            if (year) {
                localStorage.removeItem(getCacheKey(year));
            } else {
                // Clear all devotion caches
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(CONFIG.CACHE_KEY_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            log('Cache cleared');
        } catch (e) {
            warn('Cache clear failed:', e.message);
        }
    }

    // ========================================================================
    // LAYER 1: PRIMARY GITHUB JSON
    // ========================================================================

    async function loadLayer1_PrimaryGitHub(year) {
        const layerName = 'Layer 1: Primary GitHub JSON';
        log(`${layerName} - Attempting...`);
        
        try {
            const url = `${window.location.origin}/devotions-${year}.json`;
            const response = await fetchWithTimeout(url, CONFIG.TIMEOUT_MS);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!isValidDevotionArray(data)) {
                throw new Error('Invalid data format');
            }
            
            log(`${layerName} SUCCESS - ${data.length} devotions loaded`);
            STATE.lastLayerUsed = 1;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_SUCCESS', {
                layer: 1,
                source: 'primary-github',
                loadTime: Date.now() - STATE.lastLoadTime,
                dataCount: data.length
            });
            
            // Save to cache for future failures
            saveToCache(year, data);
            
            return { success: true, data, source: 'primary-github' };
        } catch (e) {
            error(`${layerName} FAILED → ${e.message}`);
            STATE.lastError = e.message;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_FAIL', {
                layer: 1,
                reason: e.message,
                error: e.toString()
            });
            
            return { success: false, error: e.message };
        }
    }

    // ========================================================================
    // LAYER 2: MONTHLY JSON FALLBACK
    // ========================================================================

    async function loadLayer2_MonthlyFallback(year) {
        const layerName = 'Layer 2: Monthly JSON Fallback';
        log(`${layerName} - Attempting...`);
        
        try {
            const months = [
                '01-january', '02-february', '03-march', '04-april', 
                '05-may', '06-june', '07-july', '08-august', 
                '09-september', '10-october', '11-november', '12-december'
            ];
            
            const monthPromises = months.map(async (name) => {
                try {
                    const url = `${window.location.origin}/devotions-data/${year}/${name}.json`;
                    const response = await fetchWithTimeout(url, CONFIG.TIMEOUT_MS / 2);
                    
                    if (!response.ok) return null;
                    
                    return await response.json();
                } catch {
                    return null;
                }
            });
            
            const results = await Promise.allSettled(monthPromises);
            const monthData = results
                .filter(r => r.status === 'fulfilled' && r.value)
                .map(r => r.value)
                .flat();
            
            if (!isValidDevotionArray(monthData)) {
                throw new Error('No valid monthly data found');
            }
            
            log(`${layerName} SUCCESS - ${monthData.length} devotions from ${results.filter(r => r.status === 'fulfilled' && r.value).length} months`);
            STATE.lastLayerUsed = 2;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_SUCCESS', {
                layer: 2,
                source: 'monthly-fallback',
                loadTime: Date.now() - STATE.lastLoadTime,
                dataCount: monthData.length
            });
            
            // Save to cache
            saveToCache(year, monthData);
            
            return { success: true, data: monthData, source: 'monthly-fallback' };
        } catch (e) {
            error(`${layerName} FAILED → ${e.message}`);
            STATE.lastError = e.message;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_FAIL', {
                layer: 2,
                reason: e.message,
                error: e.toString()
            });
            
            return { success: false, error: e.message };
        }
    }

    // ========================================================================
    // LAYER 3: CDN BACKUP
    // ========================================================================

    async function loadLayer3_CDNBackup(year) {
        const layerName = 'Layer 3: CDN Backup';
        log(`${layerName} - Attempting...`);
        
        try {
            const url = `${CONFIG.CDN_BASE_URL}/${year}.json`;
            const response = await fetchWithTimeout(url, CONFIG.TIMEOUT_MS);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!isValidDevotionArray(data)) {
                throw new Error('Invalid data format');
            }
            
            log(`${layerName} SUCCESS - ${data.length} devotions loaded`);
            STATE.lastLayerUsed = 3;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_SUCCESS', {
                layer: 3,
                source: 'cdn-backup',
                loadTime: Date.now() - STATE.lastLoadTime,
                dataCount: data.length
            });
            
            // Save to cache
            saveToCache(year, data);
            
            return { success: true, data, source: 'cdn-backup' };
        } catch (e) {
            error(`${layerName} FAILED → ${e.message}`);
            STATE.lastError = e.message;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_FAIL', {
                layer: 3,
                reason: e.message,
                error: e.toString()
            });
            
            return { success: false, error: e.message };
        }
    }

    // ========================================================================
    // LAYER 4: LOCAL CACHE
    // ========================================================================

    async function loadLayer4_LocalCache(year) {
        const layerName = 'Layer 4: Local Cache';
        log(`${layerName} - Attempting...`);
        
        try {
            const cached = loadFromCache(year);
            
            if (!cached) {
                throw new Error('No cache found');
            }
            
            log(`${layerName} SUCCESS - ${cached.length} devotions from cache`);
            STATE.lastLayerUsed = 4;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_SUCCESS', {
                layer: 4,
                source: 'local-cache',
                loadTime: Date.now() - STATE.lastLoadTime,
                dataCount: cached.length
            });
            
            return { success: true, data: cached, source: 'local-cache' };
        } catch (e) {
            error(`${layerName} FAILED → ${e.message}`);
            STATE.lastError = e.message;
            
            // Emit telemetry
            emitTelemetryEvent('GPBC_DEVOTION_LAYER_FAIL', {
                layer: 4,
                reason: e.message,
                error: e.toString()
            });
            
            return { success: false, error: e.message };
        }
    }

    // ========================================================================
    // LAYER 5: EMERGENCY EMBEDDED DEVOTION
    // ========================================================================

    async function loadLayer5_EmergencyFallback(year) {
        const layerName = 'Layer 5: Emergency Fallback';
        log(`${layerName} - Activating emergency devotion`);
        
        const emergency = getEmergencyDevotion();
        
        log(`${layerName} SUCCESS - Emergency devotion loaded`);
        STATE.lastLayerUsed = 5;
        
        // Emit telemetry
        emitTelemetryEvent('GPBC_DEVOTION_LAYER_SUCCESS', {
            layer: 5,
            source: 'emergency-fallback',
            loadTime: Date.now() - STATE.lastLoadTime,
            dataCount: emergency.length
        });
        
        return { success: true, data: emergency, source: 'emergency-fallback' };
    }

    // ========================================================================
    // MAIN LOADER WITH CASCADE FALLBACK
    // ========================================================================

    async function loadDevotionsWithMesh(year) {
        const startTime = Date.now();
        STATE.lastLoadTime = startTime;
        
        log(`========================================`);
        log(`Starting Data Mesh Load for year ${year}`);
        log(`========================================`);
        
        // Check if offline DB exists (bypass mesh)
        if (window.DEVOTIONS_2026_DB && Array.isArray(window.DEVOTIONS_2026_DB) && year === 2026) {
            log('Offline DB detected - using bundled data');
            STATE.lastLayerUsed = 0;
            STATE.dataCount = window.DEVOTIONS_2026_DB.length;
            return window.DEVOTIONS_2026_DB;
        }
        
        // Try each layer in sequence
        const layers = [
            loadLayer1_PrimaryGitHub,
            loadLayer2_MonthlyFallback,
            loadLayer3_CDNBackup,
            loadLayer4_LocalCache,
            loadLayer5_EmergencyFallback
        ];
        
        for (let i = 0; i < layers.length; i++) {
            const result = await layers[i](year);
            
            if (result.success) {
                const loadTime = Date.now() - startTime;
                STATE.dataCount = result.data.length;
                
                log(`========================================`);
                log(`✅ Data Mesh Load COMPLETE`);
                log(`Layer Used: ${STATE.lastLayerUsed} (${result.source})`);
                log(`Devotions: ${result.data.length}`);
                log(`Load Time: ${loadTime}ms`);
                log(`========================================`);
                
                // Record in history
                STATE.loadHistory.push({
                    timestamp: startTime,
                    year,
                    layer: STATE.lastLayerUsed,
                    source: result.source,
                    count: result.data.length,
                    loadTime
                });
                
                // Keep only last 10 loads
                if (STATE.loadHistory.length > 10) {
                    STATE.loadHistory.shift();
                }
                
                // Emit mesh complete telemetry
                emitTelemetryEvent('GPBC_DEVOTION_MESH_COMPLETE', {
                    layer: STATE.lastLayerUsed,
                    source: result.source,
                    loadTime,
                    dataCount: result.data.length,
                    year
                });
                
                // Prefetch next month if enabled
                if (CONFIG.ENABLE_PREFETCH && STATE.lastLayerUsed <= 2) {
                    prefetchNextMonth(year);
                }
                
                return result.data;
            }
        }
        
        // This should never happen (Layer 5 always succeeds)
        error('CRITICAL: All layers failed including emergency fallback');
        return getEmergencyDevotion();
    }

    // ========================================================================
    // PREFETCH OPTIMIZATION
    // ========================================================================

    function prefetchNextMonth(year) {
        setTimeout(() => {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthName = nextMonth.toLocaleString('en', { month: 'long' }).toLowerCase();
            const nextMonthNum = String(nextMonth.getMonth() + 1).padStart(2, '0');
            
            const url = `${window.location.origin}/devotions-data/${year}/${nextMonthNum}-${nextMonthName}.json`;
            
            fetch(url, { cache: 'force-cache' }).catch(() => {
                // Silent prefetch, don't care if it fails
            });
            
            log(`Prefetching next month: ${nextMonthName}`);
        }, 2000);
    }

    // ========================================================================
    // DEBUG HELPER
    // ========================================================================

    function debugDevotionMesh() {
        const debug = {
            lastLayerUsed: STATE.lastLayerUsed,
            lastLayerName: [
                'Offline Bundle',
                'Primary GitHub',
                'Monthly Fallback',
                'CDN Backup',
                'Local Cache',
                'Emergency Fallback'
            ][STATE.lastLayerUsed] || 'Unknown',
            cacheAge: STATE.cacheAge,
            dataCount: STATE.dataCount,
            lastError: STATE.lastError,
            lastLoadTime: STATE.lastLoadTime ? new Date(STATE.lastLoadTime).toISOString() : null,
            loadHistory: STATE.loadHistory,
            cacheKeys: Object.keys(localStorage).filter(k => k.startsWith(CONFIG.CACHE_KEY_PREFIX)),
            config: CONFIG
        };
        
        console.table(debug);
        return debug;
    }

    // ========================================================================
    // GLOBAL EXPORTS
    // ========================================================================

    window.loadDevotionsWithMesh = loadDevotionsWithMesh;
    window.debugDevotionMesh = debugDevotionMesh;
    window.clearDevotionCache = clearCache;

    // Expose for testing
    if (CONFIG.DEBUG_MODE) {
        window.__devotionMeshState = STATE;
        window.__devotionMeshConfig = CONFIG;
    }

    log('Devotion Data Mesh Loader initialized');

})();
